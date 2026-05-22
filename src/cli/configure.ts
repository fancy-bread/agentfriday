import path from 'path';
import os from 'os';
import { resolveBackend } from '../keys/platform.js';
import { INTEGRATIONS } from '../integration/registry.js';

export interface ConfigureOptions {
  integration: string;
  agentsSkillsDir?: string;
  keyPath?: string;
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
}
