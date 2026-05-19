# Research: MCP Server

**Phase**: 0 | **Feature**: 004-mcp-server | **Date**: 2026-05-18

## Decision 1: MCP SDK API Level — McpServer vs Server

**Decision**: Use `McpServer` (high-level) from `@modelcontextprotocol/sdk/server/mcp.js`.

**Rationale**: `McpServer` provides a `tool(name, zodSchema, handler)` registration
API that handles input parsing, schema advertisement, and response formatting
automatically. The lower-level `Server` class requires manual `setRequestHandler`
wiring for `tools/list` and `tools/call` — more boilerplate for no architectural
benefit.

**Alternatives considered**:
- Low-level `Server` class: rejected — requires manual tool list construction and
  call dispatch. More code, same outcome.

**Dependency added**: `zod` — required by `McpServer.tool()` for schema validation.
`zod` is already a transitive dependency of many MCP SDK consumers; adding it
explicitly is correct.

---

## Decision 2: Testing Strategy — InMemoryTransport

**Decision**: Use `InMemoryTransport.createLinkedPair()` from
`@modelcontextprotocol/sdk/inMemory.js` for server tests.

**Rationale**: InMemoryTransport provides a linked client/server transport pair that
runs in-process. No child-process spawning, no stdio redirection, no port binding.
The test spins up a real `McpServer` and a real `Client` in the same Vitest process,
making tests fast, deterministic, and debuggable.

Test setup pattern:
```typescript
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
const server = createMcpServer(vault);
await server.connect(serverTransport);
const client = new Client({ name: 'test', version: '1.0.0' });
await client.connect(clientTransport);
// ... call tools ...
await server.close();
```

**Alternatives considered**:
- Spawn daemon as child process: rejected — slow, fragile, requires real key and
  vault on disk, makes test isolation hard.
- Mock the MCP transport: rejected — defeats the purpose of end-to-end contract
  testing (constitution requires end-to-end tests).

---

## Decision 3: Error Handling — Throw Inside Handler

**Decision**: Tool handlers throw standard `Error` instances on validation or
vault failures; `McpServer` catches them and returns structured MCP error responses.

**Rationale**: `McpServer` wraps handlers in a try/catch and serialises thrown
errors into `{ isError: true, content: [{ type: "text", text: message }] }` responses.
This satisfies FR-002 (structured error without crash) and SC-004 without any
custom error formatting in the handlers.

**Edge cases covered**:
- Empty `content` in `memory_append` → handler validates and throws before vault call
- Unknown `id` in `memory_amend` / `memory_redact` → `SqliteVault` throws, handler
  propagates, SDK serialises
- Vault I/O failure mid-session → same propagation path

---

## Decision 4: Shutdown — Signal Handlers + vault.close()

**Decision**: Register `SIGINT` and `SIGTERM` handlers in `start.ts` that call
`vault.close()` and exit with code 0.

**Rationale**: `StdioServerTransport` closes when stdin EOF is received (client
disconnect). The daemon must also handle OS signals. Both paths converge on
`vault.close()` to satisfy FR-004 and SC-003.

```typescript
const shutdown = () => { vault.close(); process.exit(0); };
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
await server.connect(transport);  // blocks on stdio
```

**Note**: `loadKeyOrAbort()` from `002-key-custody` already exits with non-zero code
and a human-readable message if the key is missing (FR-003). No additional handling
needed in `start.ts` for that case.

---

## Decision 5: New Dependencies

| Package | Role | Already installed |
|---------|------|-------------------|
| `@modelcontextprotocol/sdk` | MCP server, transports, client (tests) | No |
| `zod` | Tool input schema validation (McpServer API) | No |

Both are added to `dependencies` (not devDependencies) since the MCP SDK is used
at runtime by the daemon.
