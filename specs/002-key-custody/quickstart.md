# Quickstart: Key Custody

---

## First-time setup

```bash
npx agent-friday init
```

Expected output:
```
Agent Friday initialised.
Public key: ab:cd:ef:01:23:45:67:89:ab:cd:ef:01:23:45:67:89
Storage:    Keychain (software-protected)
Vault:      /Users/<you>/.agent-friday/vault.db

WARNING: If this key is lost, your memories cannot be recovered.
```

Running `init` a second time without removing the key:
```
Error: vault already initialised. Run `agent-friday status` to verify.
```
Exit code: 1.

---

## Health check

```bash
npx agent-friday status
```

Expected output (key present):
```
Agent Friday
────────────────────────────────
Key          ab:cd:ef:01:23:45:67:89:ab:cd:ef:01:23:45:67:89
Key storage  Keychain (software-protected)
Vault        /Users/<you>/.agent-friday/vault.db
Chain        ✓ intact
```
Exit code: 0.

Expected output (key missing):
```
Error: key not found. Run `agent-friday init` to set up your vault.
```
Exit code: 1.

---

## Running unit tests (no macOS required)

```bash
npm run test:unit
```

The unit test suite covers `SoftwareKeyManager` — all crypto operations, round-trips,
error cases, and the `init` command logic. No macOS Keychain dependency.

```bash
npm run test:contract   # 001-vault-interface contract tests (unchanged)
npm run test            # full suite
```

---

## Implementing a new KeyManager backend

1. Implement `KeyManagerWithMeta` from `contracts/KeychainKeyManager.ts`
2. Provide static `load()`, `generate()`, `delete()`, `exists()` methods
3. Implement `encrypt()`, `decrypt()`, `sign()`, `publicKey()` using libsodium
4. Return a meaningful `storageType()` string for status reporting
5. Wire it into the platform detection in `src/cli/init.ts`

---

## Constitution check (for implementers)

Before submitting:
- [ ] Key material never appears in any log, console.log, or error message (Principle III)
- [ ] Both `KeychainKeyManager` and `SoftwareKeyManager` satisfy the `KeyManager` interface from `001-vault-interface` — no caller imports the concrete class directly (Principle IV)
- [ ] `init` rolls back the Keychain entry if vault creation fails — verify with a test that mocks vault creation failure (Principle III)
- [ ] `start` aborts without generating a key if none is found — verify with a test (Principle III)
