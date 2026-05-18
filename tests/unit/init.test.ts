import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, access } from 'fs/promises';
import os from 'os';
import path from 'path';
import { runInit } from '../../src/cli/init.js';
import { SoftwareKeyManager } from '../../src/keys/SoftwareKeyManager.js';

describe('init command', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'agent-friday-init-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  const opts = (overrides: Partial<{ keyPath: string; vaultPath: string }> = {}) => ({
    keyPath: path.join(tmpDir, 'keypair'),
    vaultPath: path.join(tmpDir, 'vault.db'),
    ...overrides,
  });

  it('returns a correctly formatted fingerprint', async () => {
    const result = await runInit(opts());
    expect(result.fingerprint).toMatch(/^[0-9a-f]{2}(:[0-9a-f]{2}){15}$/);
  });

  it('creates the vault file', async () => {
    const o = opts();
    await runInit(o);
    await expect(access(o.vaultPath)).resolves.toBeUndefined();
  });

  it('stores the key on disk', async () => {
    const o = opts();
    await runInit(o);
    expect(await SoftwareKeyManager.exists(o.keyPath)).toBe(true);
  });

  it('aborts with error if key already exists', async () => {
    const o = opts();
    await runInit(o);
    await expect(runInit(o)).rejects.toThrow('already initialised');
  });

  it('does not overwrite an existing key on second run', async () => {
    const o = opts();
    await runInit(o);
    const km1 = await SoftwareKeyManager.load(o.keyPath);
    const pub1 = Buffer.from(await km1.publicKey()).toString('hex');

    await runInit(o).catch(() => {});

    const km2 = await SoftwareKeyManager.load(o.keyPath);
    const pub2 = Buffer.from(await km2.publicKey()).toString('hex');
    expect(pub1).toBe(pub2);
  });

  it('rolls back key if vault creation fails (file pre-exists)', async () => {
    const o = opts();
    // Pre-create vault file so writeFile with flag 'wx' fails
    await writeFile(o.vaultPath, 'pre-existing');
    await expect(runInit(o)).rejects.toThrow();
    expect(await SoftwareKeyManager.exists(o.keyPath)).toBe(false);
  });

  it('does not print raw key material to stdout', async () => {
    const o = opts();
    const logs: string[] = [];
    const orig = console.log;
    console.log = (...args: unknown[]) => logs.push(args.map(String).join(' '));
    try {
      await runInit(o);
    } finally {
      console.log = orig;
    }
    // Load the stored key and confirm its raw bytes don't appear in output
    const km = await SoftwareKeyManager.load(o.keyPath);
    const pubB64 = Buffer.from(await km.publicKey()).toString('base64');
    const output = logs.join('\n');
    // Raw base64 key would be 44 chars — should not appear; only colon-hex fingerprint is allowed
    expect(output).not.toContain(pubB64.slice(0, 20));
  });
});
