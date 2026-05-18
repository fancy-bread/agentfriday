import { randomUUID } from 'crypto';
import { createHash } from 'crypto';
import type { Database } from 'better-sqlite3';
import type { MemoryVault } from './MemoryVault.js';
import type { EntryId, EntryAction, MemoryEntryDecrypted, QueryOptions } from './types.js';
import type { KeyManager } from '../keys/KeyManager.js';
import { runMigrations, createVectorTable } from '../db/schema.js';
import { deriveSqlcipherKey, applyKey } from '../db/sqlcipher.js';
import {
  INSERT_ENTRY, INSERT_VECTOR, GET_ENTRY_BY_ID,
  GET_LAST_ENTRY_ID, GET_LAST_N_ENTRIES,
  ACTIVE_ENTRIES_RECENCY, ACTIVE_ENTRIES_VECTOR,
} from '../db/queries.js';
import path from 'path';
import os from 'os';

export type Embedder = (content: string) => Promise<Float32Array>;

export interface SqliteVaultOptions {
  dbPath?: string;
  keyManager: KeyManager;
  embedder?: Embedder;
  integrityCheckN?: number;
}

export const DEFAULT_DB_PATH = path.join(os.homedir(), '.agent-friday', 'vault.db');

interface EntryRow {
  id: string;
  payload: Buffer;
  payload_hash: Buffer;
  created_at: number;
  previous_id: string | null;
  action: EntryAction;
}

function buildSignInput(
  payload: Uint8Array,
  previousId: string | null,
  action: string,
  createdAt: number,
): Uint8Array {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [
    payload,
    enc.encode(previousId ?? ''),
    enc.encode(action),
  ];
  const ts = new ArrayBuffer(8);
  new DataView(ts).setBigUint64(0, BigInt(createdAt), false);
  parts.push(new Uint8Array(ts));

  const total = parts.reduce((n, p) => n + p.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) { result.set(p, offset); offset += p.length; }
  return result;
}

function verifyChain(db: Database, n: number): void {
  if (n === 0) return;
  const rows = db.prepare(GET_LAST_N_ENTRIES).all(n) as EntryRow[];
  for (const row of rows) {
    const computed = createHash('sha256').update(row.payload).digest();
    if (!computed.equals(row.payload_hash)) {
      throw new Error(`Chain integrity failure: entry ${row.id} has invalid payload_hash`);
    }
    if (row.previous_id !== null) {
      const exists = db.prepare('SELECT 1 FROM entries WHERE id = ?').get(row.previous_id);
      if (!exists) {
        throw new Error(
          `Chain integrity failure: entry ${row.id} references non-existent previous_id ${row.previous_id}`
        );
      }
    }
  }
}

export class SqliteVault implements MemoryVault {
  private constructor(
    private readonly db: Database,
    private readonly keyManager: KeyManager,
    private readonly embedder?: Embedder,
    private readonly vectorAvailable: boolean = false,
  ) {}

  static async open(options: SqliteVaultOptions): Promise<SqliteVault> {
    const { default: Database } = await import('@signalapp/better-sqlite3');
    const { load: loadVec } = await import('sqlite-vec');

    const dbPath = options.dbPath ?? DEFAULT_DB_PATH;
    const db = new Database(dbPath);

    const hexKey = await deriveSqlcipherKey(options.keyManager);
    applyKey(db, hexKey);

    let vectorAvailable = false;
    try {
      loadVec(db);
      vectorAvailable = true;
    } catch {
      // @signalapp/better-sqlite3 compiles SQLite without SQLITE_ENABLE_LOAD_EXTENSION
      // for security hardening. Vector search falls back to recency ordering.
    }

    runMigrations(db);
    if (vectorAvailable) createVectorTable(db);
    verifyChain(db, options.integrityCheckN ?? 50);

    return new SqliteVault(db, options.keyManager, options.embedder, vectorAvailable);
  }

  close(): void {
    this.db.close();
  }

  async append(content: string): Promise<EntryId> {
    if (!content) throw new Error('content must not be empty');

    const id = randomUUID() as EntryId;
    const payload = await this.keyManager.encrypt(new TextEncoder().encode(content));
    const createdAt = Date.now();
    const action = 'append';

    const prevRow = this.db.prepare(GET_LAST_ENTRY_ID).get() as { id: string } | undefined;
    const previousId: string | null = prevRow?.id ?? null;

    const payloadHash = createHash('sha256').update(payload).digest();
    const signInput = buildSignInput(payload, previousId, action, createdAt);
    const signature = await this.keyManager.sign(signInput);

    const embedding = this.embedder
      ? await this.embedder(content)
      : new Float32Array(768);
    const embeddingBlob = Buffer.from(embedding.buffer);

    const info = this.db.prepare(INSERT_ENTRY).run(
      id, Buffer.from(payload), embeddingBlob, createdAt,
      previousId, action, Buffer.from(signature), payloadHash,
    );

    if (this.vectorAvailable) {
      this.db.prepare(INSERT_VECTOR).run(info.lastInsertRowid, embeddingBlob);
    }

    return id;
  }

  async query(context: string, options?: QueryOptions): Promise<MemoryEntryDecrypted[]> {
    const limit = options?.limit ?? 10;
    let rows: EntryRow[];

    if (this.embedder && this.vectorAvailable) {
      const queryEmbedding = await this.embedder(context);
      const queryBlob = Buffer.from(queryEmbedding.buffer);
      rows = this.db.prepare(ACTIVE_ENTRIES_VECTOR).all(queryBlob, limit * 2, limit) as EntryRow[];
    } else {
      rows = this.db.prepare(ACTIVE_ENTRIES_RECENCY).all(limit) as EntryRow[];
    }

    const results: MemoryEntryDecrypted[] = [];
    for (const row of rows) {
      const contentBytes = await this.keyManager.decrypt(row.payload);
      results.push({
        id: row.id as EntryId,
        content: new TextDecoder().decode(contentBytes),
        createdAt: row.created_at,
        previousId: row.previous_id as EntryId | null,
        action: row.action,
      });
    }
    return results;
  }

  async amend(id: EntryId, content: string): Promise<EntryId> {
    if (!content) throw new Error('content must not be empty');
    if (!this.db.prepare(GET_ENTRY_BY_ID).get(id)) {
      throw new Error(`Entry not found: ${id}`);
    }

    const newId = randomUUID() as EntryId;
    const payload = await this.keyManager.encrypt(new TextEncoder().encode(content));
    const createdAt = Date.now();
    const action = 'amend';

    const payloadHash = createHash('sha256').update(payload).digest();
    const signInput = buildSignInput(payload, id, action, createdAt);
    const signature = await this.keyManager.sign(signInput);

    const embedding = this.embedder
      ? await this.embedder(content)
      : new Float32Array(768);
    const embeddingBlob = Buffer.from(embedding.buffer);

    const info = this.db.prepare(INSERT_ENTRY).run(
      newId, Buffer.from(payload), embeddingBlob, createdAt,
      id, action, Buffer.from(signature), payloadHash,
    );

    if (this.vectorAvailable) {
      this.db.prepare(INSERT_VECTOR).run(info.lastInsertRowid, embeddingBlob);
    }

    return newId;
  }

  async redact(id: EntryId, reason?: string): Promise<EntryId> {
    if (!this.db.prepare(GET_ENTRY_BY_ID).get(id)) {
      throw new Error(`Entry not found: ${id}`);
    }

    const newId = randomUUID() as EntryId;
    const content = reason ?? '';
    const payload = await this.keyManager.encrypt(new TextEncoder().encode(content));
    const createdAt = Date.now();
    const action = 'redact';

    const payloadHash = createHash('sha256').update(payload).digest();
    const signInput = buildSignInput(payload, id, action, createdAt);
    const signature = await this.keyManager.sign(signInput);
    const embeddingBlob = Buffer.from(new Float32Array(768).buffer);

    this.db.prepare(INSERT_ENTRY).run(
      newId, Buffer.from(payload), embeddingBlob, createdAt,
      id, action, Buffer.from(signature), payloadHash,
    );

    return newId;
  }
}
