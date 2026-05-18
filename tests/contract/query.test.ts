import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryVault } from './helpers/InMemoryVault.js';
import { StubKeyManager } from './helpers/StubKeyManager.js';

describe('MemoryVault.query', () => {
  let vault: InMemoryVault;

  beforeEach(() => {
    vault = new InMemoryVault(new StubKeyManager());
  });

  it('returns empty array when vault is empty', async () => {
    const results = await vault.query('anything');
    expect(results).toEqual([]);
  });

  it('returns active entries with decrypted content', async () => {
    await vault.append('remember this');
    const results = await vault.query('context');
    expect(results).toHaveLength(1);
    expect(results[0].content).toBe('remember this');
  });

  it('does not return redacted entries', async () => {
    const id = await vault.append('forget me');
    await vault.redact(id);
    const results = await vault.query('forget me');
    expect(results).toHaveLength(0);
  });

  it('does not return superseded entries after amend', async () => {
    const id = await vault.append('old content');
    await vault.amend(id, 'new content');
    const results = await vault.query('context');
    const contents = results.map(r => r.content);
    expect(contents).not.toContain('old content');
    expect(contents).toContain('new content');
  });

  it('respects limit option', async () => {
    for (let i = 0; i < 5; i++) await vault.append(`entry ${i}`);
    const results = await vault.query('context', { limit: 3 });
    expect(results).toHaveLength(3);
  });

  it('returns decrypted content, not ciphertext', async () => {
    await vault.append('plaintext');
    const results = await vault.query('context');
    expect(results[0].content).toBe('plaintext');
  });
});
