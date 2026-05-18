import { resolveBackend } from '../keys/platform.js';
import type { KeyManagerWithMeta } from '../keys/KeyManager.js';

export async function loadKeyOrAbort(keyPath?: string): Promise<KeyManagerWithMeta> {
  const backend = resolveBackend();
  try {
    return await backend.load(keyPath);
  } catch {
    const err = new Error('key not found. Run `agent-friday init` to set up your vault.');
    (err as NodeJS.ErrnoException).code = 'KEY_NOT_FOUND';
    throw err;
  }
}
