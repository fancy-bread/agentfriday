# Implementation Plan: MCP Server

**Branch**: `004-mcp-server` | **Date**: 2026-05-18 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/004-mcp-server/spec.md`

## Summary

Wire the four `MemoryVault` operations (`append`, `query`, `amend`, `redact`) behind
MCP tool handlers served over stdio, replacing the `start` command stub from
`002-key-custody` with a real daemon. The MCP SDK's `McpServer` + `StdioServerTransport`
provides the protocol layer; all vault I/O routes through the existing `SqliteVault`
implementation without modification.

## Technical Context

**Language/Version**: TypeScript 6.x / Node.js 24 LTS  
**Primary Dependencies**: `@modelcontextprotocol/sdk` (McpServer, StdioServerTransport,
InMemoryTransport), `zod` (tool input schema validation via McpServer API),
`@signalapp/better-sqlite3` (existing), `libsodium-wrappers` (existing),
`commander` (existing)  
**Storage**: SQLCipher via `SqliteVault` (003-sqlite-vault — no changes)  
**Testing**: Vitest with `InMemoryTransport` (in-process client/server pair,
no child-process setup needed)  
**Target Platform**: macOS / Linux, local stdio transport  
**Project Type**: CLI daemon / MCP server  
**Performance Goals**: Ready to serve tool calls within 2 seconds of launch  
**Constraints**: Single client over stdio; vault writes serialised; no multi-client
concurrency for v1  
**Scale/Scope**: Single local process, single user, single vault session

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Principle I — Append-Only Ledger**: MCP tool handlers route to `MemoryVault`
  methods only. No direct DB access. No DELETE or UPDATE added. `amend` and `redact`
  handlers produce new vault entries, not mutations. ✅ PASS
- [x] **Principle II — Encrypt Before Write**: All writes go through `SqliteVault.append()`
  which encrypts before persisting. The MCP server layer never touches plaintext at the
  storage boundary. ✅ PASS
- [x] **Principle III — Keys Never Leave the Device**: Key is loaded via
  `loadKeyOrAbort()` at startup, used only in-process. No key material appears in
  any tool response, log line, or error message. ✅ PASS
- [x] **Principle IV — Interface Over Implementation**: The MCP server depends on
  `MemoryVault` (the interface), not `SqliteVault` (the implementation). No vault
  internals leak through the tool contract. ✅ PASS
- [x] **Principle V — Spec Before Code**: `specs/004-mcp-server/spec.md` exists and
  passed quality validation. ✅ PASS

**Post-Design Re-check**: See research.md and contracts/ — no violations introduced
by the design phase.

## Project Structure

### Documentation (this feature)

```text
specs/004-mcp-server/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── mcp-server.md
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
src/
├── mcp/
│   └── server.ts            ← McpServer factory: registers all four tools
├── cli/
│   ├── start.ts             ← Replaced: real MCP daemon launch (was stub)
│   └── index.ts             ← Existing CLI entry point (unchanged)
├── vault/                   ← Existing (unchanged)
├── keys/                    ← Existing (unchanged)
└── db/                      ← Existing (unchanged)

tests/
├── mcp/
│   └── server.test.ts       ← End-to-end tool call tests via InMemoryTransport
└── ...                      ← Existing test suites (unchanged)
```

**Structure Decision**: Single-module addition under `src/mcp/`. The server factory
is a standalone module that takes a `MemoryVault` and returns a configured `McpServer`.
The `start.ts` CLI command is updated in-place — it is the only caller of the factory.
No new top-level directories needed.
