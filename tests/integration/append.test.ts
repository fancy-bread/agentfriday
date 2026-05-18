import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createHash } from 'crypto';
import { openVault, closeVault, type VaultFixture } from './helpers/openVault.js';

describe('SqliteVault.append', () => {
  let f: VaultFixture;

  beforeEach(async () => { f = await openVault(); });
  afterEach(async () => { await closeVault(f); });

  it('returns a non-empty EntryId', async () => {
    const id = await f.vault.append('hello');
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
  });

  it('returns unique IDs for successive appends', async () => {
    const id1 = await f.vault.append('first');
    const id2 = await f.vault.append('second');
    expect(id1).not.toBe(id2);
  });

  it('stored payload is not equal to plaintext', async () => {
    await f.vault.append('secret content');
    const row = f.vault['db'].prepare('SELECT payload FROM entries LIMIT 1').get() as { payload: Buffer };
    expect(row.payload.toString()).not.toBe('secret content');
  });

  it('second entry references first via previous_id', async () => {
    const id1 = await f.vault.append('first');
    const id2 = await f.vault.append('second');
    const row = f.vault['db'].prepare(
      'SELECT previous_id FROM entries WHERE id = ?'
    ).get(id2) as { previous_id: string };
    expect(row.previous_id).toBe(id1);
  });

  it('first entry has null previous_id', async () => {
    await f.vault.append('only');
    const row = f.vault['db'].prepare('SELECT previous_id FROM entries LIMIT 1').get() as { previous_id: string | null };
    expect(row.previous_id).toBeNull();
  });

  it('payload_hash equals SHA-256 of stored payload', async () => {
    await f.vault.append('verifiable');
    const row = f.vault['db'].prepare('SELECT payload, payload_hash FROM entries LIMIT 1').get() as {
      payload: Buffer; payload_hash: Buffer;
    };
    const computed = createHash('sha256').update(row.payload).digest();
    expect(computed.equals(row.payload_hash)).toBe(true);
  });

  it('action is set to "append"', async () => {
    await f.vault.append('action check');
    const row = f.vault['db'].prepare('SELECT action FROM entries LIMIT 1').get() as { action: string };
    expect(row.action).toBe('append');
  });

  it('throws on empty content', async () => {
    await expect(f.vault.append('')).rejects.toThrow();
  });
});
