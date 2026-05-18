import type { KeyManager } from '../../../src/keys/KeyManager.js';

const XOR_BYTE = 0xaf;
const FIXED_PUBLIC_KEY = new Uint8Array(32).fill(0x01);

/** XORs every byte with a fixed value — round-trippable, deterministic, not secure. */
export class StubKeyManager implements KeyManager {
  async encrypt(plaintext: Uint8Array): Promise<Uint8Array> {
    return plaintext.map(b => b ^ XOR_BYTE);
  }

  async decrypt(ciphertext: Uint8Array): Promise<Uint8Array> {
    return ciphertext.map(b => b ^ XOR_BYTE);
  }

  async sign(message: Uint8Array): Promise<Uint8Array> {
    return new Uint8Array(message.length).fill(0x42);
  }

  async publicKey(): Promise<Uint8Array> {
    return FIXED_PUBLIC_KEY;
  }
}
