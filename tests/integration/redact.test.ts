import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openVault, closeVault, type VaultFixture } from './helpers/openVault.js';
import type { EntryId } from '../../src/vault/types.js';

describe('SqliteVault.redact', () => {
  let f: VaultFixture;

  beforeEach(async () => { f = await openVault(); });
  afterEach(async () => { await closeVault(f); });

  it('returns a new EntryId different from the original', async () => {
    const id = await f.vault.append('to forget');
    const redactId = await f.vault.redact(id);
    expect(redactId).toBeTruthy();
    expect(redactId).not.toBe(id);
  });

  it('redacted entry does not appear in query results', async () => {
    const id = await f.vault.append('secret');
    await f.vault.redact(id);
    const results = await f.vault.query('secret');
    expect(results).toHaveLength(0);
  });

  it('accepts an optional reason without error', async () => {
    const id = await f.vault.append('with reason');
    await expect(f.vault.redact(id, 'no longer relevant')).resolves.toBeTruthy();
  });

  it('both original and redaction record exist — no DELETE executed', async () => {
    const id = await f.vault.append('original');
    const redactId = await f.vault.redact(id);
    const count = f.vault['db'].prepare('SELECT COUNT(*) as n FROM entries').get() as { n: number };
    expect(count.n).toBe(2);
    const row = f.vault['db'].prepare('SELECT action, previous_id FROM entries WHERE id = ?').get(redactId) as {
      action: string; previous_id: string;
    };
    expect(row.action).toBe('redact');
    expect(row.previous_id).toBe(id);
  });

  it('throws on unknown id', async () => {
    await expect(f.vault.redact('00000000-0000-0000-0000-000000000000' as EntryId)).rejects.toThrow();
  });

  it('does not write any entry on error', async () => {
    const before = (f.vault['db'].prepare('SELECT COUNT(*) as n FROM entries').get() as { n: number }).n;
    await f.vault.redact('bad-id' as EntryId).catch(() => {});
    const after = (f.vault['db'].prepare('SELECT COUNT(*) as n FROM entries').get() as { n: number }).n;
    expect(after).toBe(before);
  });
});
