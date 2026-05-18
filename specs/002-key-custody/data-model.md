# Data Model: Key Custody

**Phase**: 1 | **Date**: 2026-05-17 | **Feature**: [spec.md](spec.md)

---

## Entities

### KeyPair (in-memory only, never persisted as a unit)

The user's cryptographic identity. Generated once by `init`, loaded from storage
by `start` and `status`. Never logged or serialised to stdout.

```
KeyPair
  signingKey:    Uint8Array   ← Ed25519 private key (64 bytes)
  signingPub:    Uint8Array   ← Ed25519 public key (32 bytes)
  encryptionKey: Uint8Array   ← X25519 private key (32 bytes)
  encryptionPub: Uint8Array   ← X25519 public key (32 bytes)
```

Stored as a single JSON object with base64-encoded fields. In Keychain: one entry
under service `io.agentfriday.vault`, account `keypair`. In the software fallback:
`~/.agent-friday/keys/keypair` at 0600.

---

### PublicKeyFingerprint (derived, display only)

Short identifier derived from the Ed25519 public key. Used by `init` and `status`
to let the user verify they are talking to the same vault instance.

```
PublicKeyFingerprint
  value: string   ← first 16 bytes of SHA-256(signingPub), colon-separated hex
                     e.g. "ab:cd:ef:01:23:45:67:89:ab:cd:ef:01:23:45:67:89"
```

---

### StorageType (enum)

Describes how the key is stored on the current device.

```
StorageType
  'keychain'   ← macOS Keychain via node-keytar
  'software'   ← file at ~/.agent-friday/keys/keypair (0600)
```

Reported by `status` to inform the user of their security posture. Keychain is
preferred; software is the fallback.

---

### InitResult (transient, init command output)

```
InitResult
  fingerprint:  PublicKeyFingerprint
  storageType:  StorageType
  vaultPath:    string          ← absolute path to vault.db
```

Printed to stdout on successful `init`. Not persisted.

---

### StatusResult (transient, status command output)

```
StatusResult
  fingerprint:  PublicKeyFingerprint
  storageType:  StorageType
  vaultPath:    string
  keyAccessible: boolean        ← false if key load fails
```

---

## State Transitions

```
[no key, no vault]
        │
     init ──────────────────────────────────────────────► [key in storage, vault.db exists]
        │                                                           │
   (failure at any point → rollback → back to start)          start / status
                                                                    │
                                                          [KeyPair loaded in memory]
                                                                    │
                                                         encrypt / decrypt / sign
```

`init` is the only state transition that creates persistent state. All other
commands read existing state; they do not modify it.

---

## Validation Rules

| Entity | Field | Rule |
|--------|-------|------|
| KeyPair | signingKey | MUST be 64 bytes (Ed25519 seed + public) |
| KeyPair | encryptionKey | MUST be 32 bytes |
| StorageType | — | MUST be detected at runtime; never hardcoded |
| Init | — | MUST abort if any key exists in storage before generation |
| Init | — | MUST roll back Keychain entry if vault creation fails |
| Status | — | MUST exit non-zero if keyAccessible is false |
