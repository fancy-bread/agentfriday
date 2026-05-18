declare const __entryIdBrand: unique symbol;

/** Opaque identifier assigned by the vault on every write. */
export type EntryId = string & { readonly [__entryIdBrand]: void };

export type EntryAction = 'append' | 'amend' | 'redact';

/** Decrypted view of a memory entry — in-process only, never persisted. */
export interface MemoryEntryDecrypted {
  readonly id: EntryId;
  readonly content: string;
  readonly createdAt: number;
  readonly previousId: EntryId | null;
  readonly action: EntryAction;
}

export interface QueryOptions {
  limit?: number;
}
