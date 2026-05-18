/**
 * SoftwareKeyManager — file-backed KeyManager implementation.
 *
 * Stores the keypair at ~/.agent-friday/keys/keypair with permissions 0600.
 * Key bytes are base64-encoded JSON. Used on non-macOS or as a fallback.
 *
 * Reports storageType = 'software'.
 */

import type { KeyManagerWithMeta, StorageType } from './KeychainKeyManager.js';

export class SoftwareKeyManager implements KeyManagerWithMeta {
  /** Load keypair from file. Throws if not found. */
  static async load(): Promise<SoftwareKeyManager> { throw new Error('not implemented'); }

  /** Generate and store a new keypair. Throws if file already exists. */
  static async generate(): Promise<SoftwareKeyManager> { throw new Error('not implemented'); }

  /** Delete the keypair file. Used for rollback only. */
  static async delete(): Promise<void> { throw new Error('not implemented'); }

  /** True if the keypair file exists and is readable. */
  static async exists(): Promise<boolean> { throw new Error('not implemented'); }

  async encrypt(plaintext: Uint8Array): Promise<Uint8Array> { throw new Error('not implemented'); }
  async decrypt(ciphertext: Uint8Array): Promise<Uint8Array> { throw new Error('not implemented'); }
  async sign(message: Uint8Array): Promise<Uint8Array> { throw new Error('not implemented'); }
  async publicKey(): Promise<Uint8Array> { throw new Error('not implemented'); }
  storageType(): StorageType { return 'software'; }
}
