/**
 * KeychainKeyManager — macOS Keychain-backed KeyManager implementation.
 *
 * Stores the keypair in the macOS Keychain under:
 *   service:  io.agentfriday.vault
 *   account:  keypair
 *
 * Key material is base64-encoded before storage and decoded on load.
 * All cryptographic operations delegate to libsodium-wrappers.
 *
 * Reports storageType = 'keychain'.
 */

import type { KeyManager } from '../../src/keys/KeyManager.js';

export type StorageType = 'keychain' | 'software';

export interface KeyManagerWithMeta extends KeyManager {
  /** Human-readable storage type for status reporting. */
  storageType(): StorageType;
}

export class KeychainKeyManager implements KeyManagerWithMeta {
  /** Load keypair from Keychain. Throws if not found. */
  static async load(): Promise<KeychainKeyManager> { throw new Error('not implemented'); }

  /** Generate and store a new keypair. Throws if one already exists. */
  static async generate(): Promise<KeychainKeyManager> { throw new Error('not implemented'); }

  /** Remove the keypair from Keychain. Used for rollback only. */
  static async delete(): Promise<void> { throw new Error('not implemented'); }

  /** True if a keypair exists in Keychain. */
  static async exists(): Promise<boolean> { throw new Error('not implemented'); }

  async encrypt(plaintext: Uint8Array): Promise<Uint8Array> { throw new Error('not implemented'); }
  async decrypt(ciphertext: Uint8Array): Promise<Uint8Array> { throw new Error('not implemented'); }
  async sign(message: Uint8Array): Promise<Uint8Array> { throw new Error('not implemented'); }
  async publicKey(): Promise<Uint8Array> { throw new Error('not implemented'); }
  storageType(): StorageType { return 'keychain'; }
}
