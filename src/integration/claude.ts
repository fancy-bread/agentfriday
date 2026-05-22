import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import { execSync } from 'child_process';
import type { IntegrationConfig } from './types.js';

export const SKILL_NAMES = ['friday-note', 'friday-recall', 'friday-amend', 'friday-forget'];

export async function installSkills(skillsSourceDir: string, agentsSkillsDir: string): Promise<void> {
  await fs.mkdir(agentsSkillsDir, { recursive: true });
  for (const name of SKILL_NAMES) {
    const targetDir = path.join(agentsSkillsDir, name);
    await fs.mkdir(targetDir, { recursive: true });
    await fs.copyFile(
      path.join(skillsSourceDir, name, 'SKILL.md'),
      path.join(targetDir, 'SKILL.md'),
    );
  }
}

export function checkSkills(agentsSkillsDir: string): boolean {
  return SKILL_NAMES.every(name =>
    existsSync(path.join(agentsSkillsDir, name, 'SKILL.md'))
  );
}

export function registerMcp(): { method: 'cli' | 'manual'; snippet?: string } {
  try {
    execSync('claude mcp add agent-friday -- npx agent-friday start', {
      stdio: 'pipe',
      timeout: 10_000,
    });
    return { method: 'cli' };
  } catch {
    return {
      method: 'manual',
      snippet: JSON.stringify(
        { mcpServers: { 'agent-friday': { command: 'npx', args: ['agent-friday', 'start'] } } },
        null, 2,
      ),
    };
  }
}

export async function checkMcpRegistered(): Promise<boolean | 'unknown'> {
  try {
    const output = execSync('claude mcp list', { stdio: 'pipe', timeout: 2_000 }).toString();
    return output.includes('agent-friday');
  } catch {
    return 'unknown';
  }
}

export const claudeIntegration: IntegrationConfig = {
  name: 'claude',
  displayName: 'Claude Code',

  async installSkills(agentsSkillsDir: string): Promise<void> {
    const packageRoot = path.resolve(fileURLToPath(import.meta.url), '..', '..', '..');
    const skillsSourceDir = path.join(packageRoot, 'skills');
    await installSkills(skillsSourceDir, agentsSkillsDir);
  },

  async registerMcp(): Promise<{ method: 'cli' | 'file' | 'manual'; snippet?: string }> {
    return registerMcp();
  },

  checkMcpRegistered,
};
