import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openVault, closeVault, type VaultFixture } from './helpers/openVault.js';
import type { Embedder } from '../../src/vault/SqliteVault.js';

function makeStubEmbedder(map: Map<string, Float32Array>): Embedder {
  return async (content: string) => map.get(content) ?? new Float32Array(768);
}

function unitVec(dims: number, hotIndex: number): Float32Array {
  const v = new Float32Array(dims);
  v[hotIndex] = 1;
  return v;
}

describe('semantic ranking', () => {
  let f: VaultFixture;

  beforeEach(async () => {
    const map = new Map<string, Float32Array>([
      ['aws deployment', unitVec(768, 0)],
      ['team standup',   unitVec(768, 1)],
      ['query context',  unitVec(768, 0)], // same direction as 'aws deployment'
    ]);
    f = await openVault({ embedder: makeStubEmbedder(map) });
    await f.vault.append('aws deployment');
    await f.vault.append('team standup');
  });
  afterEach(async () => { await closeVault(f); });

  it('entry closest to query context ranks first regardless of insertion order', async () => {
    const results = await f.vault.query('query context');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].content).toBe('aws deployment');
  });

  it('limit parameter caps cosine-ranked results', async () => {
    const results = await f.vault.query('query context', { limit: 1 });
    expect(results.length).toBe(1);
  });
});

describe('zero-vector entries excluded from cosine ranking', () => {
  let f: VaultFixture;

  beforeEach(async () => {
    const map = new Map<string, Float32Array>([
      ['real content',   unitVec(768, 5)],
      ['query context',  unitVec(768, 5)],
    ]);
    f = await openVault({ embedder: makeStubEmbedder(map) });
    await f.vault.append('real content');    // gets unitVec(768, 5)
    await f.vault.append('zero content');    // not in map → zero-vector
  });
  afterEach(async () => { await closeVault(f); });

  it('zero-vector entry does not appear before real-embedding entry', async () => {
    const results = await f.vault.query('query context');
    expect(results[0].content).toBe('real content');
  });
});

describe('graceful degradation', () => {
  let f: VaultFixture;
  afterEach(async () => { if (f) await closeVault(f); });

  it('embedder always returns zero-vector → append succeeds', async () => {
    f = await openVault({ embedder: async () => new Float32Array(768) });
    const id = await f.vault.append('some content');
    expect(id).toBeTruthy();
  });

  it('embedder always returns zero-vector → query returns by recency without error', async () => {
    f = await openVault({ embedder: async () => new Float32Array(768) });
    await f.vault.append('first');
    await f.vault.append('second');
    const results = await f.vault.query('anything');
    expect(results.length).toBe(2);
    expect(results[0].content).toBe('second'); // most recent first
  });

  it('no embedder (undefined) → query returns by recency without error', async () => {
    f = await openVault();
    await f.vault.append('alpha');
    const results = await f.vault.query('anything');
    expect(results.length).toBe(1);
    expect(results[0].content).toBe('alpha');
  });

  it('empty vault returns empty array without error', async () => {
    f = await openVault({ embedder: async () => new Float32Array(768) });
    const results = await f.vault.query('anything');
    expect(results).toEqual([]);
  });
});
