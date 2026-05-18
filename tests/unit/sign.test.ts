import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import { SoftwareKeyManager } from '../../src/keys/SoftwareKeyManager.js';
import { initSodium } from '../../src/keys/crypto.js';

describe('sign / verify', () => {
  let manager: SoftwareKeyManager;
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'agent-friday-sign-'));
    manager = await SoftwareKeyManager.generate(path.join(tmpDir, 'keypair'));
  });

  afterAll(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('sign() returns a non-empty Uint8Array', async () => {
    const msg = new TextEncoder().encode('hello');
    const sig = await manager.sign(msg);
    expect(sig).toBeInstanceOf(Uint8Array);
    expect(sig.length).toBeGreaterThan(0);
  });

  it('signature verifies against the original message and public key', async () => {
    const sodium = await initSodium();
    const msg = new TextEncoder().encode('verify me');
    const sig = await manager.sign(msg);
    const pub = await manager.publicKey();
    expect(sodium.crypto_sign_verify_detached(sig, msg, pub)).toBe(true);
  });

  it('signature fails verification against a modified message', async () => {
    const sodium = await initSodium();
    const msg = new TextEncoder().encode('original');
    const sig = await manager.sign(msg);
    const pub = await manager.publicKey();
    const modified = new TextEncoder().encode('tampered!');
    expect(sodium.crypto_sign_verify_detached(sig, modified, pub)).toBe(false);
  });

  it('publicKey() returns a stable value across calls', async () => {
    const pub1 = await manager.publicKey();
    const pub2 = await manager.publicKey();
    expect(Buffer.from(pub1).toString('hex')).toBe(Buffer.from(pub2).toString('hex'));
  });
});
