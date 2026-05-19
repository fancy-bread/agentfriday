# Implementation Plan: Semantic Index

**Branch**: `005-semantic-index` | **Date**: 2026-05-18 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/005-semantic-index/spec.md`

## Summary

Add semantic ranking to `memory_query` by generating 768-dim embeddings via a local
Ollama instance at write time and computing cosine similarity in TypeScript at query
time. When Ollama is unavailable, writes store a zero-vector placeholder and queries
fall back to recency — the existing behaviour. No schema changes; the `embedding`
column already exists in `SqliteVault`. The `Embedder` injection point already exists
in `SqliteVaultOptions`.

## Technical Context

**Language/Version**: TypeScript 6.x / Node.js 24 LTS  
**Primary Dependencies**: `node:fetch` (built-in, Node 24 — no new package); Ollama
running locally with `nomic-embed-text` model (user-installed, optional)  
**Storage**: `SqliteVault` (003) — no schema changes; `embedding BLOB` column already
present (768 × float32 = 3072 bytes per entry)  
**Testing**: Vitest — `StubEmbedder` for integration tests (deterministic vectors);
unit tests for cosine similarity math  
**Target Platform**: macOS / Linux, local daemon  
**Project Type**: Library module extension (no new CLI commands, no new MCP tools)  
**Performance Goals**: `memory_query` with cosine ranking completes in under 1 second
for vaults up to 1,000 entries (SC-004)  
**Constraints**: No sqlite-vec extension (loadExtension blocked by
`@signalapp/better-sqlite3`). Cosine similarity computed in TypeScript over fetched
embedding blobs. O(n) per query — acceptable for v1 scale.  
**Scale/Scope**: Single local vault, single user, up to ~1,000 entries for MVP.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Principle I — Append-Only Ledger**: Embeddings are stored at INSERT time
  alongside new entries. Existing entry embeddings are never updated. `amend` writes
  a new row with a fresh embedding; `redact` writes a zero-vector (content-free).
  No UPDATE, no DELETE. ✅ PASS
- [x] **Principle II — Encrypt Before Write**: Embeddings are NOT plaintext and NOT
  sensitive per TDD ("The vector is not considered sensitive — it enables semantic
  search without decrypting the payload"). Embeddings are stored in clear alongside
  the encrypted payload — this is by design and acknowledged in the TDD. ✅ PASS
- [x] **Principle III — Keys Never Leave the Device**: Ollama runs locally. Plaintext
  content is sent to a local process only; no network calls leave the device.
  Embedding vectors never leave the device. ✅ PASS
- [x] **Principle IV — Interface Over Implementation**: The `Embedder` type and its
  injection point (`SqliteVaultOptions.embedder`) already exist in `SqliteVault`.
  `OllamaEmbedder` is a concrete `Embedder` implementation. `SqliteVault.query()`
  is extended — the `MemoryVault` interface contract is unchanged. ✅ PASS
- [x] **Principle V — Spec Before Code**: `specs/005-semantic-index/spec.md` exists
  and passed quality validation. ✅ PASS

**Post-Design Re-check**: Cosine similarity operates on in-memory float arrays fetched
from the vault — no raw content leaves the process, no key material involved. ✅ PASS

## Project Structure

### Documentation (this feature)

```text
specs/005-semantic-index/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── embedder.md
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
src/
├── embeddings/
│   ├── OllamaEmbedder.ts    ← Embedder impl: POST /api/embed, returns Float32Array
│   └── cosine.ts            ← cosineSimilarity(a, b): number; isZeroVector(v): boolean
├── vault/
│   └── SqliteVault.ts       ← query() updated: cosine ranking when embedder available
├── db/
│   └── queries.ts           ← ACTIVE_ENTRIES_WITH_EMBEDDINGS query added
└── cli/
    └── start.ts             ← Wire OllamaEmbedder into SqliteVault.open()

tests/
├── unit/
│   └── cosine.test.ts       ← Cosine similarity math (no vault, no Ollama)
└── integration/
    └── semantic.test.ts     ← SqliteVault.query() with StubEmbedder (no real Ollama)
```

**Structure Decision**: New `src/embeddings/` module. `SqliteVault.query()` updated
in-place. No new MCP tools, no new CLI commands. The `Embedder` seam already exists —
this feature fills it in.
