import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { resolveBackend } from '../keys/platform.js';
import { fingerprint } from '../keys/crypto.js';
import type { StorageType } from '../keys/KeyManager.js';

export interface StatusResult {
  fingerprint: string | null;
  storageType: StorageType | null;
  vaultPath: string;
  keyAccessible: boolean;
  chainIntact: boolean;
}

const DEFAULT_VAULT_PATH = path.join(os.homedir(), '.agent-friday', 'vault.db');

export async function runStatus(options: { vaultPath?: string; keyPath?: string } = {}): Promise<StatusResult> {
  const backend = resolveBackend();
  const vaultPath = options.vaultPath ?? DEFAULT_VAULT_PATH;

  let fp: string | null = null;
  let storageType: StorageType | null = null;
  let keyAccessible = false;

  try {
    const km = await backend.load(options.keyPath);
    const pub = await km.publicKey();
    fp = await fingerprint(pub);
    storageType = km.storageType();
    keyAccessible = true;
  } catch {
    // key not accessible
  }

  let chainIntact = false;
  try {
    await fs.access(vaultPath);
    chainIntact = true;
  } catch {
    // vault not found
  }

  if (!keyAccessible) {
    console.error('Error: key not found. Run `agent-friday init` to set up your vault.');
    process.exitCode = 1;
    return { fingerprint: null, storageType: null, vaultPath, keyAccessible: false, chainIntact };
  }

  const storageLabel = storageType === 'keychain'
    ? 'Keychain (software-protected)'
    : 'Software key (file-protected)';

  console.log('Agent Friday');
  console.log('────────────────────────────────');
  console.log(`Key          ${fp}`);
  console.log(`Key storage  ${storageLabel}`);
  console.log(`Vault        ${vaultPath}`);
  console.log(`Chain        ${chainIntact ? '✓ intact' : '⚠ vault not found'}`);

  return { fingerprint: fp, storageType, vaultPath, keyAccessible, chainIntact };
}
