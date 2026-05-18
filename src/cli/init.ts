import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { resolveBackend } from '../keys/platform.js';
import { fingerprint } from '../keys/crypto.js';
import type { StorageType } from '../keys/KeyManager.js';

export interface InitOptions {
  vaultPath?: string;
  keyPath?: string;
}

export interface InitResult {
  fingerprint: string;
  storageType: StorageType;
  vaultPath: string;
}

const DEFAULT_VAULT_PATH = path.join(os.homedir(), '.agent-friday', 'vault.db');

export async function runInit(options: InitOptions = {}): Promise<InitResult> {
  const backend = resolveBackend();
  const vaultPath = options.vaultPath ?? DEFAULT_VAULT_PATH;
  const keyPath = options.keyPath;

  if (await backend.exists(keyPath)) {
    throw new Error('vault already initialised. Run `agent-friday status` to verify.');
  }

  const km = await backend.generate(keyPath);

  try {
    await fs.mkdir(path.dirname(vaultPath), { recursive: true });
    await fs.writeFile(vaultPath, '', { flag: 'wx' });
  } catch (err) {
    await backend.delete(keyPath);
    throw new Error(`Failed to create vault: ${(err as Error).message}`);
  }

  const pub = await km.publicKey();
  const fp = await fingerprint(pub);
  const storage = km.storageType();
  const storageLabel = storage === 'keychain'
    ? 'Keychain (software-protected)'
    : 'Software key (file-protected)';

  console.log('Agent Friday initialised.');
  console.log(`Public key: ${fp}`);
  console.log(`Storage:    ${storageLabel}`);
  console.log(`Vault:      ${vaultPath}`);
  console.log('');
  console.log('WARNING: If this key is lost, your memories cannot be recovered.');

  return { fingerprint: fp, storageType: storage, vaultPath };
}
