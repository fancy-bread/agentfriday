import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryVault } from './helpers/InMemoryVault.js';
import { StubKeyManager } from './helpers/StubKeyManager.js';

describe('MemoryVault.append', () => {
  let vault: InMemoryVault;

  beforeEach(() => {
    vault = new InMemoryVault(new StubKeyManager());
  });

  it('returns a non-empty EntryId', async () => {
    const id = await vault.append('hello');
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
  });

  it('returns unique IDs for successive appends', async () => {
    const id1 = await vault.append('first');
    const id2 = await vault.append('second');
    expect(id1).not.toBe(id2);
  });

  it('persists the entry to the ledger', async () => {
    await vault.append('persisted');
    expect(vault.getLedger()).toHaveLength(1);
  });

  it('does not store plaintext (encryption invariant)', async () => {
    const content = 'sensitive content';
    await vault.append(content);
    const entry = vault.getLedger()[0];
    const storedAsString = Buffer.from(entry.payload).toString('utf8');
    expect(storedAsString).not.toBe(content);
  });

  it('second entry references first via previousId (chain)', async () => {
    const id1 = await vault.append('first');
    await vault.append('second');
    const [, second] = vault.getLedger();
    expect(second.previousId).toBe(id1);
  });

  it('first entry has null previousId', async () => {
    await vault.append('only');
    expect(vault.getLedger()[0].previousId).toBeNull();
  });

  it('throws on empty content', async () => {
    await expect(vault.append('')).rejects.toThrow();
  });
});
