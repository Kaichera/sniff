#!/usr/bin/env node
// packages/cli/src/index.ts
import { Command } from 'commander';
import { login } from './commands/login.js';
import { logout } from './commands/logout.js';
import { connect } from './commands/connect.js';
import { init } from './commands/init.js';
import { deploy } from './commands/deploy.js';
import { list } from './commands/list.js';
import { remove } from './commands/remove.js';
import { woof } from './commands/woof.js';
import { Config } from './lib/config.js';
import packageJson from '../package.json' with { type: 'json' };

const program = new Command();
const config = new Config();

program
  .name('sniff')
  .version(packageJson.version)
  .description('Deploy AI agents to Linear in seconds')
  .option('--debug', 'Enable debug logging')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts.debug) {
      config.set('debug', 'true');
    }
  })
  .hook('postAction', () => {
    // Clean up debug flag after command completes
    config.delete('debug');
  })
  .addHelpText(
    'after',
    `
Examples:
  $ sniff login                   # Log in to Sniff
  $ sniff connect linear          # Connect Linear workspace
  $ sniff init my-agent           # Create new agent config
  $ sniff deploy                  # Deploy agent from config.yml
  $ sniff list                    # List all deployed agents
  $ sniff logout                  # Log out

Options:
  $ sniff --debug connect linear  # Run with debug logging

Docs:
  https://docs.sniff.to

Issues:
  https://github.com/sniff-dev/sniff/issues
`,
  );

// Add commands
program.addCommand(login);
program.addCommand(logout);
program.addCommand(connect);
program.addCommand(init);
program.addCommand(deploy);
program.addCommand(list);
program.addCommand(remove);
program.addCommand(woof);

program.parse();
