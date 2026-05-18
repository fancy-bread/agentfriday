import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import type { KeyManagerWithMeta, KeyManagerBackend, StorageType } from './KeyManager.js';
import { generateKeypair, encryptData, decryptData, signData, initSodium, type Keypair } from './crypto.js';

const DEFAULT_KEY_PATH = path.join(os.homedir(), '.agent-friday', 'keys', 'keypair');

interface SerializedKeypair {
  signingKey: string;
  signingPub: string;
  encryptionKey: string;
  encryptionPub: string;
}

function serialize(kp: Keypair): SerializedKeypair {
  return {
    signingKey: Buffer.from(kp.signingKey).toString('base64'),
    signingPub: Buffer.from(kp.signingPub).toString('base64'),
    encryptionKey: Buffer.from(kp.encryptionKey).toString('base64'),
    encryptionPub: Buffer.from(kp.encryptionPub).toString('base64'),
  };
}

function deserialize(data: SerializedKeypair): Keypair {
  return {
    signingKey: new Uint8Array(Buffer.from(data.signingKey, 'base64')),
    signingPub: new Uint8Array(Buffer.from(data.signingPub, 'base64')),
    encryptionKey: new Uint8Array(Buffer.from(data.encryptionKey, 'base64')),
    encryptionPub: new Uint8Array(Buffer.from(data.encryptionPub, 'base64')),
  };
}

export class SoftwareKeyManager implements KeyManagerWithMeta {
  private constructor(
    private readonly _keyPath: string,
    private readonly keypair: Keypair
  ) {}

  static async generate(keyPath = DEFAULT_KEY_PATH): Promise<SoftwareKeyManager> {
    if (await SoftwareKeyManager.exists(keyPath)) {
      throw new Error(`Key already exists at ${keyPath}`);
    }
    await initSodium();
    const kp = await generateKeypair();
    await fs.mkdir(path.dirname(keyPath), { recursive: true });
    await fs.writeFile(keyPath, JSON.stringify(serialize(kp), null, 2), { mode: 0o600 });
    return new SoftwareKeyManager(keyPath, kp);
  }

  static async load(keyPath = DEFAULT_KEY_PATH): Promise<SoftwareKeyManager> {
    let data: string;
    try {
      data = await fs.readFile(keyPath, 'utf8');
    } catch {
      throw new Error(`Key not found at ${keyPath}`);
    }
    const kp = deserialize(JSON.parse(data) as SerializedKeypair);
    return new SoftwareKeyManager(keyPath, kp);
  }

  static async delete(keyPath = DEFAULT_KEY_PATH): Promise<void> {
    try {
      await fs.unlink(keyPath);
    } catch {
      // already gone — not an error
    }
  }

  static async exists(keyPath = DEFAULT_KEY_PATH): Promise<boolean> {
    try {
      await fs.access(keyPath);
      return true;
    } catch {
      return false;
    }
  }

  async encrypt(plaintext: Uint8Array): Promise<Uint8Array> {
    return encryptData(plaintext, this.keypair.encryptionKey);
  }

  async decrypt(ciphertext: Uint8Array): Promise<Uint8Array> {
    return decryptData(ciphertext, this.keypair.encryptionKey);
  }

  async sign(message: Uint8Array): Promise<Uint8Array> {
    return signData(message, this.keypair.signingKey);
  }

  async publicKey(): Promise<Uint8Array> {
    return this.keypair.signingPub;
  }

  storageType(): StorageType {
    return 'software';
  }
}

export const SoftwareKeyManagerBackend: KeyManagerBackend = SoftwareKeyManager;
