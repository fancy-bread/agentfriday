import { existsSync } from 'fs';
import path from 'path';
import os from 'os';
import { claudeIntegration } from './claude.js';
import { cursorIntegration } from './cursor.js';
import type { IntegrationConfig } from './types.js';

export const INTEGRATIONS: Record<string, IntegrationConfig> = {
  claude: claudeIntegration,
  cursor: cursorIntegration,
};

export function detectInstalledTools(): string[] {
  return Object.values(INTEGRATIONS)
    .filter(i => existsSync(path.join(os.homedir(), `.${i.name}`)))
    .map(i => i.name);
}
