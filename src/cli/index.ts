#!/usr/bin/env node
import { Command } from 'commander';
import { runInit } from './init.js';
import { runStatus } from './status.js';
import { runStart } from './start.js';
import { runConfigure } from './configure.js';

const program = new Command();

program
  .name('agent-friday')
  .description('Private encrypted memory service for AI agents')
  .version('0.2.0');

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
  .command('configure')
  .description('Connect Friday to an AI tool')
  .option('--integration <tool>', 'Agent tool to configure (claude, cursor)')
  .action(async (options: { integration?: string }) => {
    if (!options.integration) {
      console.error('Error: --integration is required. Supported: claude, cursor');
      process.exit(1);
    }
    try {
      await runConfigure({ integration: options.integration });
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
  .description('Start the MCP server over stdio')
  .option('--vault-path <path>', 'Override default vault database path')
  .action(async (options: { vaultPath?: string }) => {
    try {
      await runStart({ vaultPath: options.vaultPath });
    } catch (err) {
      console.error('Error:', (err as Error).message);
      process.exit(1);
    }
  });

program.parse();
