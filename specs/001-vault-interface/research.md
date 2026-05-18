# Research: Vault Interface

**Phase**: 0 | **Date**: 2026-05-17 | **Feature**: [spec.md](spec.md)

All design decisions for this feature were pre-resolved in the TDD
(`specs/000-agent-friday-core/tdd.md`). This document records the rationale.

---

## Decision 1: Single `MemoryVault` interface for all four operations

**Decision**: All vault operations (`append`, `query`, `amend`, `redact`) live on
one interface rather than being split (e.g., a read interface and a write interface).

**Rationale**: The operations form a coherent whole — amend and redact both require
reading to resolve an ID before writing. Splitting them adds indirection with no
benefit at v1 scale (single caller, single vault instance).

**Alternatives considered**:
- Command/Query separation (CQRS) — rejected; premature for a single-user local
  service with four operations.

---

## Decision 2: `KeyManager` as a separate interface composed into the vault

**Decision**: Cryptographic operations (encrypt, decrypt, sign, publicKey) live on a
`KeyManager` interface, injected into the vault at construction, not baked into
`MemoryVault`.

**Rationale**: Separation of concerns — the vault owns ledger semantics, the key
manager owns cryptography. This makes each independently testable and makes it
possible to swap key backends (Secure Enclave vs. software) without touching vault
logic.

**Alternatives considered**:
- Vault handles encryption internally — rejected; makes the vault untestable without
  a real key backend and violates Principle IV (implementation leaking into interface).

---

## Decision 3: `MemoryEntry` vs `MemoryEntryDecrypted` as separate types

**Decision**: Two distinct types — one for the on-disk encrypted form, one for the
in-process decrypted view. The vault interface returns `MemoryEntryDecrypted[]` from
`query`; callers never handle raw encrypted payloads.

**Rationale**: Prevents callers from accidentally operating on ciphertext. Makes the
encryption boundary explicit in the type system.

**Alternatives considered**:
- Single type with optional fields — rejected; a `payload?: Uint8Array` alongside
  `content?: string` is confusing and fails to encode the invariant statically.

---

## Decision 4: `EntryId` as a branded string type

**Decision**: `EntryId` is a branded TypeScript type (opaque string alias) rather
than a raw `string`.

**Rationale**: Prevents callers from constructing arbitrary IDs or accidentally
passing a non-ID string to `amend`/`redact`. The type system enforces that IDs come
from the vault.

**Alternatives considered**:
- Plain `string` — rejected; too permissive, no static safety at call sites.
- `UUID` class — rejected; adds a runtime dependency for a type-level concern.

---

## Decision 5: Contract tests use an in-memory test double, not SqliteVault

**Decision**: The `tests/contract/MemoryVault.contract.test.ts` suite runs against a
minimal in-memory implementation of `MemoryVault`, not the real `SqliteVault`.

**Rationale**: This spec defines the interface, not the implementation. Contract
tests must prove the interface is well-formed and that any conforming implementation
will satisfy the spec. SqliteVault conformance is tested in `003-sqlite-vault`.

**Alternatives considered**:
- Test against SqliteVault directly — rejected; conflates interface verification
  with implementation testing, and creates a circular dependency between specs.
