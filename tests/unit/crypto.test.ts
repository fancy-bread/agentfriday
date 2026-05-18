import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import { SoftwareKeyManager } from '../../src/keys/SoftwareKeyManager.js';

describe('encrypt / decrypt', () => {
  let manager: SoftwareKeyManager;
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'agent-friday-crypto-'));
    manager = await SoftwareKeyManager.generate(path.join(tmpDir, 'keypair'));
  });

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('encrypt → decrypt returns original plaintext', async () => {
    const plaintext = new TextEncoder().encode('hello, Friday');
    const ciphertext = await manager.encrypt(plaintext);
    const decrypted = await manager.decrypt(ciphertext);
    expect(decrypted).toEqual(plaintext);
  });

  it('ciphertext is not equal to plaintext', async () => {
    const plaintext = new TextEncoder().encode('secret');
    const ciphertext = await manager.encrypt(plaintext);
    expect(Buffer.from(ciphertext).toString()).not.toBe('secret');
  });

  it('two encryptions of the same input produce different ciphertexts (random nonce)', async () => {
    const plaintext = new TextEncoder().encode('same input');
    const ct1 = await manager.encrypt(plaintext);
    const ct2 = await manager.encrypt(plaintext);
    expect(Buffer.from(ct1).toString('hex')).not.toBe(Buffer.from(ct2).toString('hex'));
  });

  it('decryption with a different key fails', async () => {
    const tmpDir2 = await mkdtemp(path.join(os.tmpdir(), 'af-wrong-key-'));
    try {
      const wrongManager = await SoftwareKeyManager.generate(path.join(tmpDir2, 'keypair'));
      const plaintext = new TextEncoder().encode('secret');
      const ciphertext = await manager.encrypt(plaintext);
      await expect(wrongManager.decrypt(ciphertext)).rejects.toThrow();
    } finally {
      await rm(tmpDir2, { recursive: true, force: true });
    }
  });

  it('encrypts and decrypts empty plaintext without error', async () => {
    const plaintext = new Uint8Array(0);
    const ciphertext = await manager.encrypt(plaintext);
    const decrypted = await manager.decrypt(ciphertext);
    expect(decrypted).toEqual(plaintext);
  });
});
