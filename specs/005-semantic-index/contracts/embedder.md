# Contract: Embedder Abstraction

**Phase**: 1 | **Feature**: 005-semantic-index | **Date**: 2026-05-18

---

## Module: `src/embeddings/OllamaEmbedder.ts`

### Purpose

Implements the `Embedder` type by calling Ollama's local embedding API. Converts
plaintext to a 768-dim float vector. Throws on failure so the caller can wrap in a
zero-vector fallback.

### Signature

```typescript
export class OllamaEmbedder {
  constructor(baseUrl: string, model: string)
  embed(content: string): Promise<Float32Array>
}
```

### Preconditions

- `baseUrl` is a valid HTTP URL (no trailing slash) — e.g. `http://localhost:11434`
- `model` is a valid Ollama model name — e.g. `nomic-embed-text`

### Behaviour

1. POST to `{baseUrl}/api/embed` with body `{ "model": model, "input": content }`
2. Parse response JSON: `{ "embeddings": [[...768 floats...]] }`
3. Return `new Float32Array(response.embeddings[0])`
4. On any failure (network, timeout, non-200, malformed response): throw `Error`

### Timeout

2000ms. Enforced via `AbortController` + `AbortSignal.timeout(2000)`.

### Test Contract

`tests/unit/ollama-embedder.test.ts` MUST verify without a real Ollama process,
using `fetch` mocked via `vi.stubGlobal`:

1. Success path: mocked 200 response → returns Float32Array of length 768
2. Network error: mocked fetch rejection → throws Error
3. Non-200 response: mocked 503 → throws Error
4. Malformed JSON: mocked garbled body → throws Error

---

## Module: `src/embeddings/cosine.ts`

### Purpose

Pure math functions for cosine similarity computation over `Float32Array` values.

### Signatures

```typescript
export function cosineSimilarity(a: Float32Array, b: Float32Array): number
export function isZeroVector(v: Float32Array): boolean
```

### Behaviour — `cosineSimilarity`

- Computes `dot(a, b) / (‖a‖ · ‖b‖)`
- If either magnitude is 0 (zero-vector): return 0 (not NaN)
- Arrays must have the same length; behaviour is undefined for mismatched lengths

### Behaviour — `isZeroVector`

- Returns `true` if every element of `v` is exactly 0
- Returns `false` otherwise

### Test Contract

`tests/unit/cosine.test.ts` MUST verify:

1. `cosineSimilarity` of identical non-zero vectors = 1.0
2. `cosineSimilarity` of orthogonal vectors = 0.0
3. `cosineSimilarity` of opposite vectors = -1.0
4. `cosineSimilarity` of zero-vector and any other = 0 (not NaN)
5. `isZeroVector` of `new Float32Array(768)` = true
6. `isZeroVector` of a vector with any non-zero element = false

---

## Updated: `src/vault/SqliteVault.ts` — `query()` method

### New Code Path

```
if (embedder) {
  queryEmbedding = embedder(context)  // may return zero-vector on Ollama failure
  if !isZeroVector(queryEmbedding):
    rows = ACTIVE_ENTRIES_WITH_EMBEDDINGS (all active rows, no LIMIT)
    scored = rows with cosineSimilarity(queryEmbedding, row.embedding)
             filtered to non-zero-vector entries
             sorted descending by score
             sliced to limit
    return decrypt(scored)
  else:
    fall through to recency
}
// recency fallback
rows = ACTIVE_ENTRIES_RECENCY(limit)
return decrypt(rows)
```

### New SQL — `ACTIVE_ENTRIES_WITH_EMBEDDINGS`

```sql
WITH superseded AS (
  SELECT previous_id FROM entries
  WHERE action IN ('amend', 'redact') AND previous_id IS NOT NULL
)
SELECT id, payload, embedding, created_at, previous_id, action
FROM entries
WHERE action != 'redact'
  AND id NOT IN (SELECT previous_id FROM superseded)
ORDER BY created_at DESC
```

No LIMIT — all active entries are fetched for cosine ranking. The TypeScript layer
applies the limit after sorting.

### Test Contract

`tests/integration/semantic.test.ts` MUST verify using `openVault()` with a
`StubEmbedder` (deterministic, controllable vectors):

1. Entries stored with non-zero embeddings are ranked by cosine similarity — the
   semantically closest entry appears first, regardless of insertion order
2. Entries stored with zero-vector embeddings are excluded from cosine ranking (but
   may appear via recency if there are no real-embedding entries)
3. When the embedder returns zero-vector for query context, results fall back to
   recency
4. `limit` parameter is respected in cosine-ranked results
5. Empty vault returns empty array (no error)

---

## Updated: `src/cli/start.ts` — `runStart()`

### Addition

```typescript
import { OllamaEmbedder } from '../embeddings/OllamaEmbedder.js';

const ollama = new OllamaEmbedder('http://localhost:11434', 'nomic-embed-text');
const embedder: Embedder = async (content) => {
  try { return await ollama.embed(content); }
  catch { return new Float32Array(768); }
};
const vault = await SqliteVault.open({ keyManager, embedder, dbPath: options.vaultPath });
```

The try/catch wrapper ensures `SqliteVault` receives an `Embedder` that never throws,
satisfying FR-003 and FR-005. Recovery (FR-007) is automatic — each new call retries
the Ollama HTTP request.
