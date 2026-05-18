import { randomUUID } from 'crypto';
import type { KeyManager } from '../../../src/keys/KeyManager.js';
import type { MemoryVault } from '../../../src/vault/MemoryVault.js';
import type { EntryId, EntryAction, MemoryEntryDecrypted, QueryOptions } from '../../../src/vault/types.js';

interface LedgerEntry {
  id: EntryId;
  payload: Uint8Array;       // encrypted
  createdAt: number;
  previousId: EntryId | null;
  action: EntryAction;
  supersededBy: EntryId | null;
}

export class InMemoryVault implements MemoryVault {
  private readonly ledger: LedgerEntry[] = [];
  private readonly index = new Map<EntryId, LedgerEntry>();

  constructor(private readonly keys: KeyManager) {}

  async append(content: string): Promise<EntryId> {
    if (!content) throw new Error('content must not be empty');
    const payload = await this.keys.encrypt(Buffer.from(content, 'utf8'));
    const prev = this.ledger.at(-1) ?? null;
    const entry: LedgerEntry = {
      id: randomUUID() as EntryId,
      payload,
      createdAt: Date.now(),
      previousId: prev?.id ?? null,
      action: 'append',
      supersededBy: null,
    };
    this.ledger.push(entry);
    this.index.set(entry.id, entry);
    return entry.id;
  }

  async query(_context: string, options?: QueryOptions): Promise<MemoryEntryDecrypted[]> {
    const limit = options?.limit ?? 10;
    const active = this.ledger.filter(e =>
      e.action !== 'redact' && e.supersededBy === null
    );
    const results: MemoryEntryDecrypted[] = [];
    for (const e of active.slice(-limit).reverse()) {
      const contentBytes = await this.keys.decrypt(e.payload);
      results.push({
        id: e.id,
        content: Buffer.from(contentBytes).toString('utf8'),
        createdAt: e.createdAt,
        previousId: e.previousId,
        action: e.action,
      });
    }
    return results;
  }

  async amend(id: EntryId, content: string): Promise<EntryId> {
    if (!content) throw new Error('content must not be empty');
    const original = this.index.get(id);
    if (!original) throw new Error(`Entry not found: ${id}`);
    const payload = await this.keys.encrypt(Buffer.from(content, 'utf8'));
    const entry: LedgerEntry = {
      id: randomUUID() as EntryId,
      payload,
      createdAt: Date.now(),
      previousId: id,
      action: 'amend',
      supersededBy: null,
    };
    original.supersededBy = entry.id;
    this.ledger.push(entry);
    this.index.set(entry.id, entry);
    return entry.id;
  }

  async redact(id: EntryId, _reason?: string): Promise<EntryId> {
    const original = this.index.get(id);
    if (!original) throw new Error(`Entry not found: ${id}`);
    const entry: LedgerEntry = {
      id: randomUUID() as EntryId,
      payload: new Uint8Array(0),
      createdAt: Date.now(),
      previousId: id,
      action: 'redact',
      supersededBy: null,
    };
    original.supersededBy = entry.id;
    this.ledger.push(entry);
    this.index.set(entry.id, entry);
    return entry.id;
  }

  /** Expose ledger for chain integrity assertions in tests. */
  getLedger(): ReadonlyArray<Readonly<LedgerEntry>> {
    return this.ledger;
  }
}
