import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryVault } from './helpers/InMemoryVault.js';
import { StubKeyManager } from './helpers/StubKeyManager.js';
import type { EntryId } from '../../src/vault/types.js';

describe('MemoryVault.redact', () => {
  let vault: InMemoryVault;

  beforeEach(() => {
    vault = new InMemoryVault(new StubKeyManager());
  });

  it('returns a new EntryId', async () => {
    const id = await vault.append('to forget');
    const redactId = await vault.redact(id);
    expect(redactId).toBeTruthy();
    expect(redactId).not.toBe(id);
  });

  it('redacted entry does not appear in query results', async () => {
    const id = await vault.append('secret');
    await vault.redact(id);
    const results = await vault.query('secret');
    expect(results).toHaveLength(0);
  });

  it('accepts an optional reason without error', async () => {
    const id = await vault.append('with reason');
    await expect(vault.redact(id, 'no longer relevant')).resolves.toBeTruthy();
  });

  it('both original and redaction record exist in ledger (no DELETE)', async () => {
    const id = await vault.append('original');
    await vault.redact(id);
    expect(vault.getLedger()).toHaveLength(2);
    const redactionRecord = vault.getLedger()[1];
    expect(redactionRecord.action).toBe('redact');
    expect(redactionRecord.previousId).toBe(id);
  });

  it('throws on unknown id', async () => {
    await expect(
      vault.redact('00000000-0000-0000-0000-000000000000' as EntryId)
    ).rejects.toThrow();
  });

  it('no orphaned record created on error', async () => {
    const before = vault.getLedger().length;
    await vault.redact('bad-id' as EntryId).catch(() => {});
    expect(vault.getLedger().length).toBe(before);
  });
});
