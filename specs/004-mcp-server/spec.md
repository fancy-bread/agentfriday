# Feature Specification: MCP Server

**Feature Branch**: `004-mcp-server`
**Created**: 2026-05-18
**Status**: Draft

## User Scenarios & Testing

### User Story 1 — Store a Memory from an Agent Session (Priority: P1)

A user is working in Claude Code or Cursor. Their AI tool calls `memory_append` with
content from the current session. The daemon receives the call, encrypts the content,
stores it in the vault, and returns a confirmation. The user's memory is now
persisted for future sessions.

**Why this priority**: The write path is the core value. Without it, the service
stores nothing.

**Independent Test**: Connect a test MCP client to the running daemon over stdio.
Call `memory_append` with a content string. Confirm a valid identifier is returned.
Confirm the vault contains one entry. Confirm the daemon remains running after the call.

**Acceptance Scenarios**:

1. **Given** a running daemon with an initialised vault, **When** a client calls
   `memory_append` with non-empty content, **Then** the daemon returns a response
   containing a unique entry identifier.
2. **Given** a `memory_append` call, **When** the vault write completes, **Then**
   the daemon remains running and ready to serve the next call.
3. **Given** a `memory_append` call with empty content, **When** the daemon processes
   it, **Then** the daemon returns a structured error response and does not crash.

---

### User Story 2 — Retrieve Relevant Memories in an Agent Session (Priority: P1)

An AI tool calls `memory_query` with context from the current conversation. The
daemon queries the vault and returns the most relevant decrypted entries. The AI
tool uses these to inform its responses without the user re-explaining context.

**Why this priority**: Retrieval is the primary value delivered to users. Without
useful recall, stored memories have no effect on agent behaviour.

**Independent Test**: Append several entries via the daemon. Call `memory_query`
with a context string. Confirm decrypted content is returned. Confirm redacted
entries never appear in results.

**Acceptance Scenarios**:

1. **Given** entries in the vault, **When** a client calls `memory_query` with a
   context string, **Then** the daemon returns a list of decrypted entry objects.
2. **Given** a redacted entry, **When** `memory_query` is called, **Then** the
   redacted entry does not appear in results regardless of context.
3. **Given** an empty vault, **When** `memory_query` is called, **Then** the daemon
   returns an empty list without error.
4. **Given** an optional `limit` parameter, **When** `memory_query` is called,
   **Then** the result set is bounded to that limit.

---

### User Story 3 — Replace an Outdated Memory (Priority: P2)

An AI tool calls `memory_amend` with an entry identifier and replacement content.
The daemon appends an amended entry linked to the original and returns a new
identifier. The original is preserved in the ledger but no longer appears in
query results.

**Why this priority**: Memories become stale. Without amendment, agents accumulate
incorrect context.

**Independent Test**: Append an entry, then call `memory_amend` with its identifier.
Confirm a new identifier is returned. Confirm the original no longer appears in
query results. Confirm both entries exist in the vault.

**Acceptance Scenarios**:

1. **Given** an existing entry, **When** `memory_amend` is called with its identifier
   and new content, **Then** a new identifier is returned and the original is
   excluded from future queries.
2. **Given** an unknown identifier, **When** `memory_amend` is called, **Then** the
   daemon returns a structured error and writes no entry.

---

### User Story 4 — Forget a Memory (Priority: P2)

An AI tool calls `memory_redact` with an entry identifier. The daemon appends a
redaction record and returns a new identifier. The original entry is excluded from
all future query results. The ledger chain remains intact.

**Why this priority**: Users must be able to remove sensitive memories. The right to
be forgotten is a core product promise.

**Independent Test**: Append an entry, then call `memory_redact` with its identifier.
Confirm a new identifier is returned. Confirm the entry never appears in subsequent
`memory_query` results.

**Acceptance Scenarios**:

1. **Given** an existing entry, **When** `memory_redact` is called, **Then** a new
   identifier is returned and the entry is absent from all future query results.
2. **Given** an unknown identifier, **When** `memory_redact` is called, **Then** the
   daemon returns a structured error and writes no record.
3. **Given** an optional reason string, **When** `memory_redact` is called, **Then**
   the reason is accepted without error.

---

### User Story 5 — Daemon Starts and Shuts Down Cleanly (Priority: P1)

The daemon starts over stdio, loads the key and vault, and signals readiness to the
connecting client. When the client disconnects or sends a shutdown signal, the daemon
closes the vault cleanly and exits without data corruption.

**Why this priority**: A daemon that crashes on start or corrupts the vault on
shutdown cannot be trusted. Clean lifecycle is a prerequisite for reliable operation.

**Independent Test**: Start the daemon. Confirm it accepts and responds to a tool
call. Send a disconnect signal. Confirm the daemon exits with code 0 and the vault
database is not corrupt.

**Acceptance Scenarios**:

1. **Given** a valid initialised vault, **When** the daemon starts, **Then** it is
   ready to serve MCP tool calls within 2 seconds.
2. **Given** a running daemon, **When** the client disconnects, **Then** the daemon
   closes the vault and exits cleanly with code 0.
3. **Given** no initialised vault (init not run), **When** the daemon starts, **Then**
   it exits with a non-zero code and a human-readable error — it does not start in
   a broken state.

---

### User Story 6 — Daemon Exposes Tool Metadata to Clients (Priority: P2)

When a client connects and requests the tool list, the daemon returns descriptive
metadata for all four tools — name, description, and input schema. Clients use this
to understand what the daemon can do without prior configuration.

**Why this priority**: MCP clients discover capabilities dynamically. Without
accurate metadata, clients cannot route calls correctly.

**Independent Test**: Connect a client and request the tool list. Confirm all four
tools are present with names, descriptions, and valid input schemas.

**Acceptance Scenarios**:

1. **Given** a connected client, **When** it requests the tool list, **Then** the
   daemon returns metadata for all four tools: `memory_append`, `memory_query`,
   `memory_amend`, `memory_redact`.
2. **Given** the tool list response, **When** a client inspects it, **Then** each
   tool has a name, a human-readable description, and a valid input schema.

---

### Edge Cases

- What if the vault database file becomes inaccessible while the daemon is running?
  The daemon must return a structured error to the caller; it must not crash.
- What if the key becomes unavailable mid-session? Same — structured error, no crash.
- What if a client sends a malformed tool call (wrong argument types, missing
  required fields)? The daemon must return a validation error without crashing.
- What if two tool calls arrive concurrently? The daemon must serialise vault writes;
  no data corruption.

## Requirements

### Functional Requirements

- **FR-001**: The daemon MUST expose four MCP tools: `memory_append`, `memory_query`,
  `memory_amend`, `memory_redact`.
- **FR-002**: Each tool MUST validate its required input parameters and return a
  structured error for invalid or missing inputs without crashing.
- **FR-003**: The daemon MUST load the key and open the vault before accepting any
  tool calls; if either fails, it MUST exit with a non-zero code and a
  human-readable message.
- **FR-004**: The daemon MUST close the vault cleanly on shutdown to prevent data
  corruption.
- **FR-005**: The daemon MUST return a structured error response (not crash) when a
  vault operation fails during a live session.
- **FR-006**: `memory_append` MUST accept a `content` string and return an `id`.
- **FR-007**: `memory_query` MUST accept a `context` string and an optional `limit`
  integer; return a list of decrypted entry objects.
- **FR-008**: `memory_amend` MUST accept an `id` string and a `content` string;
  return a new `id`.
- **FR-009**: `memory_redact` MUST accept an `id` string and an optional `reason`
  string; return a new `id`.
- **FR-010**: The daemon MUST expose tool metadata (name, description, input schema)
  to connecting clients via the MCP tool list.
- **FR-011**: The daemon transport MUST be stdio, consistent with the local MCP
  server convention.

### Key Entities

- **MCP Daemon**: The running process that accepts connections over stdio and routes
  tool calls to the vault.
- **Tool Call**: A structured request from a client naming a tool and providing
  arguments. Produces a structured response.
- **Tool Response**: The structured result of a tool call — either a success payload
  or a structured error. Never a crash.
- **Vault Session**: The daemon's open connection to the encrypted vault database,
  held for the duration of the process lifetime.

## Success Criteria

- **SC-001**: All four tool calls complete successfully in a running daemon —
  confirmed by an end-to-end test covering the full sequence: append → query →
  amend → redact.
- **SC-002**: The daemon starts and is ready to serve tool calls within 2 seconds of
  launch on a standard developer machine.
- **SC-003**: The daemon exits cleanly (code 0, vault not corrupt) in 100% of
  normal shutdown scenarios.
- **SC-004**: Invalid tool inputs produce a structured error response in 100% of
  test scenarios — the daemon never crashes on malformed input.
- **SC-005**: A client connecting for the first time receives the tool list with all
  four tools and valid schemas in 100% of cases.

## Assumptions

- The `MemoryVault` interface and `SqliteVault` implementation are stable (from
  `001-vault-interface` and `003-sqlite-vault`). The MCP server wires to them
  without modification.
- The `KeyManager` and `start` command loading logic are from `002-key-custody`.
  This spec does not redefine key loading — it calls `loadKeyOrAbort()`.
- The `start` CLI command stub from `002-key-custody` is replaced here with a real
  implementation that launches the MCP server.
- MCP tool input schemas match those defined in the TDD
  (`specs/000-agent-friday-core/tdd.md`).
- The daemon serves one client connection at a time over stdio. Multi-client
  concurrency is out of scope for v1.
- The skill files (`006-skill-files`) that invoke these tools are specified
  separately. This spec covers the server side only.
