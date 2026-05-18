# Research: Key Custody

**Phase**: 0 | **Date**: 2026-05-17 | **Feature**: [spec.md](spec.md)

---

## Decision 1: Cryptographic library — `libsodium-wrappers`

**Decision**: Use `libsodium-wrappers` (the WebAssembly build of libsodium) for all
cryptographic operations: Ed25519 key generation, signing, X25519 key exchange,
HKDF-SHA256 key derivation, and XSalsa20-Poly1305 authenticated encryption.

**Rationale**: libsodium is the reference implementation for modern symmetric and
asymmetric cryptography in the Node.js ecosystem. The WASM build (`libsodium-wrappers`)
requires no native compilation, works on all platforms, and is actively maintained.
The higher-level `libsodium-wrappers-sumo` variant is not needed — the standard
build includes all operations required by Agent Friday.

**Alternatives considered**:
- Node.js built-in `crypto` — lacks Ed25519 key generation convenience APIs and
  HKDF is not ergonomic for our use case.
- `tweetnacl` — smaller but less actively maintained and missing HKDF.
- `@noble/curves` + `@noble/ciphers` — excellent but more assembly required;
  libsodium provides the same primitives in one package.

---

## Decision 2: Keychain access — `node-keytar`

**Decision**: Use `node-keytar` for macOS Keychain read/write. Service name:
`io.agentfriday.vault`. Account name: `keypair`.

**Rationale**: `node-keytar` is the standard Node.js library for OS-level secret
storage (macOS Keychain, Linux Secret Service, Windows Credential Manager). It is
used by VS Code for credential storage. The API is straightforward: `setPassword` /
`getPassword` / `deletePassword`. Key bytes are stored as a base64-encoded string.

**Important distinction — Keychain vs. Secure Enclave**: `node-keytar` stores key
material in the macOS Keychain, which is protected by macOS ACLs but the bytes are
technically exportable by the OS. True Secure Enclave keys are generated inside the
secure hardware and are never exportable — but generating them from Node.js requires
a native module that wraps the macOS Security framework's
`kSecAttrTokenIDSecureEnclave` API. This native module is out of scope for v1.
`status` reports "Keychain (software-protected)" rather than "Secure Enclave" to
be accurate. The v1 privacy guarantee is that key material never leaves the device,
not that it is hardware-non-extractable.

**Alternatives considered**:
- `@vscode/keytar` — VS Code's fork, identical API, slightly more maintained; worth
  revisiting if `node-keytar` is deprecated.
- macOS `security` CLI via `child_process` — avoids the native module but is brittle
  and requires shell escaping of key material (security risk).
- Custom native binding for Secure Enclave — correct long-term goal; deferred to v2.

---

## Decision 3: Software fallback — file at `~/.agent-friday/keys/keypair` with 0600

**Decision**: On non-macOS, or as a fallback, store the serialised keypair as a
single file at `~/.agent-friday/keys/keypair` with Unix permissions 0600. The file
contains the libsodium keypair bytes encoded as base64 JSON.

**Rationale**: The simplest possible fallback that prevents casual access. Not
equivalent to Keychain security, but acceptable for v1 on platforms where Keychain
is unavailable. `status` reports "software key (file-protected)" to be honest with
the user about the reduced security posture.

**Alternatives considered**:
- Linux Secret Service via `node-keytar` — available on Linux but requires
  `libsecret` to be installed; not reliable enough to mandate.
- Windows Credential Manager via `node-keytar` — valid v1 extension; deferred.

---

## Decision 4: CLI framework — `commander`

**Decision**: Use `commander` for CLI argument parsing. Commands: `init`, `status`,
`start` (start is implemented in `004-mcp-server`; `init` and `status` are
implemented here).

**Rationale**: `commander` is the most widely used Node.js CLI framework, has full
TypeScript support, and is the right weight for a small command set. No complex
sub-command routing is needed.

**Alternatives considered**:
- `yargs` — heavier, better for complex CLIs with many flags.
- Raw `process.argv` — sufficient but adds parsing boilerplate for no benefit.

---

## Decision 5: Init atomicity — key first, vault second, rollback on failure

**Decision**: The `init` command follows this order:
1. Verify no key exists (abort if found)
2. Generate keypair in memory
3. Store key in Keychain (or file)
4. Create vault database file (empty placeholder for `003-sqlite-vault`)
5. If step 4 fails → delete key from Keychain → exit non-zero
6. Print fingerprint + recovery warning

**Rationale**: Storing the key before the vault means a failure at step 4 leaves
only the key behind — which `deletePassword` can cleanly remove. The reverse order
(vault first) would leave an empty vault with no key, which is harder to detect and
recover from. Either way, a failed `init` is recoverable by re-running `init` after
cleanup; the rollback makes that automatic.

**Alternatives considered**:
- Vault first, key second — rejected; harder rollback.
- Two-phase with a lock file — over-engineered for a single-user CLI.

---

## Decision 6: Public key fingerprint format — hex-encoded SHA-256 prefix

**Decision**: Fingerprint is the first 16 bytes of SHA-256(publicKey) displayed as
8 colon-separated hex pairs (e.g., `ab:cd:ef:01:23:45:67:89:ab:cd:ef:01:23:45:67:89`).

**Rationale**: Follows the SSH public key fingerprint convention. Short enough to
compare visually; derived from the public key so it is stable and reproducible.

**Alternatives considered**:
- Full SHA-256 hex — too long for visual comparison.
- Base58 encoding — less familiar outside crypto wallets.
