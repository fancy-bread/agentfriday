import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import { SoftwareKeyManager } from '../../src/keys/SoftwareKeyManager.js';
import { loadKeyOrAbort } from '../../src/cli/start.js';

describe('start — loadKeyOrAbort', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'agent-friday-start-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('loads successfully when key exists', async () => {
    const keyPath = path.join(tmpDir, 'keypair');
    await SoftwareKeyManager.generate(keyPath);
    const km = await SoftwareKeyManager.load(keyPath);
    expect(await km.publicKey()).toBeInstanceOf(Uint8Array);
  });

  it('throws with descriptive message when key is missing', async () => {
    const keyPath = path.join(tmpDir, 'nonexistent');
    await expect(loadKeyOrAbort(keyPath)).rejects.toThrow('key not found');
  });

  it('throws with KEY_NOT_FOUND code when key is missing', async () => {
    const keyPath = path.join(tmpDir, 'nonexistent');
    const err = await loadKeyOrAbort(keyPath).catch(e => e) as NodeJS.ErrnoException;
    expect(err.code).toBe('KEY_NOT_FOUND');
  });

  it('does not create a key file when load fails', async () => {
    const keyPath = path.join(tmpDir, 'nonexistent');
    await loadKeyOrAbort(keyPath).catch(() => {});
    expect(await SoftwareKeyManager.exists(keyPath)).toBe(false);
  });
});
