# Feature Specification: SqliteVault

**Feature Branch**: `003-sqlite-vault`
**Created**: 2026-05-18
**Status**: Draft

## User Scenarios & Testing

### User Story 1 — Store an Encrypted Entry (Priority: P1)

The vault receives content, encrypts it, and persists it to the local database. The stored payload is unreadable without the key. The entry is assigned a unique identifier and linked to the previous entry by a cryptographic hash, forming an append-only chain.

**Why this priority**: Every other operation depends on entries existing in the vault. This is the foundational write path.

**Independent Test**: Call `append` with a content string. Confirm a unique identifier is returned. Inspect the database directly and confirm the stored payload differs from the plaintext. Confirm the entry's `previous_id` references the prior entry (or is null if it is the first).

**Acceptance Scenarios**:

1. **Given** an initialised vault, **When** `append` is called with non-empty content, **Then** a unique `EntryId` is returned and the entry is persisted.
2. **Given** an entry is persisted, **When** the database file is inspected directly, **Then** the payload column does not contain the original plaintext.
3. **Given** two successive appends, **When** the second entry is inspected, **Then** its `previous_id` equals the identifier of the first entry.
4. **Given** the first append to an empty vault, **When** the entry is inspected, **Then** its `previous_id` is null.
5. **Given** `append` is called with empty content, **When** the vault processes it, **Then** an error is returned and no entry is written.

---

### User Story 2 — Schema Initialisation and Migration (Priority: P1)

When the vault database is first opened, the required schema is created automatically. On subsequent opens, the schema is verified and any pending migrations are applied without data loss. The vault is ready to accept operations immediately after open.

**Why this priority**: Without a valid schema the vault cannot store or retrieve any data. This must work correctly before any other story.

**Independent Test**: Open a fresh database. Confirm all required tables and indexes exist. Close and reopen the same database. Confirm existing entries are intact and the schema is unchanged. Apply a schema version bump in a test scenario and confirm migration runs once and is idempotent.

**Acceptance Scenarios**:

1. **Given** a new database file, **When** the vault is opened, **Then** all required tables and indexes are created and the vault is ready for operations.
2. **Given** an existing database with data, **When** the vault is reopened, **Then** all prior entries are intact and accessible.
3. **Given** the vault is opened twice concurrently, **When** both opens attempt schema creation, **Then** no corruption occurs and exactly one schema exists.
4. **Given** a schema migration is pending, **When** the vault opens, **Then** the migration runs exactly once and existing data is preserved.

---

### User Story 3 — Query Entries by Semantic Relevance (Priority: P1)

The vault accepts a free-text context string and returns the most semantically relevant active entries, ranked by similarity. Redacted and superseded entries are excluded. If the vector index is unavailable, results fall back to recency ordering.

**Why this priority**: Retrieval is the primary value the vault delivers to agents. Without useful query results, stored memories have no effect.

**Independent Test**: Append several entries with distinct content. Query with a context string closely related to one of them. Confirm the most relevant entry ranks first. Confirm that redacted entries never appear regardless of semantic similarity.

**Acceptance Scenarios**:

1. **Given** multiple entries, **When** `query` is called with a relevant context string, **Then** the most semantically similar active entries are returned in ranked order.
2. **Given** a redacted entry, **When** `query` is called with any context, **Then** the redacted entry does not appear in results.
3. **Given** a superseded entry (replaced by amend), **When** `query` is called, **Then** the original entry does not appear; the amended entry does.
4. **Given** the vector index is unavailable, **When** `query` is called, **Then** results are returned in recency order without error.
5. **Given** an empty vault, **When** `query` is called, **Then** an empty result set is returned without error.

---

### User Story 4 — Amend an Entry (Priority: P2)

The vault appends a new entry that supersedes an existing one. The original entry is preserved in the database but excluded from query results. The new entry references the original by identifier and records the action as an amend.

**Why this priority**: Memories become stale. Without amendment, agents accumulate incorrect context.

**Independent Test**: Append an entry, then amend it with new content. Confirm that `query` returns the new content and not the original. Inspect the database and confirm both entries exist, with the new entry's `previous_id` pointing to the original.

**Acceptance Scenarios**:

1. **Given** an existing entry, **When** `amend` is called with new content, **Then** a new `EntryId` is returned and the original is excluded from queries.
2. **Given** an amended entry, **When** the database is inspected, **Then** both entries are present and the new entry's `previous_id` references the original.
3. **Given** `amend` is called with an unknown identifier, **Then** an error is returned and no entry is written.
4. **Given** `amend` is called with empty content, **Then** an error is returned and no entry is written.

---

### User Story 5 — Redact an Entry (Priority: P2)

The vault appends a redaction record that marks an existing entry as forgotten. The original entry is preserved in the database. Both the original and the redaction record are excluded from all future query results. No data is deleted.

**Why this priority**: Users must be able to remove sensitive memories. The right to be forgotten is a core product promise.

**Independent Test**: Append an entry, then redact it. Confirm that `query` never returns the entry regardless of context. Inspect the database and confirm both the original and the redaction record exist — no rows were deleted.

**Acceptance Scenarios**:

1. **Given** an existing entry, **When** `redact` is called, **Then** a redaction record is appended and the original is excluded from all queries.
2. **Given** a redacted entry, **When** the database is inspected, **Then** both the original entry and the redaction record exist — no DELETE was executed.
3. **Given** `redact` is called with an unknown identifier, **Then** an error is returned and no redaction record is written.
4. **Given** an optional reason is provided to `redact`, **Then** it is accepted without error and stored in the redaction record.

---

### User Story 6 — Chain Integrity Verification (Priority: P3)

On startup, the vault verifies that the ledger chain is intact by checking that each entry correctly references its predecessor. If the chain is broken, the vault refuses to accept new writes and reports which entry failed verification.

**Why this priority**: Chain integrity is the tamper-evidence guarantee. Detecting corruption before accepting new writes prevents further contamination of the ledger.

**Independent Test**: Open a vault with a valid chain and confirm startup succeeds. Inject a broken chain reference (wrong hash in a prior entry) and confirm startup fails with a descriptive error identifying the corrupt entry.

**Acceptance Scenarios**:

1. **Given** a vault with an intact chain, **When** the vault opens, **Then** startup succeeds and the vault is ready for operations.
2. **Given** a vault with a broken chain reference, **When** the vault opens, **Then** startup fails with an error identifying which entry broke the chain.
3. **Given** a chain integrity failure, **When** the vault attempts to accept a new write, **Then** the write is rejected until the integrity issue is resolved.

---

### Edge Cases

- What if two processes attempt concurrent writes? The database must serialise writes; no entries may be silently dropped or merged.
- What if the database file is corrupt or truncated? The vault must fail on open with a clear error rather than silently returning wrong data.
- What if disk space runs out during a write? The write must fail cleanly — no partial entries and no chain corruption.
- What if the vector index file is missing or corrupt? Query must fall back to recency without crashing; vector indexing is rebuilt on the next append.

## Requirements

### Functional Requirements

- **FR-001**: The vault MUST implement the `MemoryVault` interface defined in `001-vault-interface` without modification.
- **FR-002**: The vault MUST persist entries to a local encrypted database file; plaintext content MUST NOT be written to the file under any circumstances.
- **FR-003**: Every `append` operation MUST store the entry's `payload_hash` and `signature` alongside the encrypted payload.
- **FR-004**: The vault MUST enforce an INSERT-only policy at the database level; no UPDATE or DELETE statements may be executed.
- **FR-005**: The database schema MUST be created automatically on first open and migrated idempotently on subsequent opens.
- **FR-006**: `query` results MUST exclude entries where the entry has `action = 'redact'` or where the entry's `id` appears as the `previous_id` of a redact record.
- **FR-007**: `query` MUST return results ranked by semantic similarity when the vector index is available; MUST fall back to recency when it is not.
- **FR-008**: `amend` and `redact` MUST return an error for unknown identifiers without writing any record to the database.
- **FR-009**: On startup, the vault MUST verify chain integrity for the last N entries (N configurable, default 50); MUST refuse new writes if integrity fails.
- **FR-010**: The vault MUST accept a `KeyManager` at construction time; all encrypt and decrypt calls MUST delegate to it.

### Key Entities

- **SqliteVault**: The `MemoryVault` implementation. Owns the database connection and delegates all cryptography to the injected `KeyManager`.
- **LedgerEntry**: One row in the `entries` table. Contains: `id`, `payload` (encrypted), `embedding` (vector), `created_at`, `previous_id`, `action`, `signature`, `payload_hash`.
- **VectorIndex**: The `entry_vectors` virtual table enabling approximate nearest-neighbour search on entry embeddings.
- **SchemaVersion**: A metadata table tracking the current schema version number; used by the migration system to determine which migrations to apply.

## Success Criteria

- **SC-001**: 100% of `append` → `query` round-trips return the original content, decrypted correctly.
- **SC-002**: 100% of redacted entries are absent from `query` results in all test scenarios.
- **SC-003**: After any sequence of appends, amends, and redacts, chain integrity verification passes — confirmed across all integration test scenarios.
- **SC-004**: Opening a vault with a pre-existing database preserves all prior entries with 100% fidelity.
- **SC-005**: `query` with an unavailable vector index returns results without error in 100% of test scenarios.
- **SC-006**: No test scenario exercises a DELETE or UPDATE statement against the database — verified by audit of all database interactions.

## Assumptions

- The `KeyManager` interface and `MemoryVault` interface are defined and stable (from `001-vault-interface`). This spec implements them without modifying them.
- The vault database file is created by `init` (from `002-key-custody`) as an empty placeholder. `SqliteVault` applies the full schema on first open.
- The embedding model for vector search is defined in `005-semantic-index`. For this spec, `SqliteVault` accepts pre-computed embeddings from a caller-supplied embedding function and stores them; it does not call the embedding model directly.
- Concurrent access by multiple processes is not a v1 requirement. Single-writer, single-reader is the target model.
- The vault database file lives at `~/.agent-friday/vault.db` by default, but the path is injectable for testing.
