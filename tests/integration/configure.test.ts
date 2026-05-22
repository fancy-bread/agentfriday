import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';
import { SoftwareKeyManager } from '../../src/keys/SoftwareKeyManager.js';
import { runConfigure } from '../../src/cli/configure.js';
import { registerCursorMcp, checkCursorMcpRegistered } from '../../src/integration/cursor.js';
import { SKILL_NAMES } from '../../src/integration/claude.js';

async function makeSourceSkills(dir: string): Promise<void> {
  for (const name of SKILL_NAMES) {
    await mkdir(path.join(dir, name), { recursive: true });
    await writeFile(path.join(dir, name, 'SKILL.md'), `---\nname: ${name}\ndescription: stub\n---\n`);
  }
}

describe('runConfigure', () => {
  let tmpDir: string;
  let keyPath: string;
  let agentsSkillsDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'af-configure-'));
    keyPath = path.join(tmpDir, 'keypair');
    agentsSkillsDir = path.join(tmpDir, 'agents', 'skills');
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('throws for unknown integration name', async () => {
    await SoftwareKeyManager.generate(keyPath);
    await expect(
      runConfigure({ integration: 'unknown-tool', keyPath, agentsSkillsDir }),
    ).rejects.toThrow('Unknown integration');
  });

  it('throws when vault is not initialised', async () => {
    await expect(
      runConfigure({ integration: 'claude', keyPath, agentsSkillsDir }),
    ).rejects.toThrow('agent-friday init');
  });

  it('installs skills to agentsSkillsDir when vault exists (cursor)', async () => {
    await SoftwareKeyManager.generate(keyPath);
    const cursorMcpPath = path.join(tmpDir, 'cursor-mcp.json');

    const { cursorIntegration } = await import('../../src/integration/cursor.js');
    const realInstall = cursorIntegration.installSkills.bind(cursorIntegration);
    cursorIntegration.installSkills = async (dir: string) => {
      await makeSourceSkills(path.join(tmpDir, 'skills-src'));
      const { installSkills } = await import('../../src/integration/claude.js');
      await installSkills(path.join(tmpDir, 'skills-src'), dir);
    };
    cursorIntegration.registerMcp = async () => {
      return registerCursorMcp(cursorMcpPath);
    };

    try {
      await runConfigure({ integration: 'cursor', keyPath, agentsSkillsDir });
    } finally {
      cursorIntegration.installSkills = realInstall;
    }

    for (const name of SKILL_NAMES) {
      expect(existsSync(path.join(agentsSkillsDir, name, 'SKILL.md'))).toBe(true);
    }
    expect(existsSync(cursorMcpPath)).toBe(true);
    const config = JSON.parse(await readFile(cursorMcpPath, 'utf-8')) as {
      mcpServers: Record<string, unknown>;
    };
    expect(config.mcpServers['agent-friday']).toBeDefined();
  });
});

describe('registerCursorMcp', () => {
  let tmpDir: string;
  let mcpPath: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'af-cursor-'));
    mcpPath = path.join(tmpDir, 'mcp.json');
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('creates mcp.json when absent', async () => {
    const result = await registerCursorMcp(mcpPath);
    expect(result.method).toBe('file');
    expect(existsSync(mcpPath)).toBe(true);
    const config = JSON.parse(await readFile(mcpPath, 'utf-8')) as {
      mcpServers: Record<string, unknown>;
    };
    expect(config.mcpServers['agent-friday']).toBeDefined();
  });

  it('merges into existing mcp.json without overwriting other entries', async () => {
    await writeFile(
      mcpPath,
      JSON.stringify({ mcpServers: { 'other-tool': { command: 'other' } } }, null, 2),
    );
    await registerCursorMcp(mcpPath);
    const config = JSON.parse(await readFile(mcpPath, 'utf-8')) as {
      mcpServers: Record<string, unknown>;
    };
    expect(config.mcpServers['agent-friday']).toBeDefined();
    expect(config.mcpServers['other-tool']).toBeDefined();
  });

  it('returns manual snippet for malformed JSON without overwriting', async () => {
    await writeFile(mcpPath, 'not-valid-json{{{');
    const result = await registerCursorMcp(mcpPath);
    expect(result.method).toBe('manual');
    expect(result.snippet).toBeDefined();
    const raw = await readFile(mcpPath, 'utf-8');
    expect(raw).toBe('not-valid-json{{{');
  });

  it('is idempotent — re-running does not duplicate entry', async () => {
    await registerCursorMcp(mcpPath);
    await registerCursorMcp(mcpPath);
    const config = JSON.parse(await readFile(mcpPath, 'utf-8')) as {
      mcpServers: Record<string, unknown>;
    };
    const keys = Object.keys(config.mcpServers).filter(k => k === 'agent-friday');
    expect(keys).toHaveLength(1);
  });

  it('checkCursorMcpRegistered returns false when file absent', async () => {
    expect(await checkCursorMcpRegistered(mcpPath)).toBe(false);
  });

  it('checkCursorMcpRegistered returns true after registration', async () => {
    await registerCursorMcp(mcpPath);
    expect(await checkCursorMcpRegistered(mcpPath)).toBe(true);
  });
});
