# Feature Specification: Key Custody

**Feature Branch**: `002-key-custody`
**Created**: 2026-05-17
**Status**: Draft

## User Scenarios & Testing

### User Story 1 — First-Time Vault Initialisation (Priority: P1)

A user sets up Agent Friday for the first time by running `init`. A cryptographic
keypair is generated and stored in secure hardware-backed storage on the device. A
vault database is created. The user is shown their public key fingerprint and a
clear warning that the key is unrecoverable if lost.

**Why this priority**: Nothing else can work until the key exists. `init` is the
entry point for the entire product. Its correctness and safety are the foundation
of the trust story.

**Independent Test**: Running `init` on a machine with no existing key produces a
key in secure storage, creates the vault database, prints a fingerprint, and exits
with code 0. Running it again without removing the key aborts with a clear error
and does not overwrite the existing key.

**Acceptance Scenarios**:

1. **Given** no existing key on the device, **When** the user runs `init`, **Then**
   a keypair is generated, stored in device-local secure storage, and the public key
   fingerprint is printed to stdout.
2. **Given** `init` has completed, **When** the user runs `init` again, **Then** the
   command aborts with a clear error message and the original key is unchanged.
3. **Given** `init` has completed, **When** the vault database location is inspected,
   **Then** the database file exists and contains no plaintext content.
4. **Given** `init` has completed, **When** the user runs `status`, **Then** the
   fingerprint shown matches the one printed during `init`.

---

### User Story 2 — Daemon Loads Key on Start (Priority: P1)

The daemon loads the key from secure storage when it starts. If no key is found,
it aborts with a message directing the user to run `init` first. Under no
circumstances does it generate a key silently.

**Why this priority**: Every vault operation (encrypt, decrypt, sign) depends on
the key being available. Silent key generation on start would create a second key
on a machine where the first was deleted, silently breaking the chain of trust.

**Independent Test**: Starting the daemon with a valid key succeeds. Starting it
with no key produces an error directing the user to `init`, and exits non-zero.

**Acceptance Scenarios**:

1. **Given** a key exists in secure storage, **When** the daemon starts, **Then**
   the key is loaded and the daemon is ready to serve requests.
2. **Given** no key exists, **When** the daemon starts, **Then** the daemon aborts
   with an error message that explicitly directs the user to run `init`.
3. **Given** no key exists, **When** the daemon starts, **Then** no key is generated
   silently — the key store is unchanged after the failed start.

---

### User Story 3 — Encrypt / Decrypt Round-Trip (Priority: P1)

Any data encrypted using the loaded key can be decrypted back to the original
content using the same key. Ciphertext produced by encryption is not equal to the
original plaintext.

**Why this priority**: Every memory write depends on encryption; every memory read
depends on decryption. A broken round-trip makes the vault unusable.

**Independent Test**: Encrypt an arbitrary byte sequence, decrypt the result, and
confirm the output equals the original. Confirm the ciphertext is distinct from the
plaintext.

**Acceptance Scenarios**:

1. **Given** a loaded key, **When** plaintext bytes are encrypted then decrypted,
   **Then** the output equals the original input exactly.
2. **Given** a loaded key, **When** plaintext bytes are encrypted, **Then** the
   ciphertext is not equal to the plaintext.
3. **Given** a different key, **When** ciphertext is decrypted, **Then** decryption
   fails with an error — it does not return garbage data silently.

---

### User Story 4 — Sign and Verify (Priority: P2)

The key manager can sign a byte sequence with the user's private key. The resulting
signature, combined with the signed data, can be used to verify authenticity. This
underpins chain integrity for every ledger entry.

**Why this priority**: Signatures form the tamper-evidence chain. Without them,
the append-only ledger cannot prove its history is intact.

**Independent Test**: Sign a byte sequence, verify the signature against the same
data and the public key — verification passes. Verify against modified data —
verification fails.

**Acceptance Scenarios**:

1. **Given** a loaded key, **When** a byte sequence is signed, **Then** a non-empty
   signature is returned.
2. **Given** a signature, **When** it is verified against the original data and the
   public key, **Then** verification succeeds.
3. **Given** a signature, **When** it is verified against modified data, **Then**
   verification fails.

---

### User Story 5 — Status Reports Key Health (Priority: P2)

Running `status` shows the user their key fingerprint, the storage type (hardware-
backed or software), vault location, and whether the key is accessible. The command
exits non-zero if the key cannot be loaded.

**Why this priority**: Users need a way to verify their vault is correctly set up
without needing to run the full daemon. This is the primary trust signal after
`init`.

**Independent Test**: After `init`, `status` exits 0 and prints the fingerprint.
With no key present, `status` exits non-zero and reports the problem clearly.

**Acceptance Scenarios**:

1. **Given** a valid key, **When** the user runs `status`, **Then** the output
   includes the public key fingerprint and the storage type.
2. **Given** no key, **When** the user runs `status`, **Then** the command exits
   non-zero and the output says the key is missing.
3. **Given** a valid key, **When** the user runs `status`, **Then** the exit code
   is 0.

---

### Edge Cases

- What if secure hardware storage is unavailable (non-M-series Mac, Linux)?
  The system falls back to a software key stored in a protected file. The status
  output must indicate that hardware backing is not in use.
- What if the vault database cannot be created during `init` (permissions error)?
  `init` must abort before generating the key — do not leave a key without a vault.
- What if the key store is corrupt or the key cannot be read?
  The daemon and `status` must fail clearly with a diagnostic message, not silently
  return a wrong key.
- What if `init` is interrupted mid-way?
  A partial `init` must leave the system in a safe state — either fully initialised
  or fully clean, not partially set up with a key but no vault or vice versa.

## Requirements

### Functional Requirements

- **FR-001**: The `init` command MUST generate a keypair and store it in device-local
  secure storage on first run.
- **FR-002**: The `init` command MUST abort without modifying any state if a key
  already exists in secure storage.
- **FR-003**: The `init` command MUST print the public key fingerprint and a recovery
  warning to stdout on successful completion.
- **FR-004**: The `init` command MUST create the vault database as part of
  initialisation; if database creation fails, key generation MUST NOT proceed.
- **FR-005**: The daemon's `start` command MUST load the key from secure storage on
  startup; it MUST NOT generate a key silently.
- **FR-006**: The daemon MUST abort startup and exit non-zero if no key is found,
  directing the user to run `init`.
- **FR-007**: The key manager MUST encrypt plaintext such that the ciphertext is
  unreadable without the key.
- **FR-008**: The key manager MUST decrypt ciphertext produced by its own `encrypt`
  operation and return the original plaintext exactly.
- **FR-009**: Decryption of ciphertext with the wrong key MUST fail with an error,
  not return malformed data.
- **FR-010**: The key manager MUST sign byte sequences with the private key and
  return a verifiable signature.
- **FR-011**: The `status` command MUST display the public key fingerprint, storage
  type (hardware-backed or software), vault path, and key accessibility.
- **FR-012**: The `status` command MUST exit non-zero if the key is missing or
  inaccessible.
- **FR-013**: Key material MUST NOT be written to any log, stdout, or file outside
  secure storage at any point.

### Key Entities

- **KeyPair**: The user's cryptographic identity — a private key for signing and
  encryption, and a corresponding public key for verification and identity.
- **PublicKeyFingerprint**: A short, human-readable digest of the public key used
  to identify the vault without exposing key material.
- **SecureKeyStore**: The device-local storage facility that holds the private key.
  Hardware-backed where available; software-protected file as fallback.
- **VaultDatabase**: The encrypted storage file created during `init`. Its existence
  confirms the vault has been initialised.

## Success Criteria

- **SC-001**: A user can complete `init` in under 10 seconds on a standard developer
  machine.
- **SC-002**: After `init`, 100% of encrypt → decrypt round-trips return the
  original plaintext exactly.
- **SC-003**: Running `init` a second time without removing the key produces an
  error in 100% of cases — the original key is never silently overwritten.
- **SC-004**: The public key fingerprint shown by `init` and `status` matches in
  100% of cases.
- **SC-005**: Attempting to start the daemon with no key results in a non-zero exit
  and a human-readable error in 100% of cases — no silent key generation occurs.
- **SC-006**: Key material never appears in any log output, stdout, or file path
  outside secure storage — verifiable by audit of all output paths.

## Assumptions

- The primary target platform for v1 is macOS. Hardware-backed key storage
  (Secure Enclave) is available on M-series Macs; Intel Macs and non-macOS systems
  use a software fallback.
- The user runs `init` once per device. Cross-device key sharing is out of scope
  for v1.
- Key recovery (if the key is lost) is out of scope for v1. The recovery warning
  shown by `init` is the only mitigation.
- The `KeyManager` interface is defined in `specs/001-vault-interface`. This spec
  covers the implementation of that interface and the CLI commands that manage the
  key lifecycle.
- The vault database format is defined in `specs/003-sqlite-vault`. This spec only
  covers creation of the database file during `init`, not its schema.
