#!/usr/bin/env node
import { Command } from 'commander';
import { runInit } from './init.js';
import { runStatus } from './status.js';
import { loadKeyOrAbort } from './start.js';

const program = new Command();

program
  .name('agent-friday')
  .description('Private encrypted memory service for AI agents')
  .version('1.0.0');

program
  .command('init')
  .description('Initialise the vault and generate a keypair')
  .option('--vault-path <path>', 'Override default vault database path')
  .action(async (options: { vaultPath?: string }) => {
    try {
      await runInit({ vaultPath: options.vaultPath });
    } catch (err) {
      console.error('Error:', (err as Error).message);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show vault health and key fingerprint')
  .action(async () => {
    const result = await runStatus();
    if (!result.keyAccessible) process.exit(1);
  });

program
  .command('start')
  .description('Start the MCP server (implemented in 004-mcp-server)')
  .action(async () => {
    try {
      await loadKeyOrAbort();
      console.log('MCP server not yet implemented — see 004-mcp-server.');
      process.exit(1);
    } catch (err) {
      console.error('Error:', (err as Error).message);
      process.exit(1);
    }
  });

program.parse();
