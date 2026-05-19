import { resolveBackend } from '../keys/platform.js';
import { SqliteVault } from '../vault/SqliteVault.js';
import { createMcpServer } from '../mcp/server.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
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

export async function runStart(options: { vaultPath?: string; keyPath?: string } = {}): Promise<void> {
  const keyManager = await loadKeyOrAbort(options.keyPath);
  const vault = await SqliteVault.open({ keyManager, dbPath: options.vaultPath });
  const server = createMcpServer(vault);

  const shutdown = (): void => {
    vault.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  server.server.onclose = shutdown;

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
