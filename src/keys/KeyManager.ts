export interface KeyManager {
  encrypt(plaintext: Uint8Array): Promise<Uint8Array>;
  decrypt(ciphertext: Uint8Array): Promise<Uint8Array>;
  sign(message: Uint8Array): Promise<Uint8Array>;
  publicKey(): Promise<Uint8Array>;
}

export type StorageType = 'keychain' | 'software';

export interface KeyManagerWithMeta extends KeyManager {
  storageType(): StorageType;
}

export interface KeyManagerBackend {
  load(keyPath?: string): Promise<KeyManagerWithMeta>;
  generate(keyPath?: string): Promise<KeyManagerWithMeta>;
  delete(keyPath?: string): Promise<void>;
  exists(keyPath?: string): Promise<boolean>;
}
