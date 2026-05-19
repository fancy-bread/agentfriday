# Contract: McpServer Factory

**Phase**: 1 | **Feature**: 004-mcp-server | **Date**: 2026-05-18

## Module: `src/mcp/server.ts`

### Purpose

Creates and configures a `McpServer` instance with all four tool handlers wired to
a given `MemoryVault`. Does not connect to a transport — that is the responsibility
of the caller (`start.ts`).

### Signature

```typescript
import type { MemoryVault } from '../vault/MemoryVault.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function createMcpServer(vault: MemoryVault): McpServer
```

### Preconditions

- `vault` is a live, open `MemoryVault` instance — `SqliteVault.open()` has already
  returned successfully.
- Key is already loaded (done before vault is opened in `start.ts`).

### Registered Tools

All four tools MUST be registered on the returned server:

| Tool name | Required input fields | Optional input fields | Success response fields |
|-----------|----------------------|----------------------|------------------------|
| `memory_append` | `content: string` | — | `{ id: string }` |
| `memory_query` | `context: string` | `limit: number` (default 10) | `{ entries: [...] }` |
| `memory_amend` | `id: string`, `content: string` | — | `{ id: string }` |
| `memory_redact` | `id: string` | `reason: string` | `{ id: string }` |

Descriptions MUST match the TDD (`specs/000-agent-friday-core/tdd.md`):

- `memory_append`: "Store an encrypted memory entry in the vault."
- `memory_query`: "Retrieve memory entries semantically relevant to a context string."
- `memory_amend`: "Replace an existing memory entry. The old entry remains in the ledger."
- `memory_redact`: "Mark a memory entry as forgotten. Excluded from all future queries."

### Error Contract

Every handler MUST:
- Validate its required input fields; throw on missing or empty values
- Propagate errors from `MemoryVault` methods without wrapping or swallowing them
- Never crash the server process — `McpServer` catches thrown errors and returns
  structured MCP error responses

### Test Contract

`tests/mcp/server.test.ts` MUST verify, using `InMemoryTransport`:

1. Tool list response contains all four tools with correct names
2. `memory_append` with valid content → returns `{ id }` (non-empty string)
3. `memory_query` with valid context → returns `{ entries }` array
4. `memory_amend` with valid id + content → returns new `{ id }`
5. `memory_redact` with valid id → returns new `{ id }`
6. Full sequence: append → query (entry present) → amend → query (amended)
   → redact → query (absent)
7. `memory_append` with empty content → isError response, server still running
8. `memory_amend` with unknown id → isError response, server still running
9. `memory_redact` with unknown id → isError response, server still running
10. `memory_query` on empty vault → `{ entries: [] }`, no error

---

## Module: `src/cli/start.ts` (updated)

### Purpose

Loads the key, opens the vault, starts the MCP daemon over stdio, registers shutdown
handlers, and blocks until the client disconnects or a signal is received.

### Behaviour

```
loadKeyOrAbort()           → throws { code: 'KEY_NOT_FOUND' } if missing; exits non-zero
SqliteVault.open(...)      → opens DB; exits non-zero on failure
createMcpServer(vault)     → configures tool handlers
StdioServerTransport        → wires stdio
server.connect(transport)  → blocks while client is connected
SIGINT / SIGTERM           → vault.close(); process.exit(0)
stdin EOF (client gone)    → SDK closes transport; shutdown handler cleans up
```

### Exit Codes

| Code | Condition |
|------|-----------|
| 0 | Normal shutdown (client disconnect, SIGINT, SIGTERM) |
| 1 | Key not found or vault open failure |
