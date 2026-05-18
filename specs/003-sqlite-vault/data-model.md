# Data Model: SqliteVault

**Phase**: 1 | **Date**: 2026-05-18 | **Feature**: [spec.md](spec.md)

---

## Database Schema

### `entries` table

Primary ledger — INSERT-only. Every append, amend, and redact creates one row.

```sql
CREATE TABLE entries (
  id           TEXT    PRIMARY KEY,                          -- UUIDv4
  payload      BLOB    NOT NULL,                            -- XSalsa20-Poly1305 encrypted content
  embedding    BLOB    NOT NULL DEFAULT (zeroblob(3072)),   -- float32[768], 3072 bytes; zero = no embedder
  created_at   INTEGER NOT NULL,                            -- Unix ms timestamp
  previous_id  TEXT    REFERENCES entries(id),              -- null for originals
  action       TEXT    NOT NULL
               CHECK(action IN ('append', 'amend', 'redact')),
  signature    BLOB    NOT NULL,                            -- Ed25519 signature
  payload_hash BLOB    NOT NULL                             -- SHA-256 of payload (stored in clear)
);

CREATE INDEX idx_entries_created_at ON entries(created_at DESC);
CREATE INDEX idx_entries_previous_id ON entries(previous_id);
```

### `entry_vectors` virtual table (sqlite-vec)

Enables approximate nearest-neighbour search over stored embeddings.

```sql
CREATE VIRTUAL TABLE entry_vectors USING vec0(
  embedding float[768]
);
```

Rows in `entry_vectors` are keyed by the same `id` as `entries`. The `embedding`
in `entry_vectors` mirrors the `embedding` column in `entries`. Both are written in
the same transaction on append/amend.

*Note: `entry_vectors` rows are NOT created for redact actions — redacted entries
are excluded from query results by the filter on `entries.action`, not by their
absence from the vector table.*

### `schema_version` table

Single-row metadata table for migration tracking.

```sql
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO schema_version (version) VALUES (0);
```

Current schema version: **1**. Version 0 means uninitialized.

---

## Migration History

| Version | Description |
|---------|-------------|
| 0 → 1 | Initial schema: `entries`, `entry_vectors`, indexes |

---

## Relationships

```
entries (id) ─────────────────────────────► entries (previous_id)
                                             (self-referential chain)

entries (id) ──────── 1:1 ────────────────► entry_vectors (rowid)
                (mirrored at write time)
```

---

## Query Filter — Active Entries

The `query` operation must exclude:

1. Entries where `action = 'redact'` (the redaction record itself)
2. Entries whose `id` appears as `previous_id` of any `action = 'redact'` row
3. Entries whose `id` appears as `previous_id` of any `action = 'amend'` row

Efficient filter using a CTE:

```sql
WITH superseded AS (
  SELECT previous_id FROM entries
  WHERE action IN ('amend', 'redact') AND previous_id IS NOT NULL
)
SELECT e.* FROM entries e
WHERE e.action != 'redact'
  AND e.id NOT IN (SELECT previous_id FROM superseded)
ORDER BY e.created_at DESC
LIMIT ?;
```

For semantic ranking: replace `ORDER BY e.created_at DESC` with an ANN join on
`entry_vectors` when an embedder is present.

---

## Chain Integrity Check

Spot-check the last N entries ordered by `created_at DESC`:

```sql
SELECT id, payload, payload_hash, previous_id
FROM entries
ORDER BY created_at DESC
LIMIT ?;
```

For each row: verify `SHA-256(payload) == payload_hash`. For rows with non-null
`previous_id`: verify the referenced id exists in `entries`.

---

## Validation Rules

| Field | Rule |
|-------|------|
| `id` | UUIDv4; MUST be unique; assigned by SqliteVault |
| `payload` | MUST be non-empty ciphertext; plaintext MUST NOT be stored |
| `embedding` | 768 × float32 = 3072 bytes; zeroblob when no embedder |
| `previous_id` | NULL on `append`; MUST reference existing id on `amend`/`redact` |
| `action` | One of `'append'`, `'amend'`, `'redact'` — enforced by CHECK constraint |
| `signature` | Ed25519; MUST be computed over `payload ‖ previous_id ‖ action ‖ created_at` |
| `payload_hash` | SHA-256 of `payload`; stored in clear for chain verification without decryption |
