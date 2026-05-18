import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import os from 'os';
import path from 'path';
import { SoftwareKeyManager } from '../../src/keys/SoftwareKeyManager.js';
import { runStatus } from '../../src/cli/status.js';

describe('status command', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'agent-friday-status-'));
    process.exitCode = 0;
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
    process.exitCode = 0;
  });

  const opts = () => ({
    keyPath: path.join(tmpDir, 'keypair'),
    vaultPath: path.join(tmpDir, 'vault.db'),
  });

  it('returns keyAccessible=true and a formatted fingerprint when key exists', async () => {
    await SoftwareKeyManager.generate(opts().keyPath);
    const result = await runStatus(opts());
    expect(result.keyAccessible).toBe(true);
    expect(result.fingerprint).toMatch(/^[0-9a-f]{2}(:[0-9a-f]{2}){15}$/);
  });

  it('reports storageType as "software"', async () => {
    await SoftwareKeyManager.generate(opts().keyPath);
    const result = await runStatus(opts());
    expect(result.storageType).toBe('software');
  });

  it('returns keyAccessible=false when key is missing', async () => {
    const result = await runStatus(opts());
    expect(result.keyAccessible).toBe(false);
  });

  it('sets process.exitCode=1 when key is missing', async () => {
    await runStatus(opts());
    expect(process.exitCode).toBe(1);
  });

  it('reports chainIntact=true when vault.db exists', async () => {
    await SoftwareKeyManager.generate(opts().keyPath);
    await writeFile(opts().vaultPath, '');
    const result = await runStatus(opts());
    expect(result.chainIntact).toBe(true);
  });

  it('reports chainIntact=false when vault.db is missing', async () => {
    await SoftwareKeyManager.generate(opts().keyPath);
    const result = await runStatus(opts());
    expect(result.chainIntact).toBe(false);
  });
});
