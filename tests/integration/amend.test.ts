import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openVault, closeVault, type VaultFixture } from './helpers/openVault.js';
import type { EntryId } from '../../src/vault/types.js';

describe('SqliteVault.amend', () => {
  let f: VaultFixture;

  beforeEach(async () => { f = await openVault(); });
  afterEach(async () => { await closeVault(f); });

  it('returns a new EntryId different from the original', async () => {
    const original = await f.vault.append('original');
    const amended = await f.vault.amend(original, 'updated');
    expect(amended).toBeTruthy();
    expect(amended).not.toBe(original);
  });

  it('original entry is excluded from query results', async () => {
    const id = await f.vault.append('stale');
    await f.vault.amend(id, 'fresh');
    const results = await f.vault.query('context');
    expect(results.map(r => r.content)).not.toContain('stale');
  });

  it('amended content appears in query results', async () => {
    const id = await f.vault.append('old');
    await f.vault.amend(id, 'new');
    const results = await f.vault.query('context');
    expect(results.map(r => r.content)).toContain('new');
  });

  it('both entries exist in the database with correct chain', async () => {
    const original = await f.vault.append('original');
    const amended = await f.vault.amend(original, 'amended');
    const count = f.vault['db'].prepare('SELECT COUNT(*) as n FROM entries').get() as { n: number };
    expect(count.n).toBe(2);
    const row = f.vault['db'].prepare('SELECT previous_id, action FROM entries WHERE id = ?').get(amended) as {
      previous_id: string; action: string;
    };
    expect(row.previous_id).toBe(original);
    expect(row.action).toBe('amend');
  });

  it('throws on unknown id', async () => {
    await expect(f.vault.amend('00000000-0000-0000-0000-000000000000' as EntryId, 'x')).rejects.toThrow();
  });

  it('does not write any entry on error', async () => {
    const before = (f.vault['db'].prepare('SELECT COUNT(*) as n FROM entries').get() as { n: number }).n;
    await f.vault.amend('bad-id' as EntryId, 'x').catch(() => {});
    const after = (f.vault['db'].prepare('SELECT COUNT(*) as n FROM entries').get() as { n: number }).n;
    expect(after).toBe(before);
  });

  it('throws on empty content', async () => {
    const id = await f.vault.append('content');
    await expect(f.vault.amend(id, '')).rejects.toThrow();
  });
});
