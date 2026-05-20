import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';
import { installSkills, checkSkills, SKILL_NAMES } from '../../src/integration/claude.js';

async function makeSourceSkills(dir: string): Promise<void> {
  for (const name of SKILL_NAMES) {
    await mkdir(path.join(dir, name), { recursive: true });
    await writeFile(path.join(dir, name, 'SKILL.md'), `---\nname: ${name}\ndescription: stub\n---\n`);
  }
}

describe('installSkills', () => {
  let sourceDir: string;
  let targetDir: string;

  beforeEach(async () => {
    sourceDir = await mkdtemp(path.join(os.tmpdir(), 'af-skills-src-'));
    targetDir = await mkdtemp(path.join(os.tmpdir(), 'af-skills-tgt-'));
    await makeSourceSkills(sourceDir);
  });

  afterEach(async () => {
    await rm(sourceDir, { recursive: true, force: true });
    await rm(targetDir, { recursive: true, force: true });
  });

  it('copies all 4 skill SKILL.md files to target', async () => {
    await installSkills(sourceDir, targetDir);
    for (const name of SKILL_NAMES) {
      expect(existsSync(path.join(targetDir, name, 'SKILL.md'))).toBe(true);
    }
  });

  it('creates target directory if absent', async () => {
    const newTarget = path.join(targetDir, 'nested', 'claude', 'skills');
    await installSkills(sourceDir, newTarget);
    expect(existsSync(path.join(newTarget, 'friday-note', 'SKILL.md'))).toBe(true);
  });

  it('overwrites existing files on re-run (idempotency)', async () => {
    await installSkills(sourceDir, targetDir);
    const skillPath = path.join(targetDir, 'friday-note', 'SKILL.md');
    await writeFile(skillPath, 'old content');
    await installSkills(sourceDir, targetDir);
    const content = await readFile(skillPath, 'utf8');
    expect(content).toContain('friday-note');
    expect(content).not.toBe('old content');
  });
});

describe('checkSkills', () => {
  let targetDir: string;
  let sourceDir: string;

  beforeEach(async () => {
    sourceDir = await mkdtemp(path.join(os.tmpdir(), 'af-skills-src-'));
    targetDir = await mkdtemp(path.join(os.tmpdir(), 'af-skills-tgt-'));
    await makeSourceSkills(sourceDir);
  });

  afterEach(async () => {
    await rm(sourceDir, { recursive: true, force: true });
    await rm(targetDir, { recursive: true, force: true });
  });

  it('returns false before install', () => {
    expect(checkSkills(targetDir)).toBe(false);
  });

  it('returns true after install', async () => {
    await installSkills(sourceDir, targetDir);
    expect(checkSkills(targetDir)).toBe(true);
  });

  it('returns false when only some skills are installed', async () => {
    await mkdir(path.join(targetDir, 'friday-note'), { recursive: true });
    await writeFile(path.join(targetDir, 'friday-note', 'SKILL.md'), '---\nname: friday-note\n---\n');
    expect(checkSkills(targetDir)).toBe(false);
  });
});
