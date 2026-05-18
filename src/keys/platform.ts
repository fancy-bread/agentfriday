import type { KeyManagerBackend } from './KeyManager.js';
import { SoftwareKeyManager } from './SoftwareKeyManager.js';

/**
 * Returns the KeyManager backend for the current platform.
 *
 * v1: SoftwareKeyManager on all platforms (keys stored at ~/.agent-friday/keys/).
 * v2: KeychainKeyManager on macOS when native node-keytar bindings are available.
 */
export function resolveBackend(): KeyManagerBackend {
  // v2: if (process.platform === 'darwin') return KeychainKeyManager;
  return SoftwareKeyManager;
}
