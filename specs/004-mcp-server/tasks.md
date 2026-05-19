# Tasks: MCP Server

**Input**: Design documents from `specs/004-mcp-server/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/mcp-server.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story this task belongs to (US1–US6)
- Constitution requires end-to-end MCP tool contract tests — tests are included

---

## Phase 1: Setup

**Purpose**: Install new dependencies and extend test scripts

- [x] T001 Install `@modelcontextprotocol/sdk` and `zod` as runtime dependencies via `npm install @modelcontextprotocol/sdk zod`
- [x] T002 Add `"test:mcp": "vitest run tests/mcp"` script to `package.json` (alongside existing test:contract, test:unit, test:integration)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the `createMcpServer` factory and shared test helper that every story builds on

**⚠️ CRITICAL**: No story implementation can begin until this phase is complete

- [x] T003 Create `src/mcp/server.ts` — export `createMcpServer(vault: MemoryVault): McpServer` skeleton: import McpServer from `@modelcontextprotocol/sdk/server/mcp.js`, construct with name `"agent-friday"` and version `"1.0.0"`, return server (no tools registered yet)
- [x] T004 [P] Create `tests/mcp/helpers/openServer.ts` — export `ServerFixture` interface (`{ client: Client, server: McpServer, vault: SqliteVault, tmpDir: string }`), `openServer(): Promise<ServerFixture>` using `InMemoryTransport.createLinkedPair()` from `@modelcontextprotocol/sdk/inMemory.js` + `openVault()` from `tests/integration/helpers/openVault.js`, and `closeServer(f: ServerFixture): Promise<void>`

**Checkpoint**: `createMcpServer` factory compiles; test helper connects client and server in-process

---

## Phase 3: User Story 5 — Daemon Starts and Shuts Down Cleanly (Priority: P1)

**Goal**: Real MCP daemon replaces the `start.ts` stub; daemon loads key+vault, connects over stdio, and shuts down cleanly

**Independent Test**: Connect a test client, verify the server responds to `listTools`, send close signal, confirm vault closes without error

### Tests for User Story 5

- [x] T005 [US5] Create `tests/mcp/server.test.ts` — add `describe('daemon lifecycle')` block using `openServer`/`closeServer`: (1) server connects and client can call `listTools` without error; (2) `closeServer` resolves without throwing (vault closes cleanly)

### Implementation for User Story 5

- [x] T006 [US5] Replace stub body of `src/cli/start.ts` `loadKeyOrAbort()` (keep the function) and implement the real `runStart()` body: open vault via `SqliteVault.open()`, call `createMcpServer(vault)`, create `StdioServerTransport` from `@modelcontextprotocol/sdk/server/stdio.js`, register `SIGINT`/`SIGTERM` handlers that call `vault.close()` then `process.exit(0)`, call `await server.connect(transport)`

**Checkpoint**: `npm run test:mcp` passes lifecycle tests; `npx agent-friday start` launches and blocks on stdio

---

## Phase 4: User Story 1 — Store a Memory (Priority: P1)

**Goal**: `memory_append` tool accepts content, encrypts and stores it, returns an entry id

**Independent Test**: Connect test client, call `memory_append` with content, verify non-empty id returned, verify vault has one entry

### Tests for User Story 1

- [x] T007 [US1] Add `describe('memory_append')` block to `tests/mcp/server.test.ts`: (1) valid content returns `{ id }` as non-empty string; (2) empty content returns isError response with server still running after the error

### Implementation for User Story 1

- [x] T008 [US1] Add `memory_append` tool to `createMcpServer` in `src/mcp/server.ts`: register with `server.tool('memory_append', { content: z.string().min(1) }, async ({ content }) => { ... })`, call `vault.append(content as EntryId extends string ... )`, return `{ content: [{ type: 'text', text: JSON.stringify({ id }) }] }` — import `z` from `zod`

**Checkpoint**: `npm run test:mcp` passes; calling `memory_append` via MCP inspector returns a UUID

---

## Phase 5: User Story 2 — Retrieve Relevant Memories (Priority: P1)

**Goal**: `memory_query` returns decrypted entries matching a context string; redacted entries never appear

**Independent Test**: Append several entries, call `memory_query`, verify decrypted content returned; append+redact, query again, verify redacted entry absent

### Tests for User Story 2

- [x] T009 [US2] Add `describe('memory_query')` block to `tests/mcp/server.test.ts`: (1) after appending an entry, query returns non-empty entries array with correct fields (`id`, `content`, `createdAt`, `action`); (2) empty vault returns `{ entries: [] }` without error; (3) `limit` parameter caps result count

### Implementation for User Story 2

- [x] T010 [US2] Add `memory_query` tool to `createMcpServer` in `src/mcp/server.ts`: register with `server.tool('memory_query', { context: z.string().min(1), limit: z.number().int().min(1).optional() }, async ({ context, limit }) => { ... })`, call `vault.query(context, { limit })`, return `{ content: [{ type: 'text', text: JSON.stringify({ entries }) }] }`

**Checkpoint**: `npm run test:mcp` passes; P1 user stories (US1, US2, US5) fully functional

---

## Phase 6: User Story 3 — Replace an Outdated Memory (Priority: P2)

**Goal**: `memory_amend` appends an amended entry linked to the original; original excluded from future queries

**Independent Test**: Append entry, call `memory_amend`, verify new id returned, verify original no longer in query results

### Tests for User Story 3

- [x] T011 [US3] Add `describe('memory_amend')` block to `tests/mcp/server.test.ts`: (1) valid id + content returns new `{ id }` different from original; (2) amended entry appears in query results, original does not; (3) unknown id returns isError response, server still running

### Implementation for User Story 3

- [x] T012 [US3] Add `memory_amend` tool to `createMcpServer` in `src/mcp/server.ts`: register with `server.tool('memory_amend', { id: z.string(), content: z.string().min(1) }, async ({ id, content }) => { ... })`, cast `id` to `EntryId`, call `vault.amend(id, content)`, return `{ content: [{ type: 'text', text: JSON.stringify({ id: newId }) }] }`

**Checkpoint**: `npm run test:mcp` passes; amend flow works end-to-end

---

## Phase 7: User Story 4 — Forget a Memory (Priority: P2)

**Goal**: `memory_redact` appends a redaction record; original excluded from all future queries

**Independent Test**: Append entry, call `memory_redact`, verify new id returned, verify entry absent from all subsequent query results

### Tests for User Story 4

- [x] T013 [US4] Add `describe('memory_redact')` block to `tests/mcp/server.test.ts`: (1) valid id returns new `{ id }` (redaction record); (2) redacted entry does not appear in subsequent `memory_query` results; (3) optional reason accepted without error; (4) unknown id returns isError response, server still running

### Implementation for User Story 4

- [x] T014 [US4] Add `memory_redact` tool to `createMcpServer` in `src/mcp/server.ts`: register with `server.tool('memory_redact', { id: z.string(), reason: z.string().optional() }, async ({ id, reason }) => { ... })`, cast `id` to `EntryId`, call `vault.redact(id, reason)`, return `{ content: [{ type: 'text', text: JSON.stringify({ id: redactId }) }] }`

**Checkpoint**: `npm run test:mcp` passes; all four tools functional

---

## Phase 8: User Story 6 — Daemon Exposes Tool Metadata (Priority: P2)

**Goal**: A connecting client receives the tool list with all four tools, their descriptions, and valid input schemas

**Independent Test**: Connect client, call `listTools`, verify response contains all four tools with name, description, and inputSchema

### Tests for User Story 6

- [x] T015 [US6] Add `describe('tool metadata')` block to `tests/mcp/server.test.ts`: call `client.listTools()`, assert response contains exactly four tools named `memory_append`, `memory_query`, `memory_amend`, `memory_redact`; each has a non-empty `description` and an `inputSchema` with at least one required property

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end sequence test, typecheck, and final validation

- [x] T016 Add `describe('full sequence')` block to `tests/mcp/server.test.ts`: append entry → query (entry present) → amend (old absent, new present) → redact → query (entry absent); verify daemon remains running throughout
- [x] T017 [P] Run `npm run typecheck` — fix any TypeScript errors in `src/mcp/server.ts`, `src/cli/start.ts`, and `tests/mcp/`
- [x] T018 [P] Run `npm test` — all suites pass (contract, unit, integration, mcp)
- [x] T019 Run quickstart.md validation: `npx agent-friday init` (if not already done) then `npx agent-friday start` launches without error; verify MCP Inspector can connect and call all four tools

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Requires Phase 1 complete — blocks all story phases
- **US5 (Phase 3)**: Requires Phase 2 — implements daemon shell without tools
- **US1 (Phase 4)**: Requires Phase 2 — adds first tool to shell from Phase 3
- **US2 (Phase 5)**: Requires Phase 4 complete — query tests need append to populate vault
- **US3 (Phase 6)**: Requires Phase 5 complete — amend tests use query to verify exclusion
- **US4 (Phase 7)**: Requires Phase 6 complete — redact tests use query to verify exclusion
- **US6 (Phase 8)**: Requires Phase 7 — validates all four tools are present
- **Polish (Phase 9)**: Requires all story phases complete

### User Story Dependencies

- **US5**: First story — daemon infrastructure, no tool dependencies
- **US1**: Depends on US5 (server.ts exists) — adds memory_append
- **US2**: Depends on US1 — query tests need append to seed vault data
- **US3**: Depends on US2 — amend tests verify with query
- **US4**: Depends on US2 — redact tests verify with query
- **US6**: Depends on US1–US4 — validates all four tools present

### Within Each User Story

- Test task first (write test, confirm it fails before implementation)
- Implementation task second (make the test pass)
- Each story builds on `src/mcp/server.ts` — only one story at a time in that file

### Parallel Opportunities

- T003 and T004 (Foundational) can run in parallel (different files)
- T017 and T018 (Polish) can run in parallel (different concerns)
- US3 (amend) and US4 (redact) are logically independent and could be worked in parallel by different developers, but both touch `src/mcp/server.ts` so coordinate on that file

---

## Parallel Example: Phase 2 (Foundational)

```
# Both tasks target different files — run together:
Task T003: Create src/mcp/server.ts (factory skeleton)
Task T004: Create tests/mcp/helpers/openServer.ts (test helper)
```

---

## Implementation Strategy

### MVP (US5 + US1 + US2 only — P1 stories)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T004)
3. Complete Phase 3: US5 daemon lifecycle (T005–T006)
4. Complete Phase 4: US1 memory_append (T007–T008)
5. Complete Phase 5: US2 memory_query (T009–T010)
6. **STOP and VALIDATE**: `npm run test:mcp` passes; daemon starts, stores, retrieves

### Full Delivery

Continue from MVP:

7. Phase 6: US3 memory_amend (T011–T012)
8. Phase 7: US4 memory_redact (T013–T014)
9. Phase 8: US6 tool metadata (T015)
10. Phase 9: Polish (T016–T019)
