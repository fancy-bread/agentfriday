import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { createMcpServer } from '../../../src/mcp/server.js';
import { openVault, closeVault } from '../../integration/helpers/openVault.js';
import type { SqliteVault } from '../../../src/vault/SqliteVault.js';

export interface ServerFixture {
  client: Client;
  server: McpServer;
  vault: SqliteVault;
  tmpDir: string;
}

export async function openServer(): Promise<ServerFixture> {
  const vaultFixture = await openVault();
  const server = createMcpServer(vaultFixture.vault);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: 'test-client', version: '1.0.0' });
  await client.connect(clientTransport);
  return {
    client,
    server,
    vault: vaultFixture.vault,
    tmpDir: vaultFixture.tmpDir,
  };
}

export async function closeServer(f: ServerFixture): Promise<void> {
  await f.client.close();
  await f.server.close();
  f.vault.close();
  const { rm } = await import('fs/promises');
  await rm(f.tmpDir, { recursive: true, force: true });
}
