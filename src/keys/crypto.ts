import sodium from 'libsodium-wrappers';
import { createHash, hkdfSync } from 'crypto';

let _ready = false;

export async function initSodium(): Promise<typeof sodium> {
  if (!_ready) {
    await sodium.ready;
    _ready = true;
  }
  return sodium;
}

export interface Keypair {
  signingKey: Uint8Array;
  signingPub: Uint8Array;
  encryptionKey: Uint8Array;
  encryptionPub: Uint8Array;
}

export async function generateKeypair(): Promise<Keypair> {
  const s = await initSodium();
  const sigPair = s.crypto_sign_keypair();
  const encPair = s.crypto_box_keypair();
  return {
    signingKey: sigPair.privateKey,
    signingPub: sigPair.publicKey,
    encryptionKey: encPair.privateKey,
    encryptionPub: encPair.publicKey,
  };
}

function deriveSymmetricKey(encryptionKey: Uint8Array): Uint8Array {
  return new Uint8Array(
    hkdfSync('sha256', encryptionKey, Buffer.alloc(32), 'agent-friday-vault-v1', 32)
  );
}

export async function encryptData(plaintext: Uint8Array, encryptionKey: Uint8Array): Promise<Uint8Array> {
  const s = await initSodium();
  const symKey = deriveSymmetricKey(encryptionKey);
  const nonce = s.randombytes_buf(s.crypto_secretbox_NONCEBYTES);
  const ciphertext = s.crypto_secretbox_easy(plaintext, nonce, symKey);
  const out = new Uint8Array(nonce.length + ciphertext.length);
  out.set(nonce, 0);
  out.set(ciphertext, nonce.length);
  return out;
}

export async function decryptData(data: Uint8Array, encryptionKey: Uint8Array): Promise<Uint8Array> {
  const s = await initSodium();
  const nonceLen = s.crypto_secretbox_NONCEBYTES;
  const nonce = data.slice(0, nonceLen);
  const ciphertext = data.slice(nonceLen);
  const symKey = deriveSymmetricKey(encryptionKey);
  const result = s.crypto_secretbox_open_easy(ciphertext, nonce, symKey);
  if (!result) throw new Error('Decryption failed: invalid ciphertext or wrong key');
  return result;
}

export async function signData(message: Uint8Array, signingKey: Uint8Array): Promise<Uint8Array> {
  const s = await initSodium();
  return s.crypto_sign_detached(message, signingKey);
}

export async function fingerprint(publicKey: Uint8Array): Promise<string> {
  const hash = createHash('sha256').update(publicKey).digest();
  return Array.from(hash.slice(0, 16))
    .map(b => b.toString(16).padStart(2, '0'))
    .join(':');
}
