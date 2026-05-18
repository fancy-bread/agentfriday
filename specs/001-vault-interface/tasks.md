---
description: "Task list for vault interface implementation"
---

# Tasks: Vault Interface

**Input**: Design documents from `specs/001-vault-interface/`
**Branch**: `001-vault-interface`
**Date**: 2026-05-17

---

## Phase 1: Setup

**Purpose**: Project scaffolding and TypeScript configuration.

- [x] T001 Initialise Node.js project with `package.json` at repository root (`npm init -y`)
- [x] T002 Install TypeScript and configure `tsconfig.json` at repository root (target: ES2022, module: NodeNext, strict: true)
- [x] T003 [P] Install Vitest and configure `vitest.config.ts` at repository root
- [x] T004 [P] Create directory structure: `src/vault/`, `src/keys/`, `src/`, `tests/contract/`

**Checkpoint**: `npx tsc --noEmit` passes with zero errors on an empty project.

---

## Phase 2: Foundational

**Purpose**: Core type definitions and interfaces that every user story depends on.
**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T005 Create `src/vault/types.ts` — define `EntryId` branded type, `EntryAction` union, `MemoryEntryDecrypted` interface, `QueryOptions` interface (from `contracts/MemoryVault.ts`)
- [x] T006 Create `src/keys/KeyManager.ts` — copy `KeyManager` interface from `contracts/KeyManager.ts`
- [x] T007 Create `src/vault/MemoryVault.ts` — copy `MemoryVault` interface from `contracts/MemoryVault.ts`; import types from `src/vault/types.ts`
- [x] T008 Create `src/index.ts` — barrel export for `MemoryVault`, `KeyManager`, `EntryId`, `EntryAction`, `MemoryEntryDecrypted`, `QueryOptions`
- [x] T009 Create `tests/contract/helpers/InMemoryVault.ts` — minimal in-memory test double implementing `MemoryVault` (append-only array, no encryption, deterministic IDs); used by all contract tests
- [x] T010 Create `tests/contract/helpers/StubKeyManager.ts` — stub `KeyManager` that XORs with a fixed byte (round-trippable, deterministic); used by contract tests

**Checkpoint**: `npx tsc --noEmit` passes. Both helpers compile and implement their interfaces without error.

---

## Phase 3: User Story 1 — Store a Memory Entry (P1) 🎯 MVP

**Goal**: A caller can store a content string and receive a unique `EntryId`. The
stored payload is not plaintext. Each successive entry references its predecessor,
forming a chain.

**Independent Test**: Run `npx vitest run tests/contract/append.test.ts` — passes
without any implementation beyond the test double and stub key manager.

### Implementation

- [x] T011 [US1] Create `tests/contract/append.test.ts` — tests: returns non-empty EntryId; successive IDs are unique; entry appears in internal ledger; payload differs from plaintext (encryption invariant via StubKeyManager); chain: second entry's previousId equals first entry's id
- [x] T012 [US1] Extend `tests/contract/helpers/InMemoryVault.ts` `append` method — store entry with encrypted payload (via KeyManager), unique UUIDv4 id, previousId pointing to last entry (null if first), action `'append'`, timestamp
- [x] T013 [US1] Add empty-content guard to `InMemoryVault.append` — throw on empty string; add test case to `append.test.ts`

**Checkpoint**: `npx vitest run tests/contract/append.test.ts` — all tests green.

---

## Phase 4: User Story 2 — Query Memories by Context (P1)

**Goal**: A caller queries with a context string and receives ranked active entries.
Redacted entries do not appear.

**Independent Test**: Run `npx vitest run tests/contract/query.test.ts` — passes
independently of US1 tests (shared test double, separate file).

### Implementation

- [x] T014 [US2] Create `tests/contract/query.test.ts` — tests: query returns active entries; redacted entry absent from results; empty vault returns empty array; query with no matching context returns empty array (not an error)
- [x] T015 [US2] Implement `InMemoryVault.query` — return all active (non-redacted, non-superseded) entries, decrypted via KeyManager; rank by insertion order (recency fallback — semantic ranking is out of scope for the interface spec)

**Checkpoint**: `npx vitest run tests/contract/query.test.ts` — all tests green.

---

## Phase 5: User Story 3 — Amend an Outdated Memory (P2)

**Goal**: A caller amends an entry. The original is preserved in the ledger but
excluded from query results. The amended entry appears in its place.

**Independent Test**: Run `npx vitest run tests/contract/amend.test.ts`.

### Implementation

- [x] T016 [US3] Create `tests/contract/amend.test.ts` — tests: amend returns new EntryId; original excluded from query; amended content appears in query; ledger contains both entries (chain intact); amend on unknown id throws; no orphaned entry created on error
- [x] T017 [US3] Implement `InMemoryVault.amend` — append new entry with action `'amend'`, previousId pointing to original; mark original as superseded in internal index; throw on unknown id

**Checkpoint**: `npx vitest run tests/contract/amend.test.ts` — all tests green.

---

## Phase 6: User Story 4 — Redact a Memory (P2)

**Goal**: A caller redacts an entry. The original is preserved in the ledger but
never returned by query. The chain remains intact — nothing is deleted.

**Independent Test**: Run `npx vitest run tests/contract/redact.test.ts`.

### Implementation

- [x] T018 [US4] Create `tests/contract/redact.test.ts` — tests: redact returns new EntryId; redacted entry absent from all subsequent queries; ledger contains both original and redaction record (no DELETE); redact on unknown id throws; no orphaned record created on error; reason string is accepted (optional)
- [x] T019 [US4] Implement `InMemoryVault.redact` — append new entry with action `'redact'`, previousId pointing to original; mark original as redacted in internal index; throw on unknown id; accept optional reason string

**Checkpoint**: `npx vitest run tests/contract/redact.test.ts` — all tests green.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T020 [P] Run full contract suite `npx vitest run tests/contract` — all tests green across all four stories
- [x] T021 [P] Verify `npx tsc --noEmit` — zero type errors across `src/` and `tests/`
- [x] T022 Validate constitution compliance per `specs/001-vault-interface/quickstart.md` checklist — confirm no DELETE/UPDATE in InMemoryVault, KeyManager injected by interface, no key material in MemoryVault methods
- [x] T023 [P] Add `scripts` to `package.json`: `"typecheck": "tsc --noEmit"`, `"test:contract": "vitest run tests/contract"`, `"test": "vitest run"`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **blocks all user stories**
- **US1 (Phase 3)**: Depends on Foundational — no story dependencies
- **US2 (Phase 4)**: Depends on Foundational — no story dependencies; can run parallel with US1
- **US3 (Phase 5)**: Depends on Foundational — no story dependencies; can run parallel
- **US4 (Phase 6)**: Depends on Foundational — no story dependencies; can run parallel
- **Polish (Phase 7)**: Depends on all story phases complete

### Parallel Opportunities

```bash
# Phase 1 — run in parallel
T002 Configure tsconfig.json
T003 Install Vitest
T004 Create directory structure

# Phase 2 — run in parallel once T001 complete
T005 src/vault/types.ts
T006 src/keys/KeyManager.ts
T007 src/vault/MemoryVault.ts
T009 tests/contract/helpers/InMemoryVault.ts
T010 tests/contract/helpers/StubKeyManager.ts

# Phase 3-6 — all story phases can run in parallel once Phase 2 is complete
Phase 3 (US1) ─┐
Phase 4 (US2) ─┤ all independent
Phase 5 (US3) ─┤
Phase 6 (US4) ─┘
```

---

## Implementation Strategy

### MVP First (US1 only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 (append)
4. **STOP and VALIDATE**: `npx vitest run tests/contract/append.test.ts` passes
5. The interface contract for `append` is proven — `002-key-custody` and `003-sqlite-vault` can begin

### Full Interface Contract

After MVP: add US2 → US3 → US4 (or all in parallel). Each story is independently
testable and independently completable. Full suite passes before closing this spec.

---

## Notes

- `[P]` tasks have no file conflicts and can run in parallel
- `[USn]` label maps each task to its user story for traceability
- Test double (`InMemoryVault`) and stub (`StubKeyManager`) are spec artifacts — not
  production code. They live in `tests/contract/helpers/` only.
- This feature produces no production implementation. `SqliteVault` is `003-sqlite-vault`.
- Commit after each checkpoint.
