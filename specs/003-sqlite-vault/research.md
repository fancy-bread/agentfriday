# Research: SqliteVault

**Phase**: 0 | **Date**: 2026-05-18 | **Feature**: [spec.md](spec.md)

---

## Decision 1: `@signalapp/better-sqlite3` for SQLCipher access

**Decision**: Use `@signalapp/better-sqlite3` — Signal's fork of `better-sqlite3`
with SQLCipher bundled. Synchronous API. Provides AES-256 database-level encryption
on top of payload-level encryption (XSalsa20-Poly1305 via KeyManager).

**Rationale**: Established in `001-vault-interface` TDD. Signal's usage provides
credible precedent. Synchronous API simplifies the implementation — no async/await
overhead in the hot write path. The bundled SQLCipher means no system-level
dependency on a SQLCipher installation.

**Alternatives considered**:
- `better-sqlite3` without SQLCipher — rejected; no database-level encryption.
- `node-sqlite3` (async) — rejected; async API adds complexity for no benefit in a
  single-writer local service.

---

## Decision 2: `sqlite-vec` for approximate nearest-neighbour search

**Decision**: Load `sqlite-vec` as a SQLite dynamic extension. It provides a `vec0`
virtual table that stores float32 embeddings and supports ANN search via
`vec_distance_cosine` or `vec_distance_l2`.

**Rationale**: Co-locates the vector index with the ledger in the same database
file — one file to manage, one encryption boundary, consistent backup semantics.
No separate vector store process or network hop.

**Installation**: `npm install sqlite-vec`. The extension is loaded at DB open via
`db.loadExtension(require.resolve('sqlite-vec'))`.

**Alternatives considered**:
- `hnswlib-node` standalone — rejected; separate file, separate process, separate
  backup concern.
- `usearch` — valid alternative but less SQLite-native.

---

## Decision 3: Schema versioning via `schema_version` table

**Decision**: A single-row `schema_version` table holds the current schema integer.
Migrations are an ordered array of SQL strings indexed by version number. On open,
the vault reads the version, applies any pending migrations in order, and updates
the version. All migrations run in a single transaction.

**Rationale**: Simple, self-contained, no external migration library needed. The
single-table approach is standard for embedded databases. Running in a transaction
ensures atomicity — either all migrations apply or none do.

**Alternatives considered**:
- `db-migrate` / `knex` migrations — over-engineered for a single embedded database.
- File-based migration lock — unnecessary for a single-writer service.

---

## Decision 4: Chain integrity check on startup

**Decision**: On open, `SqliteVault` runs a spot-check of the last N entries
(default N=50, configurable via `integrityCheckN` option). For each entry with a
non-null `previous_id`, it verifies `payload_hash` equals `SHA-256(payload)` and
that `previous_id` exists in the table. If any check fails, the vault throws and
refuses to open for writes.

**Rationale**: Full chain verification on every open would be too slow for large
vaults. Spot-checking the most recent entries catches recent tampering — the most
likely attack vector — without O(n) startup cost. Full verification can be triggered
as a separate diagnostic command.

**Alternatives considered**:
- Full chain verification on every open — rejected; O(n) cost unacceptable as vault grows.
- No startup check — rejected; violates the tamper-evidence guarantee.

---

## Decision 5: Embedder injection pattern

**Decision**: `SqliteVault.open()` accepts an optional `embedder: (content: string) =>
Promise<Float32Array>` parameter. When present, embeddings are generated at write
time and stored in `entry_vectors`. When absent, a zero vector is stored and `query`
falls back to recency ordering (`ORDER BY created_at DESC`).

**Rationale**: Decouples the vault implementation from the embedding model. The
embedding model (Ollama / nomic-embed-text) is specified in `005-semantic-index`.
SqliteVault can be fully tested and used without any embedding service running.

**Alternatives considered**:
- Hard-code a specific embedding model — rejected; couples SqliteVault to a service
  not in scope for this spec.
- Require embedder (no fallback) — rejected; makes SqliteVault untestable without
  Ollama and breaks the chain if Ollama is down.

---

## Decision 6: SQLCipher key derivation

**Decision**: The SQLCipher database key is derived from the `KeyManager`'s
encryption key using HKDF-SHA256 with context `agent-friday-sqlcipher-v1`. It is
passed to SQLCipher via `PRAGMA key = "x'<hex>'"` immediately after opening the
database. The key is never written to disk; it lives only in memory for the duration
of the database connection.

**Rationale**: Reuses the KeyManager's key material rather than generating a
separate key — one root of trust, one Keychain entry. HKDF ensures the SQLCipher
key is cryptographically independent of the entry-level encryption key (which uses
a different HKDF context: `agent-friday-vault-v1`).

**Alternatives considered**:
- Separate SQLCipher key stored in Keychain — rejected; two Keychain entries, two
  failure modes, more complex init/status.
- Use KeyManager encryption key directly as SQLCipher key — rejected; key reuse
  across different cryptographic contexts is a security anti-pattern.

---

## Known Constraint: sqlite-vec and `SQLITE_ENABLE_LOAD_EXTENSION`

`@signalapp/better-sqlite3` is compiled without `SQLITE_ENABLE_LOAD_EXTENSION` —
a deliberate security hardening choice. This means sqlite-vec cannot be loaded as a
SQLite extension at runtime, regardless of CLI flags or configuration.

**Impact**: The `entry_vectors` virtual table and ANN query path are inactive in v1.
`SqliteVault.query()` falls back to recency ordering, which is correct per the spec.
Embedding blobs are still stored with each entry, ready for use by a future indexer.

**Resolution**: Deferred to `005-semantic-index`. That spec must select an approach
that does not depend on SQLite extension loading. Leading options: cosine similarity
computed in TypeScript over stored blobs (Option A), or a separate vector index file
using hnswlib or usearch (Option B). Both are compatible with the current schema.

This is not a regression — the recency fallback is explicitly required by the spec
and all tests pass. Semantic ranking is a quality-of-recall improvement, not a
correctness requirement for v1.
