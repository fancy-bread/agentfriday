import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { resolveBackend } from '../keys/platform.js';
import { fingerprint } from '../keys/crypto.js';
import type { StorageType } from '../keys/KeyManager.js';
import { checkSkills, checkMcpRegistered } from '../integration/claude.js';

export interface StatusResult {
  fingerprint: string | null;
  storageType: StorageType | null;
  vaultPath: string;
  keyAccessible: boolean;
  chainIntact: boolean;
}

const DEFAULT_VAULT_PATH = path.join(os.homedir(), '.agent-friday', 'vault.db');
const CLAUDE_SKILLS_DIR = path.join(os.homedir(), '.claude', 'skills');

const HINT = '  →  run: agent-friday init --integration claude';

export async function runStatus(options: { vaultPath?: string; keyPath?: string } = {}): Promise<StatusResult> {
  const backend = resolveBackend();
  const vaultPath = options.vaultPath ?? DEFAULT_VAULT_PATH;

  let fp: string | null = null;
  let storageType: StorageType | null = null;
  let keyAccessible = false;

  try {
    const km = await backend.load(options.keyPath);
    const pub = await km.publicKey();
    fp = await fingerprint(pub);
    storageType = km.storageType();
    keyAccessible = true;
  } catch {
    // key not accessible
  }

  let chainIntact = false;
  try {
    await fs.access(vaultPath);
    chainIntact = true;
  } catch {
    // vault not found
  }

  if (!keyAccessible) {
    console.error('Error: key not found. Run `agent-friday init` to set up your vault.');
    process.exitCode = 1;
    return { fingerprint: null, storageType: null, vaultPath, keyAccessible: false, chainIntact };
  }

  const storageLabel = storageType === 'keychain'
    ? 'Keychain (software-protected)'
    : 'Software key (file-protected)';

  const skillsOk = checkSkills(CLAUDE_SKILLS_DIR);
  const mcpState = checkMcpRegistered();

  const skillsRow = skillsOk
    ? `✓  ${CLAUDE_SKILLS_DIR} (4 installed)`
    : `✗  not installed${HINT}`;

  let mcpRow: string;
  if (mcpState === 'unknown') {
    mcpRow = '?  unknown (claude CLI not found)';
  } else if (mcpState) {
    mcpRow = '✓  agent-friday registered with Claude Code';
  } else {
    mcpRow = `✗  not registered${HINT}`;
  }

  console.log('Agent Friday');
  console.log('────────────────────────────────────────────────────────────');
  console.log(`Key      ✓  ${fp}  (${storageLabel})`);
  console.log(`Vault    ${chainIntact ? `✓  ${vaultPath}` : `✗  not found${HINT.replace('init --integration claude', 'init')}`}`);
  console.log(`Skills   ${skillsRow}`);
  console.log(`MCP      ${mcpRow}`);

  return { fingerprint: fp, storageType, vaultPath, keyAccessible, chainIntact };
}
