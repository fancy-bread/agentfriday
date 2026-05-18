import { hkdfSync } from 'crypto';
import type { Database } from 'better-sqlite3';
import type { KeyManager } from '../keys/KeyManager.js';

/**
 * Derives a 32-byte SQLCipher database key from the KeyManager.
 *
 * Uses the Ed25519 signature of a known constant as high-entropy input,
 * then applies HKDF-SHA256 with context 'agent-friday-sqlcipher-v1'.
 * This context is distinct from the entry encryption context
 * ('agent-friday-vault-v1'), ensuring key independence.
 */
export async function deriveSqlcipherKey(keyManager: KeyManager): Promise<string> {
  const constant = new TextEncoder().encode('agent-friday-sqlcipher-key-derivation-v1');
  const signature = await keyManager.sign(constant);
  const key = hkdfSync('sha256', signature, Buffer.alloc(32), 'agent-friday-sqlcipher-v1', 32);
  return Buffer.from(key).toString('hex');
}

export function applyKey(db: Database, hexKey: string): void {
  db.exec(`PRAGMA key = "x'${hexKey}'"`);
}
