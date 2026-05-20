import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { MemoryVault } from '../vault/MemoryVault.js';
import type { EntryId } from '../vault/types.js';

function text(payload: unknown): { content: [{ type: 'text'; text: string }] } {
  return { content: [{ type: 'text', text: JSON.stringify(payload) }] };
}

export function createMcpServer(vault: MemoryVault): McpServer {
  const server = new McpServer({ name: 'agent-friday', version: '0.1.0' });

  server.registerTool(
    'memory_append',
    {
      description: 'Store an encrypted memory entry in the vault.',
      inputSchema: { content: z.string().min(1, 'content must not be empty') },
    },
    async ({ content }) => {
      const id = await vault.append(content);
      return text({ id });
    },
  );

  server.registerTool(
    'memory_query',
    {
      description: 'Retrieve memory entries semantically relevant to a context string.',
      inputSchema: {
        context: z.string().min(1, 'context must not be empty'),
        limit: z.number().int().min(1).optional(),
      },
    },
    async ({ context, limit }) => {
      const entries = await vault.query(context, { limit });
      return text({ entries });
    },
  );

  server.registerTool(
    'memory_amend',
    {
      description: 'Replace an existing memory entry. The old entry remains in the ledger.',
      inputSchema: {
        id: z.string(),
        content: z.string().min(1, 'content must not be empty'),
      },
    },
    async ({ id, content }) => {
      const newId = await vault.amend(id as EntryId, content);
      return text({ id: newId });
    },
  );

  server.registerTool(
    'memory_redact',
    {
      description: 'Mark a memory entry as forgotten. Excluded from all future queries.',
      inputSchema: {
        id: z.string(),
        reason: z.string().optional(),
      },
    },
    async ({ id, reason }) => {
      const redactId = await vault.redact(id as EntryId, reason);
      return text({ id: redactId });
    },
  );

  return server;
}
