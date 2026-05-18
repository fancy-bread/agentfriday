# Data Model: Vault Interface

**Phase**: 1 | **Date**: 2026-05-17 | **Feature**: [spec.md](spec.md)

---

## Entities

### EntryId

An opaque, branded string identifier assigned by the vault at write time. Callers
receive an `EntryId` from `append`, `amend`, and `redact`. They pass it back to
`amend` and `redact` to reference a prior entry.

```
EntryId
  value: string   ← UUIDv4; brand prevents raw string substitution
```

---

### MemoryEntry (encrypted, on-disk)

The record as persisted to the ledger. The vault works with this form internally;
callers never receive it directly.

```
MemoryEntry
  id:          EntryId
  payload:     Uint8Array      ← XSalsa20-Poly1305 encrypted content
  embedding:   Float32Array    ← 768-dim semantic vector (plaintext; not sensitive)
  createdAt:   number          ← Unix timestamp (ms)
  previousId:  EntryId | null  ← null for originals; set for amend/redact records
  action:      'append' | 'amend' | 'redact'
  signature:   Uint8Array      ← Ed25519 over (payload ‖ previousId ‖ action ‖ createdAt)
  payloadHash: Uint8Array      ← SHA-256 of payload; chain integrity; stored in clear
```

---

### MemoryEntryDecrypted (in-process only, never persisted)

The decrypted view returned to callers by `query`. Constructed inside the vault
after decryption; never stored or transmitted.

```
MemoryEntryDecrypted
  id:         EntryId
  content:    string           ← decrypted plaintext
  createdAt:  number
  previousId: EntryId | null
  action:     'append' | 'amend' | 'redact'
```

---

## Validation Rules

| Field | Rule |
|-------|------|
| `content` (on append/amend) | MUST be non-empty string |
| `id` (on amend/redact) | MUST reference an existing entry; error if unknown |
| `payload` | MUST be encrypted before reaching the vault; vault MUST NOT accept plaintext |
| `previousId` | MUST be null on `append`; MUST reference the target on `amend`/`redact` |
| `action` | MUST be one of the three enum values; no other values permitted |
| `signature` | MUST be verified on read; corrupt signature → decryption error |

---

## State Transitions

```
[new content]
      │
      ▼
   append ──────────────────────────────► MemoryEntry { action: 'append' }
                                                │
                                    ┌───────────┴───────────┐
                                    ▼                       ▼
                                  amend                  redact
                                    │                       │
                                    ▼                       ▼
                        MemoryEntry { action: 'amend'   MemoryEntry { action: 'redact'
                          previousId: original.id }       previousId: original.id }
```

Original entries are never modified. Only the query filter changes what callers see:
- `amend`: original excluded from results; amended entry included
- `redact`: original excluded from results; redaction record excluded from results

---

## Relationships

- One `MemoryEntry` optionally references one prior `MemoryEntry` via `previousId`
- Chains are linear — one entry has at most one successor (amend or redact, not both)
- `KeyManager` is composed into the vault; it does not appear in the data model as
  an entity — it is a dependency, not a stored record
