import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openVault, closeVault, type VaultFixture } from './helpers/openVault.js';
import { SqliteVault } from '../../src/vault/SqliteVault.js';
import { createHash } from 'crypto';

describe('SqliteVault — chain integrity', () => {
  let f: VaultFixture;

  beforeEach(async () => { f = await openVault(); });
  afterEach(async () => {
    // vault may be already closed in some tests
    try { f.vault.close(); } catch { /* already closed */ }
    const { rm } = await import('fs/promises');
    await rm(f.tmpDir, { recursive: true, force: true });
  });

  it('valid chain passes startup', async () => {
    await f.vault.append('entry 1');
    await f.vault.append('entry 2');
    f.vault.close();

    // Reopen — should not throw
    const vault2 = await SqliteVault.open({ dbPath: f.dbPath, keyManager: f.keyManager });
    vault2.close();
  });

  it('corrupt payload_hash causes open to throw with entry id in message', async () => {
    const id = await f.vault.append('corrupt me');
    const fakeHash = Buffer.alloc(32, 0xff);

    // Directly corrupt the payload_hash (bypassing the interface)
    f.vault['db'].prepare('UPDATE entries SET payload_hash = ? WHERE id = ?').run(fakeHash, id);
    f.vault.close();

    await expect(
      SqliteVault.open({ dbPath: f.dbPath, keyManager: f.keyManager })
    ).rejects.toThrow(id);
  });

  it('integrityCheckN = 0 skips the check', async () => {
    await f.vault.append('entry');
    const fakeHash = Buffer.alloc(32, 0xff);
    f.vault['db'].prepare('UPDATE entries SET payload_hash = ? ').run(fakeHash);
    f.vault.close();

    // Should not throw with N=0
    const vault2 = await SqliteVault.open({ dbPath: f.dbPath, keyManager: f.keyManager, integrityCheckN: 0 });
    vault2.close();
  });

  it('empty vault passes chain check on startup', async () => {
    f.vault.close();
    const vault2 = await SqliteVault.open({ dbPath: f.dbPath, keyManager: f.keyManager });
    vault2.close();
  });
});
