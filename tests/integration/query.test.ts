import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openVault, closeVault, type VaultFixture } from './helpers/openVault.js';

describe('SqliteVault.query', () => {
  let f: VaultFixture;

  beforeEach(async () => { f = await openVault(); });
  afterEach(async () => { await closeVault(f); });

  it('returns empty array when vault is empty', async () => {
    const results = await f.vault.query('anything');
    expect(results).toEqual([]);
  });

  it('returns decrypted content for stored entries', async () => {
    await f.vault.append('remember this');
    const results = await f.vault.query('context');
    expect(results).toHaveLength(1);
    expect(results[0].content).toBe('remember this');
  });

  it('excludes redacted entries', async () => {
    const id = await f.vault.append('forget me');
    await f.vault.redact(id);
    const results = await f.vault.query('forget me');
    expect(results).toHaveLength(0);
  });

  it('excludes superseded entries after amend', async () => {
    const id = await f.vault.append('old content');
    await f.vault.amend(id, 'new content');
    const results = await f.vault.query('context');
    const contents = results.map(r => r.content);
    expect(contents).not.toContain('old content');
    expect(contents).toContain('new content');
  });

  it('respects the limit option', async () => {
    for (let i = 0; i < 5; i++) await f.vault.append(`entry ${i}`);
    const results = await f.vault.query('context', { limit: 3 });
    expect(results).toHaveLength(3);
  });

  it('returns results without error when using recency fallback (no embedder)', async () => {
    await f.vault.append('recency entry');
    const results = await f.vault.query('anything');
    expect(results[0].content).toBe('recency entry');
  });

  it('result content matches original plaintext', async () => {
    await f.vault.append('exact match');
    const results = await f.vault.query('context');
    expect(results[0].content).toBe('exact match');
  });
});
