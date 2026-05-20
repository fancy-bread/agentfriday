import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export const SKILL_NAMES = ['friday-note', 'friday-recall', 'friday-amend', 'friday-forget'];

export async function installSkills(skillsSourceDir: string, claudeSkillsDir: string): Promise<void> {
  await fs.mkdir(claudeSkillsDir, { recursive: true });
  for (const name of SKILL_NAMES) {
    const targetDir = path.join(claudeSkillsDir, name);
    await fs.mkdir(targetDir, { recursive: true });
    await fs.copyFile(
      path.join(skillsSourceDir, name, 'SKILL.md'),
      path.join(targetDir, 'SKILL.md'),
    );
  }
}

export function checkSkills(claudeSkillsDir: string): boolean {
  return SKILL_NAMES.every(name =>
    existsSync(path.join(claudeSkillsDir, name, 'SKILL.md'))
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

export function checkMcpRegistered(): boolean | 'unknown' {
  try {
    const output = execSync('claude mcp list', { stdio: 'pipe', timeout: 2_000 }).toString();
    return output.includes('agent-friday');
  } catch {
    return 'unknown';
  }
}
