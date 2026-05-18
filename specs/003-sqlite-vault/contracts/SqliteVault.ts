/**
 * SqliteVault — SQLCipher-backed MemoryVault implementation.
 *
 * Implements the MemoryVault interface from 001-vault-interface.
 * All cryptographic operations delegate to the injected KeyManager.
 * All writes are INSERT-only; no UPDATE or DELETE is ever executed.
 */

import type { MemoryVault } from '../../src/vault/MemoryVault.js';
import type { EntryId, MemoryEntryDecrypted, QueryOptions } from '../../src/vault/types.js';
import type { KeyManager } from '../../src/keys/KeyManager.js';
import path from 'path';
import os from 'os';

/** Function that converts plaintext content to a 768-dimensional embedding vector. */
export type Embedder = (content: string) => Promise<Float32Array>;

export interface SqliteVaultOptions {
  /**
   * Absolute path to the vault database file.
   * Default: ~/.agent-friday/vault.db
   */
  dbPath?: string;

  /**
   * KeyManager instance for encrypt/decrypt/sign operations.
   * Required.
   */
  keyManager: KeyManager;

  /**
   * Optional function to generate embeddings for vector search.
   * When absent, append stores a zero vector and query returns results
   * ordered by recency (created_at DESC).
   */
  embedder?: Embedder;

  /**
   * Number of recent entries to verify during startup chain integrity check.
   * Default: 50. Set to 0 to skip (not recommended).
   */
  integrityCheckN?: number;
}

export const DEFAULT_DB_PATH = path.join(os.homedir(), '.agent-friday', 'vault.db');

export class SqliteVault implements MemoryVault {
  /**
   * Open (or create) the vault database.
   *
   * On open:
   * 1. Apply SQLCipher key (derived from KeyManager via HKDF)
   * 2. Run schema migrations (idempotent)
   * 3. Verify chain integrity for last N entries
   *
   * Throws if the database cannot be opened, schema migration fails, or
   * chain integrity check fails.
   */
  static async open(options: SqliteVaultOptions): Promise<SqliteVault> {
    throw new Error('not implemented');
  }

  /**
   * Close the database connection. Must be called when the vault is no
   * longer needed to release file locks.
   */
  close(): void {
    throw new Error('not implemented');
  }

  async append(content: string): Promise<EntryId> {
    throw new Error('not implemented');
  }

  async query(context: string, options?: QueryOptions): Promise<MemoryEntryDecrypted[]> {
    throw new Error('not implemented');
  }

  async amend(id: EntryId, content: string): Promise<EntryId> {
    throw new Error('not implemented');
  }

  async redact(id: EntryId, reason?: string): Promise<EntryId> {
    throw new Error('not implemented');
  }
}
