# Implementation Plan: Key Custody

**Branch**: `002-key-custody` | **Date**: 2026-05-17 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/002-key-custody/spec.md`

## Summary

Implement the `KeyManager` interface (defined in `001-vault-interface`) with two
concrete backends — `KeychainKeyManager` for macOS (keys stored in macOS Keychain
via `node-keytar`) and `SoftwareKeyManager` for non-macOS or fallback. Implement
the `init` and `status` CLI commands that manage the key lifecycle. All cryptographic
operations use `libsodium-wrappers`.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 24 LTS
**Primary Dependencies**: `libsodium-wrappers`, `@types/libsodium-wrappers`, `node-keytar`, `commander`
**Storage**: macOS Keychain under `io.agentfriday.vault` (primary); `~/.agent-friday/keys/` at 0600 (fallback)
**Testing**: Vitest — unit tests against `SoftwareKeyManager` only; Keychain
tests require macOS and are tagged for manual / CI-macOS execution
**Target Platform**: macOS primary; Linux/Windows via software fallback
**Project Type**: TypeScript library + CLI
**Performance Goals**: `init` under 10 seconds; key load on `start` under 1 second
**Constraints**: Key material MUST NOT appear in logs, stdout, or any file outside
secure storage. `init` MUST be atomic — fully complete or fully rolled back.
**Scale/Scope**: Single-user, single-device, single keypair per vault

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Gate | Applies | Status | Notes |
|------|---------|--------|-------|
| Principle I — Append-only | ❌ No | N/A | Key custody does not touch the ledger |
| Principle II — Encrypt before write | ✅ Yes | ✅ Pass | This feature IS the encryption machinery |
| Principle III — Keys never leave device | ✅ Yes | ✅ Pass | This feature IS the enforcement point |
| Principle IV — Interface over implementation | ✅ Yes | ✅ Pass | Both implementations satisfy `KeyManager`; callers see only the interface |
| Principle V — Spec before code | ✅ Yes | ✅ Pass | spec.md complete and validated |

**No violations. Proceeding.**

## Project Structure

### Documentation (this feature)

```text
specs/002-key-custody/
├── plan.md
├── research.md
├── data-model.md
├── contracts/
│   ├── KeychainKeyManager.ts
│   ├── SoftwareKeyManager.ts
│   └── cli.ts
├── quickstart.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── vault/                        ← (unchanged from 001)
├── keys/
│   ├── KeyManager.ts             ← (unchanged from 001)
│   ├── KeychainKeyManager.ts     ← new: macOS Keychain-backed implementation
│   └── SoftwareKeyManager.ts     ← new: file-based fallback implementation
├── cli/
│   ├── init.ts                   ← new: init command
│   └── status.ts                 ← new: status command
└── index.ts                      ← updated: export new implementations

tests/
├── contract/                     ← (unchanged from 001)
└── unit/
    ├── SoftwareKeyManager.test.ts
    └── init.test.ts
```

**Structure Decision**: Single project. New key implementations in `src/keys/`;
CLI commands in `src/cli/`. Unit tests use `SoftwareKeyManager` only — no macOS
Keychain required in CI. Keychain behaviour is verified manually on macOS.

## Complexity Tracking

> No constitution violations to justify.

**Init atomicity**: Key is stored in Keychain first, vault file created second.
If vault creation fails, key is removed from Keychain. This ordering means a
failed `init` leaves no key behind — the clean state is always recoverable by
re-running `init`.
