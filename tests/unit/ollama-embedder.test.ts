import { describe, it, expect, vi, afterEach } from 'vitest';
import { OllamaEmbedder } from '../../src/embeddings/OllamaEmbedder.js';

const embedder = new OllamaEmbedder('http://localhost:11434', 'nomic-embed-text');

function mockFetch(response: Partial<Response> & { json?: () => Promise<unknown> }): void {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: response.ok ?? true,
    status: response.status ?? 200,
    json: response.json ?? (() => Promise.resolve({})),
  }));
}

afterEach(() => { vi.unstubAllGlobals(); });

describe('OllamaEmbedder', () => {
  it('returns Float32Array of length 768 on valid response', async () => {
    const vector = Array.from({ length: 768 }, (_, i) => i * 0.001);
    mockFetch({ json: () => Promise.resolve({ embeddings: [vector] }) });
    const result = await embedder.embed('test content');
    expect(result).toBeInstanceOf(Float32Array);
    expect(result.length).toBe(768);
    expect(result[0]).toBeCloseTo(0);
    expect(result[1]).toBeCloseTo(0.001);
  });

  it('throws when fetch rejects (network error)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    await expect(embedder.embed('test')).rejects.toThrow();
  });

  it('throws on non-200 response', async () => {
    mockFetch({ ok: false, status: 503, json: () => Promise.resolve({}) });
    await expect(embedder.embed('test')).rejects.toThrow('503');
  });

  it('throws on malformed JSON (missing embeddings field)', async () => {
    mockFetch({ json: () => Promise.resolve({ model: 'nomic-embed-text' }) });
    await expect(embedder.embed('test')).rejects.toThrow('embeddings');
  });
});
