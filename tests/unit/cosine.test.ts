import { describe, it, expect } from 'vitest';
import { cosineSimilarity, isZeroVector } from '../../src/embeddings/cosine.js';

function vec(...values: number[]): Float32Array {
  return new Float32Array(values);
}

describe('cosineSimilarity', () => {
  it('identical non-zero vectors = 1.0', () => {
    const a = vec(1, 2, 3);
    expect(cosineSimilarity(a, a)).toBeCloseTo(1.0);
  });

  it('orthogonal vectors = 0.0', () => {
    const a = vec(1, 0, 0);
    const b = vec(0, 1, 0);
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.0);
  });

  it('opposite vectors = -1.0', () => {
    const a = vec(1, 2, 3);
    const b = vec(-1, -2, -3);
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0);
  });

  it('zero-vector input returns 0 (not NaN)', () => {
    const zero = new Float32Array(3);
    const a = vec(1, 2, 3);
    const result = cosineSimilarity(zero, a);
    expect(result).toBe(0);
    expect(Number.isNaN(result)).toBe(false);
  });
});

describe('isZeroVector', () => {
  it('returns true for all-zero Float32Array', () => {
    expect(isZeroVector(new Float32Array(768))).toBe(true);
  });

  it('returns false when any element is non-zero', () => {
    const v = new Float32Array(768);
    v[100] = 0.5;
    expect(isZeroVector(v)).toBe(false);
  });
});
