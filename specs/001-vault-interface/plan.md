# Implementation Plan: Vault Interface

**Branch**: `001-vault-interface` | **Date**: 2026-05-17 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/001-vault-interface/spec.md`

## Summary

Define the `MemoryVault` and `KeyManager` TypeScript interfaces and their associated
types. This feature produces contracts only — no implementation. Every downstream
feature (`002-key-custody`, `003-sqlite-vault`, `004-mcp-server`) depends on these
types being locked before implementation begins.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 24 LTS
**Primary Dependencies**: None — interface definitions have no runtime dependencies
**Storage**: N/A (interface only; implementation in `003-sqlite-vault`)
**Testing**: Vitest — contract tests using a test double that implements `MemoryVault`
**Target Platform**: Node.js local daemon (macOS primary, Linux/Windows fallback)
**Project Type**: TypeScript library (type definitions + interface contracts)
**Performance Goals**: N/A for interface definition; correctness is the only goal
**Constraints**: Interface MUST NOT expose implementation details (no SQLite types,
no Keychain types, no libsodium types in the public contract)
**Scale/Scope**: Single-user local service; concurrency correctness required,
extreme throughput is not a v1 concern

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Gate | Applies | Status | Notes |
|------|---------|--------|-------|
| Principle I — Append-only | ✅ Yes | ✅ Pass | Interface enforces append-only by design: no delete or update method exposed |
| Principle II — Encrypt before write | Partial | ✅ Pass | Interface delegates to KeyManager; plaintext never reaches vault methods directly |
| Principle III — Keys never leave device | ❌ No | N/A | No key material in interface layer |
| Principle IV — Interface over implementation | ✅ Yes | ✅ Pass | This feature IS the interface; no implementation details permitted |
| Principle V — Spec before code | ✅ Yes | ✅ Pass | spec.md complete and validated |

**No violations. Proceeding.**

## Project Structure

### Documentation (this feature)

```text
specs/001-vault-interface/
├── plan.md              ← this file
├── research.md          ← Phase 0: decisions and rationale
├── data-model.md        ← Phase 1: types and entities
├── contracts/
│   ├── MemoryVault.ts   ← Phase 1: interface definition
│   └── KeyManager.ts    ← Phase 1: interface definition
├── quickstart.md        ← Phase 1: how to implement and test the interface
├── checklists/
│   └── requirements.md  ← validation checklist (complete)
└── tasks.md             ← Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── vault/
│   ├── MemoryVault.ts        ← MemoryVault interface
│   └── types.ts              ← MemoryEntry, MemoryEntryDecrypted, EntryId
├── keys/
│   └── KeyManager.ts         ← KeyManager interface
└── index.ts                  ← barrel exports

tests/
└── contract/
    └── MemoryVault.contract.test.ts  ← contract tests via test double
```

**Structure Decision**: Single project at repository root. Interface definitions
live in `src/vault/` and `src/keys/`. Contract tests in `tests/contract/` use a
minimal in-memory test double — not SqliteVault — to verify the interface contract
independently of the v1 implementation.

## Complexity Tracking

> No constitution violations to justify.
