/**
 * KeyManager — cryptographic operations interface.
 *
 * Injected into the vault at construction. The vault delegates all
 * encryption, decryption, and signing to this interface. No key material
 * may pass through the vault layer. See constitution Principle III.
 */

export interface KeyManager {
  /**
   * Encrypt plaintext bytes. Returns ciphertext (nonce prepended).
   * @throws If the key is unavailable or encryption fails.
   */
  encrypt(plaintext: Uint8Array): Promise<Uint8Array>;

  /**
   * Decrypt ciphertext bytes produced by encrypt().
   * @throws If the key is unavailable, ciphertext is corrupt, or MAC fails.
   */
  decrypt(ciphertext: Uint8Array): Promise<Uint8Array>;

  /**
   * Sign a message with the user's private key.
   * @returns Ed25519 signature bytes.
   * @throws  If the key is unavailable.
   */
  sign(message: Uint8Array): Promise<Uint8Array>;

  /**
   * Return the raw public key bytes corresponding to the signing key.
   * Safe to expose — used for identity verification and MCP metadata.
   */
  publicKey(): Promise<Uint8Array>;
}
