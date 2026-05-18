import type { KeyManagerWithMeta, StorageType } from './KeyManager.js';

/**
 * KeychainKeyManager — macOS Keychain-backed KeyManager.
 *
 * v1 stub: architecture is in place for v2 native bindings.
 * platform.ts routes to SoftwareKeyManager for v1.
 * v2: implement using node-keytar with service io.agentfriday.vault.
 */
export class KeychainKeyManager implements KeyManagerWithMeta {
  static async generate(): Promise<never> {
    throw new Error('KeychainKeyManager: native Keychain bindings not available in v1');
  }

  static async load(): Promise<never> {
    throw new Error('KeychainKeyManager: native Keychain bindings not available in v1');
  }

  static async delete(): Promise<void> {
    throw new Error('KeychainKeyManager: native Keychain bindings not available in v1');
  }

  static async exists(): Promise<boolean> {
    return false;
  }

  async encrypt(_plaintext: Uint8Array): Promise<Uint8Array> {
    throw new Error('not implemented');
  }

  async decrypt(_ciphertext: Uint8Array): Promise<Uint8Array> {
    throw new Error('not implemented');
  }

  async sign(_message: Uint8Array): Promise<Uint8Array> {
    throw new Error('not implemented');
  }

  async publicKey(): Promise<Uint8Array> {
    throw new Error('not implemented');
  }

  storageType(): StorageType {
    return 'keychain';
  }
}
