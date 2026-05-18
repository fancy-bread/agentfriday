import { mkdtemp, rm } from 'fs/promises';
import os from 'os';
import path from 'path';
import { SoftwareKeyManager } from '../../../src/keys/SoftwareKeyManager.js';
import { SqliteVault, type SqliteVaultOptions } from '../../../src/vault/SqliteVault.js';

export interface VaultFixture {
  vault: SqliteVault;
  keyManager: SoftwareKeyManager;
  dbPath: string;
  tmpDir: string;
}

export async function openVault(
  opts: Partial<Omit<SqliteVaultOptions, 'keyManager' | 'dbPath'>> = {}
): Promise<VaultFixture> {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'af-vault-'));
  const keyPath = path.join(tmpDir, 'keypair');
  const dbPath = path.join(tmpDir, 'vault.db');

  const keyManager = await SoftwareKeyManager.generate(keyPath);
  const vault = await SqliteVault.open({ ...opts, dbPath, keyManager });

  return { vault, keyManager, dbPath, tmpDir };
}

export async function closeVault(f: VaultFixture): Promise<void> {
  f.vault.close();
  await rm(f.tmpDir, { recursive: true, force: true });
}
