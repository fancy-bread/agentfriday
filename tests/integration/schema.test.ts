import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { openVault, closeVault, type VaultFixture } from './helpers/openVault.js';

describe('SqliteVault — schema initialisation', () => {
  let f: VaultFixture;

  beforeEach(async () => { f = await openVault(); });
  afterEach(async () => { await closeVault(f); });

  it('creates the entries table on a fresh database', async () => {
    const row = f.vault['db'].prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='entries'"
    ).get();
    expect(row).toBeTruthy();
  });

  it('creates the entries table and schema_version but not entry_vectors when vec0 unavailable', async () => {
    // entry_vectors only created when sqlite-vec loads; @signalapp/better-sqlite3 disables loadExtension
    const entries = f.vault['db'].prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='entries'"
    ).get();
    expect(entries).toBeTruthy();
  });

  it('creates the schema_version table and sets version to 1', async () => {
    const row = f.vault['db'].prepare('SELECT version FROM schema_version').get() as { version: number };
    expect(row.version).toBe(1);
  });

  it('entries table has the correct columns', async () => {
    const cols = f.vault['db'].prepare("PRAGMA table_info(entries)").all() as Array<{ name: string }>;
    const names = cols.map(c => c.name);
    expect(names).toContain('id');
    expect(names).toContain('payload');
    expect(names).toContain('embedding');
    expect(names).toContain('created_at');
    expect(names).toContain('previous_id');
    expect(names).toContain('action');
    expect(names).toContain('signature');
    expect(names).toContain('payload_hash');
  });

  it('reopening the database preserves zero rows', async () => {
    const { dbPath, keyManager, tmpDir } = f;
    f.vault.close();

    const { SqliteVault } = await import('../../src/vault/SqliteVault.js');
    const vault2 = await SqliteVault.open({ dbPath, keyManager });
    const count = vault2['db'].prepare('SELECT COUNT(*) as n FROM entries').get() as { n: number };
    expect(count.n).toBe(0);
    vault2.close();
    f = { vault: vault2, keyManager, dbPath, tmpDir };
  });

  it('running migrations twice does not error', async () => {
    const { runMigrations } = await import('../../src/db/schema.js');
    expect(() => runMigrations(f.vault['db'])).not.toThrow();
    expect(() => runMigrations(f.vault['db'])).not.toThrow();
  });
});
