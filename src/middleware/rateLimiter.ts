import { logger } from '../utils/logger.js';

// Configuration
const MONTHLY_LIMIT = parseInt(process.env.MONTHLY_REQUEST_LIMIT || '10000');
const ALERT_THRESHOLDS = [50, 80, 100]; // Percentage thresholds for alerts
const WEBHOOK_URL = process.env.ALERT_WEBHOOK_URL || '';

// In-memory counter (resets on restart - for production use Redis or similar)
interface UsageData {
  count: number;
  month: string;
  alertsSent: number[];
}

let usageData: UsageData = {
  count: 0,
  month: getCurrentMonth(),
  alertsSent: []
};

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getResetDate(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString().split('T')[0];
}

async function sendAlert(percentage: number): Promise<void> {
  const message = `⚠️ senado-br-mcp: ${percentage}% do limite mensal atingido (${usageData.count}/${MONTHLY_LIMIT} requisições)`;

  logger.warn({ percentage, count: usageData.count, limit: MONTHLY_LIMIT }, message);

  if (WEBHOOK_URL) {
    try {
      await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message,
          usage: {
            current: usageData.count,
            limit: MONTHLY_LIMIT,
            percentage,
            month: usageData.month,
            resetDate: getResetDate()
          }
        })
      });
    } catch (error) {
      logger.error({ error }, 'Failed to send webhook alert');
    }
  }
}

export interface RateLimitStatus {
  exceeded: boolean;
  current: number;
  limit: number;
  percentage: number;
  month: string;
  resetDate: string;
  message?: string;
  alternatives?: {
    npm: string;
    docs: string;
    sponsor: string;
  };
}

export async function checkMonthlyLimit(): Promise<RateLimitStatus> {
  // Check if month changed - reset counter
  const currentMonth = getCurrentMonth();
  if (usageData.month !== currentMonth) {
    logger.info({ oldMonth: usageData.month, newMonth: currentMonth }, 'Monthly reset');
    usageData = {
      count: 0,
      month: currentMonth,
      alertsSent: []
    };
  }

  const percentage = Math.round((usageData.count / MONTHLY_LIMIT) * 100);
  const exceeded = usageData.count >= MONTHLY_LIMIT;

  // Check and send alerts
  for (const threshold of ALERT_THRESHOLDS) {
    if (percentage >= threshold && !usageData.alertsSent.includes(threshold)) {
      usageData.alertsSent.push(threshold);
      await sendAlert(threshold);
    }
  }

  const status: RateLimitStatus = {
    exceeded,
    current: usageData.count,
    limit: MONTHLY_LIMIT,
    percentage,
    month: usageData.month,
    resetDate: getResetDate()
  };

  if (exceeded) {
    status.message = `O servidor atingiu o limite mensal de requisições gratuitas. Voltará a funcionar em ${getResetDate()}. Para uso imediato, instale localmente via npm.`;
    status.alternatives = {
      npm: 'npx senado-br-mcp',
      docs: 'https://github.com/SidneyBissoli/senado-br-mcp#installation',
      sponsor: 'https://github.com/sponsors/SidneyBissoli'
    };
  }

  return status;
}

export async function incrementCounter(): Promise<void> {
  usageData.count++;
  logger.debug({ count: usageData.count }, 'Request counter incremented');
}

export function getUsageStats(): RateLimitStatus {
  const percentage = Math.round((usageData.count / MONTHLY_LIMIT) * 100);
  return {
    exceeded: usageData.count >= MONTHLY_LIMIT,
    current: usageData.count,
    limit: MONTHLY_LIMIT,
    percentage,
    month: usageData.month,
    resetDate: getResetDate()
  };
}
