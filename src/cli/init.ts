import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import os from 'os';
import { resolveBackend } from '../keys/platform.js';
import { fingerprint } from '../keys/crypto.js';
import type { StorageType } from '../keys/KeyManager.js';
import { installSkills, registerMcp } from '../integration/claude.js';

export interface InitOptions {
  vaultPath?: string;
  keyPath?: string;
  integration?: string;
}

export interface InitResult {
  fingerprint: string;
  storageType: StorageType;
  vaultPath: string;
}

const DEFAULT_VAULT_PATH = path.join(os.homedir(), '.agent-friday', 'vault.db');

export async function runInit(options: InitOptions = {}): Promise<InitResult> {
  const backend = resolveBackend();
  const vaultPath = options.vaultPath ?? DEFAULT_VAULT_PATH;
  const keyPath = options.keyPath;

  const alreadyExists = await backend.exists(keyPath);

  if (alreadyExists && !options.integration) {
    throw new Error('vault already initialised. Run `agent-friday status` to verify.');
  }

  let km;
  if (!alreadyExists) {
    km = await backend.generate(keyPath);
    try {
      await fs.mkdir(path.dirname(vaultPath), { recursive: true });
      await fs.writeFile(vaultPath, '', { flag: 'wx' });
    } catch (err) {
      await backend.delete(keyPath);
      throw new Error(`Failed to create vault: ${(err as Error).message}`);
    }
  } else {
    km = await backend.load(keyPath);
    console.log('Vault already initialised — updating integration.');
  }

  const pub = await km.publicKey();
  const fp = await fingerprint(pub);
  const storage = km.storageType();
  const storageLabel = storage === 'keychain'
    ? 'Keychain (software-protected)'
    : 'Software key (file-protected)';

  if (!alreadyExists) {
    console.log('Agent Friday initialised.');
    console.log(`Public key: ${fp}`);
    console.log(`Storage:    ${storageLabel}`);
    console.log(`Vault:      ${vaultPath}`);
    console.log('');
    console.log('WARNING: If this key is lost, your memories cannot be recovered.');
  }

  if (options.integration === 'claude') {
    const packageRoot = path.resolve(fileURLToPath(import.meta.url), '..', '..', '..');
    const skillsSourceDir = path.join(packageRoot, 'skills');
    const claudeSkillsDir = path.join(os.homedir(), '.claude', 'skills');

    console.log('');
    console.log('Installing Friday skills...');
    await installSkills(skillsSourceDir, claudeSkillsDir);
    console.log(`  ✓ Skills installed to ${claudeSkillsDir}`);

    console.log('Registering memory service with Claude Code...');
    const result = registerMcp();
    if (result.method === 'cli') {
      console.log('  ✓ Memory service registered with Claude Code');
      console.log('');
      console.log('Setup complete. Open Claude Code and try /friday-note.');
    } else {
      console.log('  ⚠ Claude CLI not found. Add this to your Claude Code settings manually:');
      console.log('');
      console.log(result.snippet);
      console.log('');
      console.log('Settings file: ~/.claude.json');
    }
  } else if (!alreadyExists) {
    console.log('');
    console.log('Tip: Run `agent-friday init --integration claude` to install skills');
    console.log('     and register the memory service with Claude Code.');
  }

  return { fingerprint: fp, storageType: storage, vaultPath };
}
