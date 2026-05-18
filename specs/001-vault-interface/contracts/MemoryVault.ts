/**
 * MemoryVault — append-only encrypted memory ledger.
 *
 * All vault operations go through this interface. No implementation detail
 * (SQLite, Keychain, libsodium) may appear here. See constitution Principle IV.
 */

declare const __entryIdBrand: unique symbol;

/** Opaque identifier returned by the vault on every write operation. */
export type EntryId = string & { readonly [__entryIdBrand]: void };

/** The action recorded for a ledger entry. */
export type EntryAction = 'append' | 'amend' | 'redact';

/**
 * Decrypted view of a memory entry.
 * Constructed in-process after decryption; never persisted or transmitted.
 */
export interface MemoryEntryDecrypted {
  readonly id: EntryId;
  readonly content: string;
  readonly createdAt: number;       // Unix timestamp (ms)
  readonly previousId: EntryId | null;
  readonly action: EntryAction;
}

export interface QueryOptions {
  /** Maximum number of entries to return. Defaults to 10. */
  limit?: number;
}

/**
 * MemoryVault — the contract every vault implementation must satisfy.
 *
 * Invariants (enforced at this level, not by implementations):
 *   - No operation may delete or modify a persisted entry.
 *   - append/amend/redact each produce a new ledger entry referencing its predecessor.
 *   - query returns only active entries (not superseded by amend or redact).
 */
export interface MemoryVault {
  /**
   * Store a new encrypted memory entry.
   * @param content  Non-empty plaintext string. Encrypted before storage.
   * @returns        Unique identifier for the new entry.
   * @throws         If content is empty, or encryption fails.
   */
  append(content: string): Promise<EntryId>;

  /**
   * Retrieve entries semantically relevant to a context string.
   * Results are ranked by semantic similarity (falling back to recency if
   * the embedding service is unavailable). Redacted and superseded entries
   * are excluded.
   * @param context  Free-text query string.
   * @param options  Optional query parameters.
   * @returns        Ranked list of decrypted active entries.
   */
  query(context: string, options?: QueryOptions): Promise<MemoryEntryDecrypted[]>;

  /**
   * Replace an outdated memory entry.
   * The original entry is preserved in the ledger but excluded from future queries.
   * @param id       Identifier of the entry to supersede.
   * @param content  Replacement plaintext string. Encrypted before storage.
   * @returns        Unique identifier for the new (amended) entry.
   * @throws         If id does not exist, content is empty, or encryption fails.
   */
  amend(id: EntryId, content: string): Promise<EntryId>;

  /**
   * Mark a memory entry as forgotten.
   * The original entry is preserved in the ledger but excluded from all future queries.
   * @param id      Identifier of the entry to redact.
   * @param reason  Optional human-readable reason (encrypted with the entry).
   * @returns       Unique identifier for the redaction record.
   * @throws        If id does not exist.
   */
  redact(id: EntryId, reason?: string): Promise<EntryId>;
}
