#!/usr/bin/env node
// packages/cli/src/index.ts
import { Command } from 'commander';
import { init } from './commands/init.js';
import { validate } from './commands/validate.js';
import { woof } from './commands/woof.js';
import packageJson from '../package.json' with { type: 'json' };

const program = new Command();

program
  .name('sniff')
  .version(packageJson.version)
  .description('Self-hosted AI agent framework for Linear, GitHub, and Slack')
  .addHelpText(
    'after',
    `
Examples:
  $ sniff init                   # Create sniff.yml config
  $ sniff init my-agent          # Create config with custom agent name
  $ sniff validate               # Validate configuration

To start the server, use sniff-server (from @sniff-dev/core) or Docker.

Environment Variables:
  LINEAR_ACCESS_TOKEN            # Linear API token
  LINEAR_WEBHOOK_SECRET          # Linear webhook signing secret (optional)
  ANTHROPIC_API_KEY              # Anthropic API key

Docs:
  https://github.com/sniff-dev/sniff

Issues:
  https://github.com/sniff-dev/sniff/issues
`,
  );

// Add commands
program.addCommand(init);
program.addCommand(validate);
program.addCommand(woof);

program.parse();
