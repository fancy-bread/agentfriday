import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import os from 'os';
import { installSkills } from './claude.js';
import type { IntegrationConfig } from './types.js';

export const DEFAULT_CURSOR_MCP_PATH = path.join(os.homedir(), '.cursor', 'mcp.json');

const MCP_ENTRY = {
  command: 'npx',
  args: ['agent-friday', 'start'],
};

export function buildManualSnippet(): string {
  return JSON.stringify({ mcpServers: { 'agent-friday': MCP_ENTRY } }, null, 2);
}

export async function registerCursorMcp(
  configPath = DEFAULT_CURSOR_MCP_PATH,
): Promise<{ method: 'file' | 'manual'; snippet?: string }> {
  let existing: Record<string, unknown> = {};

  if (existsSync(configPath)) {
    const raw = await fs.readFile(configPath, 'utf-8');
    try {
      existing = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return { method: 'manual', snippet: buildManualSnippet() };
    }
  }

  const mcpServers = (existing.mcpServers ?? {}) as Record<string, unknown>;
  mcpServers['agent-friday'] = MCP_ENTRY;
  existing.mcpServers = mcpServers;

  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(existing, null, 2), 'utf-8');

  return { method: 'file' };
}

export async function checkCursorMcpRegistered(
  configPath = DEFAULT_CURSOR_MCP_PATH,
): Promise<boolean> {
  if (!existsSync(configPath)) return false;
  try {
    const raw = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(raw) as Record<string, unknown>;
    const servers = config.mcpServers as Record<string, unknown> | undefined;
    return servers !== undefined && 'agent-friday' in servers;
  } catch {
    return false;
  }
}

export const cursorIntegration: IntegrationConfig = {
  name: 'cursor',
  displayName: 'Cursor',

  async installSkills(agentsSkillsDir: string): Promise<void> {
    const packageRoot = path.resolve(fileURLToPath(import.meta.url), '..', '..', '..');
    const skillsSourceDir = path.join(packageRoot, 'skills');
    await installSkills(skillsSourceDir, agentsSkillsDir);
  },

  registerMcp(): Promise<{ method: 'cli' | 'file' | 'manual'; snippet?: string }> {
    return registerCursorMcp();
  },

  checkMcpRegistered(): Promise<boolean | 'unknown'> {
    return checkCursorMcpRegistered();
  },
};
