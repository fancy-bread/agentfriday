# Data Model: Semantic Index

**Phase**: 1 | **Feature**: 005-semantic-index | **Date**: 2026-05-18

## Overview

No new persisted entities. The `embedding` column already exists in the `entries`
table (from 003-sqlite-vault) and holds 768 × float32 = 3072 bytes per row. This
feature fills those bytes with real values instead of `zeroblob(3072)`.

---

## In-Process Types

### `Embedder`

Already defined in `src/vault/SqliteVault.ts`:

```typescript
export type Embedder = (content: string) => Promise<Float32Array>;
```

Contract: Must return a `Float32Array` of exactly 768 elements. Must never throw —
callers treat the return value as authoritative. Zero-vector signals embedding
failure.

### `OllamaEmbedder`

New class in `src/embeddings/OllamaEmbedder.ts`:

| Property | Type | Description |
|----------|------|-------------|
| `baseUrl` | `string` | Ollama base URL (default: `http://localhost:11434`) |
| `model` | `string` | Embedding model name (default: `nomic-embed-text`) |

Method: `embed(content: string): Promise<Float32Array>`

- On success: returns 768-element `Float32Array`
- On network failure, timeout, or unexpected response: throws (caller wraps in try/catch)

### Cosine Similarity

Two pure functions in `src/embeddings/cosine.ts`:

| Function | Signature | Returns |
|----------|-----------|---------|
| `cosineSimilarity` | `(a: Float32Array, b: Float32Array) => number` | [-1, 1]; returns 0 if either is zero-vector |
| `isZeroVector` | `(v: Float32Array) => boolean` | `true` if all elements are 0 |

---

## Query Result Shape (Unchanged)

`memory_query` still returns `MemoryEntryDecrypted[]` — unchanged from 004.
Semantic ranking changes the *order* of results, not their shape.

---

## Embedding Storage (Existing Schema)

```sql
-- From 003-sqlite-vault schema (no changes):
embedding BLOB NOT NULL DEFAULT (zeroblob(3072))
```

- `zeroblob(3072)` — written when embedder is unavailable (placeholder)
- Real value — 768 × little-endian float32 — written when Ollama is available

Detection: `isZeroVector(Float32Array.from(embeddingBlob))` identifies placeholders.
