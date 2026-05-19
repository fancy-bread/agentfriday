# Tasks: Semantic Index

**Input**: Design documents from `specs/005-semantic-index/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/embedder.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story this task belongs to (US1–US3)
- No new schema; no new packages. Tests required (constitution mandates end-to-end verification).

---

## Phase 1: Setup

**Purpose**: Create the embeddings module directory

- [x] T001 Create `src/embeddings/` directory (will hold cosine.ts and OllamaEmbedder.ts)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Cosine math functions and SQL query that all stories depend on

**⚠️ CRITICAL**: US1 and US2 both require these before implementation can begin

- [x] T002 Create `src/embeddings/cosine.ts` — export `cosineSimilarity(a: Float32Array, b: Float32Array): number` (dot product / product of magnitudes; return 0 if either magnitude is 0) and `isZeroVector(v: Float32Array): boolean` (true if all elements are 0)
- [x] T003 [P] Add `ACTIVE_ENTRIES_WITH_EMBEDDINGS` SQL constant to `src/db/queries.ts` — same CTE filter as `ACTIVE_ENTRIES_RECENCY` but also selects `embedding` column and has no `LIMIT ?` (all active rows returned; TypeScript applies the limit after cosine sort)

**Checkpoint**: `npx tsc --noEmit` passes; cosine functions exist and SQL constant is exported

---

## Phase 3: User Story 2 — Embeddings Generated When Storing a Memory (Priority: P1)

**Goal**: When Ollama is available, `memory_append` and `memory_amend` store real 768-dim embeddings; when unavailable, they store zero-vectors and succeed without error

**Independent Test**: Start vault with `OllamaEmbedder` wired in; call `memory_append`; verify entry is stored (write succeeds regardless of Ollama availability)

### Tests for User Story 2

- [x] T004 [P] [US2] Create `tests/unit/ollama-embedder.test.ts` — mock global `fetch` using `vi.stubGlobal`: (1) 200 response with valid embeddings array → returns Float32Array of length 768; (2) fetch throws (network error) → `embed()` throws; (3) 503 response → `embed()` throws; (4) malformed JSON body → `embed()` throws

### Implementation for User Story 2

- [x] T005 [US2] Create `src/embeddings/OllamaEmbedder.ts` — export class `OllamaEmbedder` with `constructor(baseUrl: string, model: string)` and `async embed(content: string): Promise<Float32Array>`; POST to `${baseUrl}/api/embed` with body `{ model, input: content }` and `signal: AbortSignal.timeout(2000)`; parse `response.embeddings[0]` as Float32Array; throw on any failure
- [x] T006 [US2] Update `runStart()` in `src/cli/start.ts` — import `OllamaEmbedder` from `../embeddings/OllamaEmbedder.js`; instantiate with `('http://localhost:11434', 'nomic-embed-text')`; wrap in a `const embedder: Embedder = async (content) => { try { return await ollama.embed(content); } catch { return new Float32Array(768); } }`; pass `embedder` to `SqliteVault.open({ keyManager, embedder, dbPath: options.vaultPath })`

**Checkpoint**: `npm run test:unit` passes ollama-embedder tests; daemon launches and stores entries with or without Ollama running

---

## Phase 4: User Story 1 — Query Returns Semantically Relevant Results (Priority: P1)

**Goal**: `memory_query` ranks results by cosine similarity when embeddings are available; entries with real embeddings surface above zero-vector entries when context is semantically related

**Independent Test**: Store two entries with distinct deterministic embeddings using a `StubEmbedder`; query with a context vector closer to entry A; verify entry A ranks first regardless of insertion order

### Tests for User Story 1

- [x] T007 [P] [US1] Write `tests/unit/cosine.test.ts` — 6 cases: (1) identical non-zero vectors → similarity = 1.0; (2) orthogonal vectors → 0.0; (3) opposite vectors → -1.0; (4) zero-vector input → 0 (not NaN); (5) `isZeroVector(new Float32Array(768))` → true; (6) `isZeroVector` of vector with one non-zero element → false
- [x] T008 [US1] Write `tests/integration/semantic.test.ts` using `openVault()` from `tests/integration/helpers/openVault.js` with an inline `StubEmbedder` (a `Map<string, Float32Array>` keyed by content string): (1) entry stored with real embedding appears above zero-vector entry in cosine-ranked query; (2) query with context closest to entry A ranks A above B; (3) limit parameter caps cosine-ranked results; (4) all entries are zero-vectors → falls back to recency, no error

### Implementation for User Story 1

- [x] T009 [US1] Update `query()` in `src/vault/SqliteVault.ts` — import `cosineSimilarity` and `isZeroVector` from `../embeddings/cosine.js`; import `ACTIVE_ENTRIES_WITH_EMBEDDINGS` from `../db/queries.js`; add interface `EntryRowWithEmbedding extends EntryRow { embedding: Buffer }`; when `this.embedder` is set: await embedder(context), check `isZeroVector(queryVec)` — if zero fall through to recency; else fetch all active rows with `ACTIVE_ENTRIES_WITH_EMBEDDINGS`, compute `cosineSimilarity` for each non-zero-vector row, sort descending, slice to `limit`, decrypt and return

**Checkpoint**: `npm run test:integration` passes semantic tests; cosine-ranked entries returned in correct order

---

## Phase 5: User Story 3 — Graceful Degradation When Embedding Service Is Unavailable (Priority: P1)

**Goal**: `memory_append` and `memory_query` complete without error and return useful results when Ollama is down; daemon does not crash; recovery is automatic when Ollama comes back

**Independent Test**: Set `StubEmbedder` to always return zero-vector; call `memory_append` (stores placeholder, succeeds) and `memory_query` (returns by recency, no error)

### Tests for User Story 3

- [x] T010 [US3] Add `describe('graceful degradation')` block to `tests/integration/semantic.test.ts`: (1) embedder always returns zero-vector → `memory_append` succeeds and returns id; (2) embedder always returns zero-vector → `memory_query` returns entries by recency without error; (3) vault opened with NO embedder (undefined) → `memory_query` returns by recency without error; (4) switch StubEmbedder from zero-vector to real vector mid-session → new writes get real embeddings, existing entries remain zero-vector

**Checkpoint**: All degradation tests pass; no changes to spec behaviour confirmed

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Typecheck, full suite, cleanup

- [x] T011 [P] Run `npm run typecheck` — fix any TypeScript errors in `src/embeddings/`, `src/vault/SqliteVault.ts`, `src/cli/start.ts`, `tests/unit/`, `tests/integration/semantic.test.ts`
- [x] T012 Run `npm test` — all 16+ test files pass including new unit and integration tests

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Requires Phase 1 — BLOCKS US1 and US2 implementation
- **US2 (Phase 3)**: Requires Phase 2 — OllamaEmbedder needs no cosine math; start.ts wiring needs OllamaEmbedder
- **US1 (Phase 4)**: Requires Phase 2 — SqliteVault.query() needs cosine functions and new SQL
- **US3 (Phase 5)**: Requires Phase 4 (same test file as US1) — adds degradation test cases
- **Polish (Phase 6)**: Requires all story phases complete

### User Story Dependencies

- **US2**: Depends on Phase 2 (SQL query not needed for write path; cosine not needed for write path)
  — actually US2 only needs T001. OllamaEmbedder has no dependency on cosine or SQL.
- **US1**: Depends on T002 (cosine) + T003 (SQL) + T005 (OllamaEmbedder for start.ts wiring)
- **US3**: Depends on US1 (same query code path tested with zero-vector embedder)

### Parallel Opportunities

- T003 (SQL) and T002 (cosine) can run in parallel (different files)
- T004 (OllamaEmbedder unit test) and T007 (cosine unit test) can run in parallel (different files)
- T011 and T012 are sequential (typecheck before full test run)

---

## Parallel Examples

```
# Phase 2 — run together:
Task T002: Create src/embeddings/cosine.ts
Task T003: Add ACTIVE_ENTRIES_WITH_EMBEDDINGS to src/db/queries.ts

# Phase 3+4 unit tests — run together:
Task T004: tests/unit/ollama-embedder.test.ts
Task T007: tests/unit/cosine.test.ts
```

---

## Implementation Strategy

### MVP (all three stories are P1 — must all ship together)

1. Phase 1: Setup (T001)
2. Phase 2: Foundational (T002–T003)
3. Phase 3: US2 (T004–T006)
4. Phase 4: US1 (T007–T009)
5. Phase 5: US3 (T010)
6. Phase 6: Polish (T011–T012)
7. **VALIDATE**: `npm test` passes; start daemon with Ollama running and confirm semantic ranking works

### No Incremental Delivery

All three P1 stories are tightly coupled — the fallback (US3) is part of the same
code paths as embed-on-write (US2) and semantic query (US1). Ship all three together.
