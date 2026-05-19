# Research: Semantic Index

**Phase**: 0 | **Feature**: 005-semantic-index | **Date**: 2026-05-18

## Decision 1: Vector Search Strategy — Cosine Similarity in TypeScript

**Decision**: Compute cosine similarity in TypeScript over embedding blobs fetched
from the vault (Option A). No native vector index library.

**Rationale**: `@signalapp/better-sqlite3` compiles SQLite without
`SQLITE_ENABLE_LOAD_EXTENSION` for security hardening — sqlite-vec cannot be loaded
as an extension. This is documented in `specs/003-sqlite-vault/research.md` and
`ROADMAP.md`. For v1 scale (up to ~1,000 entries), O(n) cosine similarity over
fetched blobs completes well under 1 second. Adding hnswlib or usearch would
introduce native binaries and a separate index file for no measurable benefit at
this scale.

**Alternatives considered**:
- sqlite-vec extension: blocked — `loadExtension` not compiled in.
- hnswlib / usearch: separate ANN index file, native binaries, additional complexity.
  Deferred to v2 if scale requires it.
- `@tensorflow/tfjs-node` or ONNX runtime: heavyweight for cosine similarity alone.

---

## Decision 2: Embedding Service — Ollama with `nomic-embed-text`

**Decision**: Use Ollama's local HTTP API with the `nomic-embed-text` model.

**Rationale**: Ollama is a common local AI runtime with a simple REST API. The
`nomic-embed-text` model produces 768-dim vectors (matching the existing schema
column definition), is open-weight, and runs on consumer hardware. The TDD names
this combination explicitly.

**API endpoint**: `POST http://localhost:11434/api/embed`  
**Request**: `{ "model": "nomic-embed-text", "input": "<text>" }`  
**Response**: `{ "embeddings": [[<768 floats>]], ... }`

The response wraps embeddings in a nested array (batch API). For single inputs,
`response.embeddings[0]` is the vector.

**Alternatives considered**:
- `/api/embeddings` (legacy Ollama): `{ "prompt": "..." }` → `{ "embedding": [...] }`.
  Still supported but deprecated in newer Ollama versions.
- OpenAI-compatible `/v1/embeddings`: requires API key even for Ollama, unnecessary
  complexity.
- `sentence-transformers` via Python subprocess: heavy dependency, harder to
  distribute as part of `npx agent-friday`.

---

## Decision 3: New Dependency Budget — Zero New Packages

**Decision**: Use `fetch` (Node 24 built-in) for Ollama HTTP calls. No new runtime
packages.

**Rationale**: Node 24 ships with a stable `fetch` global. No `node-fetch`, `axios`,
or `undici` needed. The implementation is a single async function that wraps a
`fetch` call with a timeout and error-catch.

**Connection timeout**: 2 seconds. If Ollama does not respond in 2 seconds, the
request is treated as unavailable and the caller receives a zero-vector fallback.

---

## Decision 4: Zero-Vector Detection

**Decision**: A vector is considered a "placeholder" (not semantically useful) if
every element is 0. A real embedding from `nomic-embed-text` will never be all-zero.

**Implication for query**: If the embedder is set but returns a zero-vector (Ollama
unavailable or content produced a degenerate embedding), `query()` falls back to
recency. This avoids surfacing meaningless cosine scores (NaN or 1.0 against other
zero vectors).

**Implication for entries**: An entry stored with a zero-vector embedding is excluded
from cosine ranking — it can still be returned via recency fallback.

---

## Decision 5: Cosine Similarity Implementation

**Decision**: Implement cosine similarity as a pure function over two `Float32Array`
values. Handle zero-vector inputs explicitly.

```
similarity = dot(a, b) / (magnitude(a) * magnitude(b))
```

If either magnitude is 0 (zero-vector), return 0 (not NaN). This keeps the sort
stable — zero-vector entries sort to the bottom.

**Filtering in query**: After computing similarities, filter out entries where the
stored embedding is a zero-vector before sorting. Those entries can only be reached
via recency fallback, not cosine ranking.

---

## Decision 6: SqliteVault.query() — New Code Path

**Decision**: Update `query()` to add a third path alongside the two existing ones.

Current paths:
1. `embedder && vectorAvailable` → sqlite-vec ANN (never triggered, vectorAvailable=false)
2. else → recency

New paths after this feature:
1. `embedder` → generate query embedding; if non-zero: fetch all active entries with
   embeddings, compute cosine, sort, return top N
2. `embedder` → if query embedding is zero (Ollama down): fall back to recency
3. no `embedder` → recency (unchanged)

The `vectorAvailable` flag and `ACTIVE_ENTRIES_VECTOR` query become dead code after
this change and can be cleaned up in 007-packaging.

**New SQL query needed**: `ACTIVE_ENTRIES_WITH_EMBEDDINGS` — same CTE as
`ACTIVE_ENTRIES_RECENCY` but also selects the `embedding` BLOB column.

---

## Decision 7: start.ts Wiring

**Decision**: Instantiate `OllamaEmbedder` in `runStart()` and pass it to
`SqliteVault.open()`. Use a wrapper that catches errors and returns zero-vector,
so the vault's `Embedder` contract never throws.

```typescript
const ollamaEmbedder = new OllamaEmbedder('http://localhost:11434', 'nomic-embed-text');
const embedder: Embedder = async (content) => {
  try { return await ollamaEmbedder.embed(content); }
  catch { return new Float32Array(768); }
};
const vault = await SqliteVault.open({ keyManager, embedder });
```

**Config**: Host and model are hardcoded defaults for v1. FR-006 (configurable
endpoint) is satisfied by constructor parameters on `OllamaEmbedder` — exposed via
CLI flag in 007-packaging.
