# Quickstart: Vault Interface

**Audience**: Developers implementing a new `MemoryVault` or `KeyManager`, or
writing code that depends on these contracts.

---

## Implementing MemoryVault

1. Import the interface from `src/vault/MemoryVault.ts`
2. Implement all four methods: `append`, `query`, `amend`, `redact`
3. Accept a `KeyManager` in your constructor — do not handle encryption directly
4. Enforce the append-only invariant: your implementation MUST NOT call DELETE or
   UPDATE on the underlying store at any point

```typescript
import { MemoryVault, EntryId, MemoryEntryDecrypted, QueryOptions } from '../vault/MemoryVault';
import { KeyManager } from '../keys/KeyManager';

export class MyVault implements MemoryVault {
  constructor(private readonly keys: KeyManager) {}

  async append(content: string): Promise<EntryId> { /* ... */ }
  async query(context: string, options?: QueryOptions): Promise<MemoryEntryDecrypted[]> { /* ... */ }
  async amend(id: EntryId, content: string): Promise<EntryId> { /* ... */ }
  async redact(id: EntryId, reason?: string): Promise<EntryId> { /* ... */ }
}
```

---

## Implementing KeyManager

```typescript
import { KeyManager } from '../keys/KeyManager';

export class MyKeyManager implements KeyManager {
  async encrypt(plaintext: Uint8Array): Promise<Uint8Array> { /* ... */ }
  async decrypt(ciphertext: Uint8Array): Promise<Uint8Array> { /* ... */ }
  async sign(message: Uint8Array): Promise<Uint8Array> { /* ... */ }
  async publicKey(): Promise<Uint8Array> { /* ... */ }
}
```

---

## Running Contract Tests

Contract tests live in `tests/contract/MemoryVault.contract.test.ts`. They run
against a minimal in-memory test double — not SqliteVault — to verify the interface
contract independently of any implementation.

```bash
npx vitest run tests/contract
```

The suite covers:
- Append returns a unique EntryId
- Stored payload is not retrievable as plaintext (encryption invariant)
- Append → query returns the entry
- Redacted entry does not appear in query results
- Amended entry: new content appears, original does not
- Amend/redact on unknown ID throws, no orphaned entry created
- Chain: each entry references its predecessor by ID

---

## Constitution Check (for implementers)

Before submitting an implementation of `MemoryVault`:

- [ ] No DELETE or UPDATE call exists anywhere in the implementation (Principle I)
- [ ] Every `append`/`amend` calls `keys.encrypt()` before writing to storage (Principle II)
- [ ] No key material is passed to or returned from `MemoryVault` methods (Principle III)
- [ ] The implementation accepts `KeyManager` by interface, not by concrete type (Principle IV)
- [ ] A spec exists for this implementation in `specs/[###]/` (Principle V)
