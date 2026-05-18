---
description: "Task list for SqliteVault implementation"
---

# Tasks: SqliteVault

**Input**: Design documents from `specs/003-sqlite-vault/`
**Branch**: `003-sqlite-vault`
**Date**: 2026-05-18

---

## Phase 1: Setup

**Purpose**: Install new dependencies and extend the project structure.

- [x] T001 Install `@signalapp/better-sqlite3 sqlite-vec` via npm in repository root
- [x] T002 [P] Create directories `src/db/` and `tests/integration/` in repository root
- [x] T003 [P] Add `"test:integration": "vitest run tests/integration"` to `scripts` in `package.json`

**Checkpoint**: `npm install` succeeds; `npx tsc --noEmit` still clean.

---

## Phase 2: Foundational

**Purpose**: Shared database infrastructure required by all user stories.
**⚠️ CRITICAL**: All user story work depends on this phase.

- [x] T004 Create `src/db/schema.ts` — define SQL strings for: `CREATE TABLE entries`, `CREATE INDEX` (two indexes), `CREATE VIRTUAL TABLE entry_vectors`, `CREATE TABLE schema_version`; export `MIGRATIONS: string[][]` array (version 0→1 creates all tables); export `SCHEMA_VERSION = 1`
- [x] T005 Create `src/db/queries.ts` — export SQL query string constants: `INSERT_ENTRY`, `GET_ENTRY_BY_ID`, `GET_LAST_N_ENTRIES` (for chain check), `ACTIVE_ENTRIES_CTE` (the superseded-filter CTE), `INSERT_VECTOR`, `GET_SCHEMA_VERSION`, `SET_SCHEMA_VERSION`
- [x] T006 Create `src/vault/SqliteVault.ts` — class implementing `MemoryVault`: private constructor accepting a `better-sqlite3` Database instance and options; static `open()` stub that throws 'not implemented'; `close()` closing the DB connection; four unimplemented `MemoryVault` method stubs; export `SqliteVaultOptions` and `Embedder` types from `contracts/SqliteVault.ts`
- [x] T007 Create `src/db/sqlcipher.ts` — `deriveSqlcipherKey(keyManager: KeyManager): Promise<string>`: derives 32-byte key from `keyManager` public key via HKDF-SHA256 with context `agent-friday-sqlcipher-v1` and returns hex string; `applyKey(db: Database, hexKey: string): void`: executes `PRAGMA key = "x'<hex>'"` as the first statement

**Checkpoint**: `npx tsc --noEmit` passes. SqliteVault compiles as a MemoryVault implementor.

---

## Phase 3: User Story 2 — Schema Initialisation and Migration (P1) 🎯 MVP

**Goal**: Opening a fresh database creates all required tables. Reopening an existing
database preserves data. Migrations run exactly once and are idempotent.

**Independent Test**: `npx vitest run tests/integration/schema.test.ts` — uses real
SQLCipher with a temp file; no mocking.

- [x] T008 [US2] Implement `runMigrations(db: Database)` in `src/db/schema.ts` — read `schema_version`, apply all pending migrations from `MIGRATIONS` array in a single transaction, update version; if version already current, return immediately (idempotent)
- [x] T009 [US2] Implement `SqliteVault.open()` in `src/vault/SqliteVault.ts` — (1) open `better-sqlite3` Database at `dbPath`; (2) call `applyKey(db, key)`; (3) load sqlite-vec extension; (4) call `runMigrations(db)`; (5) return `new SqliteVault(db, options)`
- [x] T010 [US2] Create `tests/integration/schema.test.ts` — tests using real SQLCipher tmp file: fresh DB creates all tables; `entries` table has correct columns; `entry_vectors` virtual table exists; reopening DB preserves zero rows; running migrations twice does not error or duplicate schema; `schema_version` reads `1` after open

**Checkpoint**: `npx vitest run tests/integration/schema.test.ts` — all tests green.

---

## Phase 4: User Story 1 — Store an Encrypted Entry (P1)

**Goal**: `append` accepts content, encrypts it, and inserts an entry into the ledger.
Stored payload is not plaintext. Chain links are correct.

**Independent Test**: `npx vitest run tests/integration/append.test.ts`.

- [x] T011 [US1] Implement `SqliteVault.append()` in `src/vault/SqliteVault.ts` — (1) validate content non-empty; (2) encrypt via `keyManager.encrypt()`; (3) generate embedding via `embedder` or zeroblob; (4) compute `payload_hash = SHA-256(payload)`; (5) sign via `keyManager.sign(payload ‖ previousId ‖ 'append' ‖ createdAt)`; (6) INSERT into `entries`; (7) INSERT into `entry_vectors`; (8) return `id`
- [x] T012 [US1] Create `tests/integration/append.test.ts` — tests: returns non-empty `EntryId`; successive IDs unique; raw payload column ≠ plaintext; second entry's `previous_id` = first entry's `id`; first entry has `previous_id = null`; `payload_hash = SHA-256(payload)` (verify without decrypting); empty content throws; `action = 'append'`

**Checkpoint**: `npx vitest run tests/integration/append.test.ts` — all tests green.

---

## Phase 5: User Story 3 — Query Entries by Semantic Relevance (P1)

**Goal**: `query` returns active entries excluding redacted and superseded ones.
Falls back to recency ordering when no embedder is present.

**Independent Test**: `npx vitest run tests/integration/query.test.ts`.

- [x] T013 [US3] Implement `SqliteVault.query()` in `src/vault/SqliteVault.ts` — (1) apply active-entry CTE filter (excludes redacted + superseded); (2) if embedder: generate query embedding, join with `entry_vectors` ordered by cosine distance; else: `ORDER BY created_at DESC LIMIT ?`; (3) for each result row: call `keyManager.decrypt(payload)` and return `MemoryEntryDecrypted`
- [x] T014 [US3] Create `tests/integration/query.test.ts` — tests: returns decrypted content; redacted entry absent from results; superseded entry absent (amended entry appears instead); empty vault returns []; recency fallback (no embedder) returns results without error; `limit` option respected; result content matches original

**Checkpoint**: `npx vitest run tests/integration/query.test.ts` — all tests green.

---

## Phase 6: User Story 4 — Amend an Entry (P2)

**Goal**: `amend` appends a replacement entry linked to the original. The original is
excluded from `query` results. The database always contains both entries.

**Independent Test**: `npx vitest run tests/integration/amend.test.ts`.

- [x] T015 [US4] Implement `SqliteVault.amend()` in `src/vault/SqliteVault.ts` — (1) validate `id` exists in `entries`; (2) encrypt new content; (3) generate embedding; (4) sign; (5) INSERT new entry with `action = 'amend'` and `previous_id = id`; (6) INSERT into `entry_vectors`; return new `EntryId`
- [x] T016 [US4] Create `tests/integration/amend.test.ts` — tests: returns new EntryId ≠ original; original excluded from query; new content appears in query; both rows exist in DB (`action = 'amend'`, `previous_id = original`); unknown id throws and no row written; empty content throws

**Checkpoint**: `npx vitest run tests/integration/amend.test.ts` — all tests green.

---

## Phase 7: User Story 5 — Redact an Entry (P2)

**Goal**: `redact` appends a redaction record. The original is excluded from all
queries. No data is deleted.

**Independent Test**: `npx vitest run tests/integration/redact.test.ts`.

- [x] T017 [US5] Implement `SqliteVault.redact()` in `src/vault/SqliteVault.ts` — (1) validate `id` exists; (2) INSERT new row with `action = 'redact'`, `previous_id = id`, optional reason encrypted in payload; return new `EntryId`; no DELETE executed
- [x] T018 [US5] Create `tests/integration/redact.test.ts` — tests: returns new EntryId; original absent from all queries; both rows in DB (count = 2); reason accepted without error; unknown id throws and no row written; table row count unchanged on error

**Checkpoint**: `npx vitest run tests/integration/redact.test.ts` — all tests green.

---

## Phase 8: User Story 6 — Chain Integrity Verification (P3)

**Goal**: On startup, the vault spot-checks the last N entries. A broken chain aborts
the open with a descriptive error identifying the failing entry.

**Independent Test**: `npx vitest run tests/integration/chain-integrity.test.ts`.

- [x] T019 [US6] Implement `verifyChain(db: Database, n: number)` in `src/vault/SqliteVault.ts` — fetch last `n` entries ordered by `created_at DESC`; for each: verify `SHA-256(payload) === payload_hash`; verify `previous_id` exists in DB if non-null; throw with entry `id` if either check fails
- [x] T020 [US6] Wire `verifyChain` into `SqliteVault.open()` after migrations — call `verifyChain(db, options.integrityCheckN ?? 50)`; if `n = 0` skip
- [x] T021 [US6] Create `tests/integration/chain-integrity.test.ts` — tests: valid chain passes startup; corrupt `payload_hash` (direct DB write) causes open to throw with the corrupt entry's id in the message; broken `previous_id` causes open to throw; `integrityCheckN = 0` skips check; new vault (zero entries) passes

**Checkpoint**: `npx vitest run tests/integration/chain-integrity.test.ts` — all tests green.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [x] T022 [P] Run `npm run test:integration` — all integration tests green
- [x] T023 [P] Run `npm run typecheck` — zero errors
- [x] T024 [P] Run `npm run test:contract && npm run test:unit` — no regressions from prior specs
- [x] T025 Audit `src/vault/SqliteVault.ts` and `src/db/` for DELETE or UPDATE statements — confirm zero occurrences (constitution Principle I)
- [x] T026 [P] Update `src/index.ts` — export `SqliteVault`, `SqliteVaultOptions`, `Embedder`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **blocks all user stories**
- **US2 — Schema (Phase 3)**: Depends on Foundational — **blocks US1, US3, US4, US5, US6**
- **US1 — Append (Phase 4)**: Depends on US2 — no other story dependencies
- **US3 — Query (Phase 5)**: Depends on US1 (needs entries to query) — can run after US2 if entries are seeded in test
- **US4 — Amend (Phase 6)**: Depends on US1 (needs entries to amend)
- **US5 — Redact (Phase 7)**: Depends on US1 (needs entries to redact)
- **US6 — Chain integrity (Phase 8)**: Depends on US1 (needs entries for chain)
- **Polish (Phase 9)**: Depends on all story phases

### Parallel Opportunities

```bash
# Phase 1
T002 Create directories
T003 Add test:integration script

# Phase 2 — run in parallel once T001 complete
T004 src/db/schema.ts
T005 src/db/queries.ts
T006 src/vault/SqliteVault.ts (stub)
T007 src/db/sqlcipher.ts

# Phase 3-8 — must be sequential (each depends on the prior)
US2 (schema) → US1 (append) → US3/US4/US5/US6 (can run parallel after US1)

# US3, US4, US5 can run in parallel after US1
Phase 5 (US3) ─┐
Phase 6 (US4) ─┤ all independent after Phase 4
Phase 7 (US5) ─┘

# Phase 8 (US6) after any of the above (needs entries)
```

---

## Implementation Strategy

### MVP (US2 + US1 — schema and append)

1. Phase 1: Setup
2. Phase 2: Foundational
3. Phase 3: Schema (US2) — DB is openable
4. Phase 4: Append (US1) — entries can be written
5. **STOP and VALIDATE**: `npm run test:integration` for schema + append tests
6. At this point `SqliteVault` can accept writes — `004-mcp-server` can begin wiring

### Full SqliteVault

After MVP: US3 → US4/US5 (parallel) → US6 → Polish.

---

## Notes

- All integration tests hit real SQLCipher; no mocking (constitution Principle I)
- Each test creates a fresh tmp database; no shared state between tests
- Tests access the raw DB directly (via `Database` constructor) only for chain corruption tests — all other assertions go through `SqliteVault` methods
- `[P]` tasks have no file conflicts and can run in parallel
- `[USn]` label maps each task to its user story
- Commit after each checkpoint
