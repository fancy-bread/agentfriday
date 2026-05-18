---
description: "Task list for key custody implementation"
---

# Tasks: Key Custody

**Input**: Design documents from `specs/002-key-custody/`
**Branch**: `002-key-custody`
**Date**: 2026-05-17

---

## Phase 1: Setup

**Purpose**: Install new dependencies required for key custody.

- [ ] T001 Install `libsodium-wrappers @types/libsodium-wrappers node-keytar commander` via npm in repository root
- [ ] T002 Create directory `src/cli/` and `tests/unit/` in repository root
- [ ] T003 Add `"test:unit": "vitest run tests/unit"` to `scripts` in `package.json`

**Checkpoint**: `npm install` succeeds; `npx tsc --noEmit` still clean.

---

## Phase 2: Foundational

**Purpose**: Core cryptographic implementation shared by all user stories.
**⚠️ CRITICAL**: All user story work depends on this phase.

- [ ] T004 Extend `src/keys/KeyManager.ts` — add `KeyManagerWithMeta` interface that extends `KeyManager` with `storageType(): 'keychain' | 'software'`; update `src/index.ts` barrel to export it
- [ ] T005 Create `src/keys/crypto.ts` — libsodium helpers: `initSodium()` (call once on startup), `generateKeypair()` → `{ signingKey, signingPub, encryptionKey, encryptionPub }`, `deriveSymmetricKey(encryptionKey)` → Uint8Array via HKDF-SHA256, `fingerprint(publicKey)` → colon-separated hex of first 16 bytes of SHA-256
- [ ] T006 Create `src/keys/SoftwareKeyManager.ts` — full `KeyManagerWithMeta` implementation: `generate()`, `load()`, `delete()`, `exists()` (file at `~/.agent-friday/keys/keypair`, permissions 0600); `encrypt()` (XSalsa20-Poly1305, random 24-byte nonce prepended); `decrypt()`; `sign()` (Ed25519); `publicKey()`; `storageType()` returns `'software'`
- [ ] T007 Create `src/keys/KeychainKeyManager.ts` — macOS Keychain-backed `KeyManagerWithMeta`: `generate()`, `load()`, `delete()`, `exists()` using `node-keytar` with service `io.agentfriday.vault` account `keypair`; crypto operations delegate to same libsodium helpers as `SoftwareKeyManager`; `storageType()` returns `'keychain'`
- [ ] T008 Create `src/keys/platform.ts` — `resolveKeyManager()`: returns `KeychainKeyManager` if `process.platform === 'darwin'` and `node-keytar` is available, otherwise `SoftwareKeyManager`

**Checkpoint**: `npx tsc --noEmit` passes. `SoftwareKeyManager` and `KeychainKeyManager` both satisfy `KeyManagerWithMeta` at compile time.

---

## Phase 3: User Story 1 — First-Time Vault Initialisation (P1) 🎯 MVP

**Goal**: `npx agent-friday init` generates a keypair, stores it, creates the vault
database stub, prints the fingerprint and recovery warning, and exits 0. Running it
a second time exits 1 without modifying the existing key.

**Independent Test**: Run `npx vitest run tests/unit/init.test.ts` — covers happy
path, second-run abort, and rollback on vault creation failure. No macOS Keychain
required (uses `SoftwareKeyManager`).

- [ ] T009 [US1] Create `src/cli/init.ts` — `runInit(options?)`: (1) resolve key manager via `platform.ts`; (2) abort if key exists; (3) call `generate()`; (4) create `~/.agent-friday/vault.db` placeholder (empty file — schema added in `003-sqlite-vault`); (5) on vault failure: call `delete()` then throw; (6) print fingerprint + storage type + vault path + recovery warning; return `InitResult`
- [ ] T010 [US1] Create `src/cli/index.ts` — commander entry point: `agent-friday init [--vault-path <path>]`, `agent-friday status`, `agent-friday start` (start is a stub — implemented in `004-mcp-server`); wire to `runInit` and `runStatus`
- [ ] T011 [US1] Add `"bin": { "agent-friday": "dist/cli/index.js" }` to `package.json`
- [ ] T012 [US1] Create `tests/unit/init.test.ts` — tests using `SoftwareKeyManager`: init succeeds and returns fingerprint; init aborts if key exists (no overwrite); vault file is created on success; rollback: if vault creation fails the key is removed; key material never appears in captured stdout

**Checkpoint**: `npx vitest run tests/unit/init.test.ts` — all tests green.

---

## Phase 4: User Story 2 — Daemon Loads Key on Start (P2)

**Goal**: The daemon start path loads the key from storage. If no key exists, it
exits non-zero with a message directing the user to `init`.

**Independent Test**: Run `npx vitest run tests/unit/start.test.ts`.

- [ ] T013 [US2] Create `src/cli/start.ts` — `loadKeyOrAbort()`: calls `resolveKeyManager().load()`; on error prints "Error: key not found. Run `agent-friday init` to set up your vault." and `process.exit(1)`; returns loaded `KeyManagerWithMeta` for use by the MCP server (wired in `004-mcp-server`)
- [ ] T014 [US2] Create `tests/unit/start.test.ts` — tests: valid key loads successfully; missing key exits with non-zero code and correct message; no key is generated on failure

**Checkpoint**: `npx vitest run tests/unit/start.test.ts` — all tests green.

---

## Phase 5: User Story 3 — Encrypt / Decrypt Round-Trip (P1)

**Goal**: Data encrypted with `SoftwareKeyManager.encrypt()` decrypts back to the
original exactly. Ciphertext differs from plaintext. Wrong-key decryption fails.

**Independent Test**: Run `npx vitest run tests/unit/crypto.test.ts`.

- [ ] T015 [US3] Create `tests/unit/crypto.test.ts` — tests against `SoftwareKeyManager`: encrypt → decrypt returns original; ciphertext ≠ plaintext; two encryptions of same input produce different ciphertexts (random nonce); decrypt with wrong key throws; empty plaintext is handled without error

**Checkpoint**: `npx vitest run tests/unit/crypto.test.ts` — all tests green.

---

## Phase 6: User Story 4 — Sign and Verify (P2)

**Goal**: `sign()` returns a non-empty signature. Signature verifies against the
original data and public key. Verification fails against modified data.

**Independent Test**: Run `npx vitest run tests/unit/sign.test.ts`.

- [ ] T016 [US4] Create `tests/unit/sign.test.ts` — tests: `sign()` returns non-empty Uint8Array; signature verifies with `libsodium.crypto_sign_verify_detached(sig, msg, pub)`; modified message fails verification; `publicKey()` is stable across calls

**Checkpoint**: `npx vitest run tests/unit/sign.test.ts` — all tests green.

---

## Phase 7: User Story 5 — Status Reports Key Health (P2)

**Goal**: `npx agent-friday status` prints fingerprint, storage type, vault path, and
chain status. Exits 0 if key is accessible, 1 if not.

**Independent Test**: Run `npx vitest run tests/unit/status.test.ts`.

- [ ] T017 [US5] Create `src/cli/status.ts` — `runStatus()`: load key manager; if key missing set `keyAccessible: false` and exit 1; check vault.db exists for `chainIntact`; print formatted status table; return `StatusResult`
- [ ] T018 [US5] Create `tests/unit/status.test.ts` — tests: valid key prints fingerprint and exits 0; missing key exits 1 with error message; storage type reported correctly; chain reported intact when vault.db exists

**Checkpoint**: `npx vitest run tests/unit/status.test.ts` — all tests green.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T019 [P] Run full unit suite `npm run test:unit` — all tests green across all stories
- [ ] T020 [P] Run `npm run typecheck` — zero errors
- [ ] T021 [P] Run `npm run test:contract` — 001-vault-interface contract tests still pass (no regression)
- [ ] T022 Verify constitution compliance per `specs/002-key-custody/quickstart.md` checklist — no key material in stdout/logs; both managers satisfy `KeyManagerWithMeta`; init rolls back on vault failure; start aborts without generating key
- [ ] T023 [P] Update `src/index.ts` — add exports for `SoftwareKeyManager`, `KeychainKeyManager`, `KeyManagerWithMeta`, `resolveKeyManager`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **blocks all user stories**
- **US1 — Init (Phase 3)**: Depends on Foundational; no story dependencies — 🎯 MVP
- **US2 — Start (Phase 4)**: Depends on Foundational; no story dependencies; can run parallel with US1
- **US3 — Encrypt (Phase 5)**: Depends on Foundational; no story dependencies; can run parallel
- **US4 — Sign (Phase 6)**: Depends on Foundational; no story dependencies; can run parallel
- **US5 — Status (Phase 7)**: Depends on US2 (`loadKeyOrAbort` from `start.ts`); otherwise independent
- **Polish (Phase 8)**: Depends on all story phases complete

### Parallel Opportunities

```bash
# Phase 2 — run in parallel once T001 complete
T005 src/keys/crypto.ts
T006 src/keys/SoftwareKeyManager.ts
T007 src/keys/KeychainKeyManager.ts   # can start once T005 exists

# Phase 3-6 — all can run in parallel once Phase 2 is complete
Phase 3 (US1 — init)     ─┐
Phase 4 (US2 — start)    ─┤ all independent
Phase 5 (US3 — encrypt)  ─┤
Phase 6 (US4 — sign)     ─┘

# Phase 7 (US5 — status) runs after Phase 4 (needs loadKeyOrAbort)
```

---

## Implementation Strategy

### MVP (US1 only — init command)

1. Phase 1: Install dependencies
2. Phase 2: Foundational (SoftwareKeyManager + crypto helpers)
3. Phase 3: Init command + tests
4. **STOP and VALIDATE**: `npm run test:unit` passes; manually verify `npx agent-friday init` prints fingerprint

### Full Key Custody

After MVP: Phase 4 → Phase 5 → Phase 6 → Phase 7 in parallel, then Phase 8 polish.

---

## Notes

- `[P]` tasks have no file conflicts — run in parallel
- `[USn]` label maps each task to its user story
- `KeychainKeyManager` is implemented (T007) but only used at runtime on macOS — all
  unit tests use `SoftwareKeyManager` so CI passes on Linux (GitHub Actions)
- The vault.db created by `init` in this spec is an empty placeholder — the real
  schema is added in `003-sqlite-vault`
- Commit after each checkpoint
