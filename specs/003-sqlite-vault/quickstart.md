# Quickstart: SqliteVault

---

## Opening the vault

```typescript
import { SqliteVault } from './src/vault/SqliteVault.js';
import { SoftwareKeyManager } from './src/keys/SoftwareKeyManager.js';

const km = await SoftwareKeyManager.load();

const vault = await SqliteVault.open({
  dbPath: '/tmp/test.db',      // omit for default ~/.agent-friday/vault.db
  keyManager: km,
  integrityCheckN: 50,         // default
});

const id = await vault.append('remember this');
const results = await vault.query('context string');
await vault.close();
```

## With an embedder

```typescript
const vault = await SqliteVault.open({
  keyManager: km,
  embedder: async (content) => {
    // call your embedding service
    const response = await fetch('http://localhost:11434/api/embeddings', {
      method: 'POST',
      body: JSON.stringify({ model: 'nomic-embed-text', prompt: content }),
    });
    const data = await response.json();
    return new Float32Array(data.embedding);
  },
});
```

## Running integration tests

```bash
npm run test:integration
```

Integration tests use real SQLCipher with a temporary database file. No mocking.
Each test gets a fresh database — no shared state between tests.

```bash
npm run test          # all tests (contract + unit + integration)
npm run typecheck     # TypeScript check
```

---

## Constitution check (for implementers)

Before submitting:
- [ ] Zero calls to `DELETE` or `UPDATE` anywhere in `src/vault/SqliteVault.ts` or `src/db/` (Principle I)
- [ ] `KeyManager.encrypt()` is called before every INSERT of a payload; plaintext never passed to a SQLite bind parameter (Principle II)
- [ ] `SqliteVault` never reads or stores key material — only calls `keyManager.encrypt/decrypt/sign` (Principle III)
- [ ] `SqliteVault` is instantiated and used only via the `MemoryVault` interface in all callers (Principle IV)
- [ ] Integration tests cover: append→query round-trip, redaction exclusion, chain integrity failure, recency fallback (Principle I)

---

## SQLCipher key setup

The SQLCipher key is derived from `KeyManager` via HKDF with context
`agent-friday-sqlcipher-v1` (distinct from the entry encryption context
`agent-friday-vault-v1`). Set immediately after opening:

```sql
PRAGMA key = "x'<32-byte-hex-key>'";
```

This must be the first statement executed after `db = new Database(path)`.
