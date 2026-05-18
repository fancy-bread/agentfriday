export interface KeyManager {
  encrypt(plaintext: Uint8Array): Promise<Uint8Array>;
  decrypt(ciphertext: Uint8Array): Promise<Uint8Array>;
  sign(message: Uint8Array): Promise<Uint8Array>;
  publicKey(): Promise<Uint8Array>;
}
