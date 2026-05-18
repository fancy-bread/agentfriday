import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryVault } from './helpers/InMemoryVault.js';
import { StubKeyManager } from './helpers/StubKeyManager.js';
import type { EntryId } from '../../src/vault/types.js';

describe('MemoryVault.amend', () => {
  let vault: InMemoryVault;

  beforeEach(() => {
    vault = new InMemoryVault(new StubKeyManager());
  });

  it('returns a new EntryId', async () => {
    const original = await vault.append('original');
    const amended = await vault.amend(original, 'updated');
    expect(amended).toBeTruthy();
    expect(amended).not.toBe(original);
  });

  it('original entry is excluded from query results', async () => {
    const id = await vault.append('stale');
    await vault.amend(id, 'fresh');
    const results = await vault.query('context');
    expect(results.map(r => r.content)).not.toContain('stale');
  });

  it('amended content appears in query results', async () => {
    const id = await vault.append('old');
    await vault.amend(id, 'new');
    const results = await vault.query('context');
    expect(results.map(r => r.content)).toContain('new');
  });

  it('both entries exist in the ledger (chain intact)', async () => {
    const id = await vault.append('original');
    await vault.amend(id, 'amended');
    expect(vault.getLedger()).toHaveLength(2);
    expect(vault.getLedger()[1].previousId).toBe(id);
  });

  it('throws on unknown id', async () => {
    await expect(
      vault.amend('00000000-0000-0000-0000-000000000000' as EntryId, 'x')
    ).rejects.toThrow();
  });

  it('no orphaned entry created on error', async () => {
    const before = vault.getLedger().length;
    await vault.amend('bad-id' as EntryId, 'x').catch(() => {});
    expect(vault.getLedger().length).toBe(before);
  });
});
