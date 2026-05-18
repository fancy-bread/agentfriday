import type { Database } from 'better-sqlite3';

export const SCHEMA_VERSION = 1;

export const MIGRATIONS: readonly (readonly string[])[] = [
  // 0 → 1: Required schema (entries + indexes only; entry_vectors created separately when vec0 available)
  [
    `CREATE TABLE IF NOT EXISTS entries (
      id           TEXT    PRIMARY KEY,
      payload      BLOB    NOT NULL,
      embedding    BLOB    NOT NULL DEFAULT (zeroblob(3072)),
      created_at   INTEGER NOT NULL,
      previous_id  TEXT    REFERENCES entries(id),
      action       TEXT    NOT NULL CHECK(action IN ('append', 'amend', 'redact')),
      signature    BLOB    NOT NULL,
      payload_hash BLOB    NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_entries_previous_id ON entries(previous_id)`,
  ],
];

/** Create the vec0 virtual table. Call only after sqlite-vec extension is loaded. */
export function createVectorTable(db: Database): void {
  db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS entry_vectors USING vec0(embedding float[768])`);
}

export function runMigrations(db: Database): void {
  // Always ensure schema_version table exists before reading from it
  db.exec(`CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL DEFAULT 0)`);
  db.exec(`INSERT OR IGNORE INTO schema_version (version) VALUES (0)`);

  const row = db.prepare('SELECT version FROM schema_version').get() as { version: number };
  const current = row.version;

  if (current >= SCHEMA_VERSION) return;

  db.transaction(() => {
    for (let v = current; v < SCHEMA_VERSION; v++) {
      for (const sql of MIGRATIONS[v]) {
        db.exec(sql);
      }
    }
    db.prepare('UPDATE schema_version SET version = ?').run(SCHEMA_VERSION);
  })();
}
