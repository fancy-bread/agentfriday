import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';
import { SoftwareKeyManager } from '../../src/keys/SoftwareKeyManager.js';
import { runConfigure, injectAgentsMd } from '../../src/cli/configure.js';
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

describe('injectAgentsMd', () => {
  let tmpDir: string;
  let agentsMdPath: string;
  let assetsDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'af-inject-'));
    agentsMdPath = path.join(tmpDir, 'AGENTS.md');
    assetsDir = path.join(tmpDir, 'assets');
    await mkdir(assetsDir);
    await writeFile(path.join(assetsDir, 'agents.md'), '## Friday\nTest content.\n');
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('creates AGENTS.md when absent with Friday section', async () => {
    await injectAgentsMd(agentsMdPath, assetsDir);
    expect(existsSync(agentsMdPath)).toBe(true);
    const content = await readFile(agentsMdPath, 'utf-8');
    expect(content).toContain('<!-- agent-friday:start -->');
    expect(content).toContain('<!-- agent-friday:version:1 -->');
    expect(content).toContain('<!-- agent-friday:end -->');
    expect(content).toContain('## Friday');
  });

  it('appends Friday section to existing AGENTS.md preserving prior content', async () => {
    await writeFile(agentsMdPath, '# Project Rules\n\nDo not break things.\n');
    await injectAgentsMd(agentsMdPath, assetsDir);
    const content = await readFile(agentsMdPath, 'utf-8');
    expect(content).toContain('# Project Rules');
    expect(content).toContain('Do not break things.');
    expect(content).toContain('<!-- agent-friday:start -->');
    expect(content).toContain('## Friday');
  });

  it('replaces existing Friday section on re-run without duplication', async () => {
    await injectAgentsMd(agentsMdPath, assetsDir);
    await injectAgentsMd(agentsMdPath, assetsDir);
    const content = await readFile(agentsMdPath, 'utf-8');
    const startCount = (content.match(/<!-- agent-friday:start -->/g) ?? []).length;
    const endCount = (content.match(/<!-- agent-friday:end -->/g) ?? []).length;
    expect(startCount).toBe(1);
    expect(endCount).toBe(1);
  });

  it('preserves content outside markers when replacing', async () => {
    await writeFile(agentsMdPath, '# Project Rules\n\nDo not break things.\n');
    await injectAgentsMd(agentsMdPath, assetsDir);
    await writeFile(path.join(assetsDir, 'agents.md'), '## Friday\nUpdated content.\n');
    await injectAgentsMd(agentsMdPath, assetsDir);
    const content = await readFile(agentsMdPath, 'utf-8');
    expect(content).toContain('# Project Rules');
    expect(content).toContain('Updated content.');
    expect(content).not.toContain('Test content.');
  });

  it('produces identical output for claude and cursor (same utility)', async () => {
    const pathA = path.join(tmpDir, 'AGENTS-claude.md');
    const pathB = path.join(tmpDir, 'AGENTS-cursor.md');
    await injectAgentsMd(pathA, assetsDir);
    await injectAgentsMd(pathB, assetsDir);
    const contentA = await readFile(pathA, 'utf-8');
    const contentB = await readFile(pathB, 'utf-8');
    expect(contentA).toBe(contentB);
  });
});
