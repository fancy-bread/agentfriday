import type { EntryId, MemoryEntryDecrypted, QueryOptions } from './types.js';

export interface MemoryVault {
  append(content: string): Promise<EntryId>;
  query(context: string, options?: QueryOptions): Promise<MemoryEntryDecrypted[]>;
  amend(id: EntryId, content: string): Promise<EntryId>;
  redact(id: EntryId, reason?: string): Promise<EntryId>;
}
