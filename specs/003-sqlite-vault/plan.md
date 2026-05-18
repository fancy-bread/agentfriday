# Implementation Plan: SqliteVault

**Branch**: `003-sqlite-vault` | **Date**: 2026-05-18 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/003-sqlite-vault/spec.md`

## Summary

Implement `SqliteVault` — the v1 `MemoryVault` implementation backed by SQLCipher
(`@signalapp/better-sqlite3`) with `sqlite-vec` for approximate nearest-neighbour
search. Accepts a `KeyManager` for all cryptographic operations and an optional
`Embedder` function for vector generation. All writes are INSERT-only; no UPDATE or
DELETE is ever executed. Integration tests hit real SQLCipher — no mocking per
constitution Principle I.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 24 LTS
**Primary Dependencies**: `@signalapp/better-sqlite3`, `sqlite-vec`
**Storage**: SQLCipher database at `~/.agent-friday/vault.db` (path injectable)
**Testing**: Vitest integration tests — real SQLCipher, in-memory or tmp-file DB
**Target Platform**: macOS primary; Linux/Windows via software key fallback
**Project Type**: TypeScript library (MemoryVault implementation)
**Performance Goals**: `append` < 100ms; `query` < 500ms for vaults up to 10k entries
**Constraints**: INSERT-only — no UPDATE, no DELETE, ever. KeyManager injected at
construction. Embedder is optional — recency fallback when absent.
**Scale/Scope**: Single-user, single-writer, up to ~100k entries in v1

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Gate | Applies | Status | Notes |
|------|---------|--------|-------|
| Principle I — Append-only | ✅ Yes | ✅ Pass | INSERT-only enforced in `SqliteVault`; no UPDATE/DELETE in any query |
| Principle II — Encrypt before write | ✅ Yes | ✅ Pass | `KeyManager.encrypt()` called before every INSERT; plaintext never reaches SQLCipher |
| Principle III — Keys never leave device | Partial | ✅ Pass | SqliteVault never handles key material directly; KeyManager is injected |
| Principle IV — Interface over implementation | ✅ Yes | ✅ Pass | `SqliteVault` implements `MemoryVault`; callers depend only on the interface |
| Principle V — Spec before code | ✅ Yes | ✅ Pass | spec.md complete and validated |

**No violations. Proceeding.**

## Project Structure

### Documentation (this feature)

```text
specs/003-sqlite-vault/
├── plan.md
├── research.md
├── data-model.md
├── contracts/
│   └── SqliteVault.ts
├── quickstart.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── vault/
│   ├── MemoryVault.ts       ← (001, unchanged)
│   ├── types.ts             ← (001, unchanged)
│   └── SqliteVault.ts       ← new: MemoryVault implementation
├── db/
│   ├── schema.ts            ← new: SQL schema, migration runner
│   └── queries.ts           ← new: prepared statement helpers
├── keys/                    ← (002, unchanged)
├── cli/                     ← (002, unchanged)
└── index.ts                 ← updated: export SqliteVault

tests/
├── contract/                ← (001, unchanged)
├── unit/                    ← (002, unchanged)
└── integration/
    └── SqliteVault.test.ts  ← new: integration tests (real SQLCipher)
```

**Structure Decision**: Single project. New vault implementation in `src/vault/`;
database helpers in `src/db/`. Integration tests in `tests/integration/` — they
hit real SQLCipher using a temporary file (not mocked).

## Complexity Tracking

> No constitution violations to justify.

**Embedder injection note**: `SqliteVault` accepts an optional `Embedder` function
at construction. When absent, `append` stores a zero vector and `query` uses recency
ordering. This defers the embedding model decision to `005-semantic-index` without
blocking this spec.
