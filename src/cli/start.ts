import { resolveBackend } from '../keys/platform.js';
import { SqliteVault } from '../vault/SqliteVault.js';
import type { Embedder } from '../vault/SqliteVault.js';
import { OllamaEmbedder } from '../embeddings/OllamaEmbedder.js';
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

  const ollama = new OllamaEmbedder('http://localhost:11434', 'nomic-embed-text');
  const embedder: Embedder = async (content) => {
    try { return await ollama.embed(content); }
    catch { return new Float32Array(768); }
  };

  const vault = await SqliteVault.open({ keyManager, embedder, dbPath: options.vaultPath });
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
