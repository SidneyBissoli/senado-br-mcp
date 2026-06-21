# Changelog

All notable changes to the Senado MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2026-06-21

### Added
- **MCP resources**: `senado://tipos-materia` (legislative matter types) and `senado://ufs` (the 27 federation units with region).
- **MCP prompts**: `panorama_senador` (overview of a senator) and `acompanhar_materia` (track a bill's status and history).


## [1.1.6] - 2026-06-21

Supply-chain hardening release (no functional changes).

### Changed
- **Externalized all runtime dependencies in the esbuild bundle**
  (`--packages=external`, was only `--external:pino`). Previously `express`,
  `cheerio`, `node-cache`, `zod`, and the MCP SDK were inlined into the
  published `dist/index.js`, so supply-chain scanners attributed their
  capabilities (HTTP server, HTML parsing, etc.) to this package. They are
  already declared in `dependencies`, so externalizing keeps the published
  artifact auditable and resolves them at runtime instead.
- **Pinned `@modelcontextprotocol/sdk` to `^1.29.0`** (was `^1.0.0`).
- **Synced the server version reported over MCP** (`src/index.ts`,
  `src/server.ts`) with `package.json` — it had drifted at `1.0.0`.

### Security
- **Published with npm provenance attestation** via a new GitHub Actions
  release workflow (OIDC / SLSA). Earlier releases were published manually and
  carried no attestation; cutting releases through CI adds provenance, which
  Socket.dev and npm surface as a supply-chain trust signal.
