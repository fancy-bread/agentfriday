import path from 'path';
import os from 'os';
import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolveBackend } from '../keys/platform.js';
import { INTEGRATIONS } from '../integration/registry.js';

const MARKER_START = '<!-- agent-friday:start -->';
const MARKER_VERSION = '<!-- agent-friday:version:1 -->';
const MARKER_END = '<!-- agent-friday:end -->';

export async function injectAgentsMd(targetPath: string, assetsDir?: string): Promise<void> {
  const packageRoot = path.resolve(fileURLToPath(import.meta.url), '..', '..', '..');
  const agentsMdPath = assetsDir
    ? path.join(assetsDir, 'agents.md')
    : path.join(packageRoot, 'src', 'assets', 'agents.md');

  const template = await readFile(agentsMdPath, 'utf-8');
  const section = `${MARKER_START}\n${MARKER_VERSION}\n${template.trimEnd()}\n${MARKER_END}`;

  if (!existsSync(targetPath)) {
    await writeFile(targetPath, section + '\n', 'utf-8');
    return;
  }

  const existing = await readFile(targetPath, 'utf-8');
  const startIdx = existing.indexOf(MARKER_START);
  const endIdx = existing.indexOf(MARKER_END);

  if (startIdx !== -1 && endIdx !== -1) {
    const updated =
      existing.slice(0, startIdx) +
      section +
      existing.slice(endIdx + MARKER_END.length);
    await writeFile(targetPath, updated, 'utf-8');
  } else {
    const separator = existing.endsWith('\n') ? '\n' : '\n\n';
    await writeFile(targetPath, existing + separator + section + '\n', 'utf-8');
  }
}

export interface ConfigureOptions {
  integration: string;
  agentsSkillsDir?: string;
  keyPath?: string;
  agentsMdPath?: string;
  agentsAssetsDir?: string;
}

export async function runConfigure(options: ConfigureOptions): Promise<void> {
  const integration = INTEGRATIONS[options.integration];
  if (!integration) {
    const supported = Object.keys(INTEGRATIONS).join(', ');
    console.error(`Unknown integration. Supported: ${supported}`);
    throw new Error(`Unknown integration: ${options.integration}`);
  }

  const backend = resolveBackend();
  const exists = await backend.exists(options.keyPath);
  if (!exists) {
    console.error('Run `agent-friday init` first.');
    throw new Error('Run `agent-friday init` first.');
  }

  const agentsSkillsDir = options.agentsSkillsDir ?? path.join(os.homedir(), '.agents', 'skills');

  await integration.installSkills(agentsSkillsDir);
  console.log(`✓ Skills installed to ${agentsSkillsDir}`);

  const result = await integration.registerMcp();
  if (result.method === 'cli' || result.method === 'file') {
    console.log(`✓ Memory service registered with ${integration.displayName}`);
  } else {
    console.log(`⚠ Could not register automatically. Add this to the config manually:`);
    console.log('');
    console.log(result.snippet);
  }

  const agentsMdTarget = options.agentsMdPath ?? path.join(process.cwd(), 'AGENTS.md');
  await injectAgentsMd(agentsMdTarget, options.agentsAssetsDir);
  console.log(`✓ Friday behavioral layer injected into ${agentsMdTarget}`);
}
