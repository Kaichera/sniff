// packages/cli/src/commands/validate.ts
import { Command } from 'commander';
import { existsSync } from 'fs';
import chalk from 'chalk';
import { loadConfig } from '@sniff-dev/config';

export const validate = new Command('validate')
  .description('Validate a Sniff configuration file')
  .option('-c, --config <path>', 'Path to config file', 'sniff.yml')
  .action((options: { config: string }) => {
    const configPath = options.config;

    // Check if config exists
    if (!existsSync(configPath)) {
      console.error(chalk.red(`✗ Config file not found: ${configPath}`));
      process.exit(1);
    }

    try {
      const config = loadConfig(configPath);

      console.log(chalk.green(`✓ Configuration is valid: ${configPath}`));
      console.log('');
      console.log(chalk.bold('Summary:'));
      console.log(chalk.gray('  Version:'), config.version);
      console.log(chalk.gray('  Agents:'), config.agents.length);

      for (const agent of config.agents) {
        console.log('');
        console.log(chalk.bold(`  Agent: ${agent.name}`));
        console.log(chalk.gray('    ID:'), agent.id);
        console.log(chalk.gray('    Model:'), agent.model.anthropic.name);
      }

      console.log('');
      console.log(chalk.gray('  Platform:'), 'Linear');
    } catch (error) {
      console.error(chalk.red(`✗ Invalid configuration: ${configPath}`));
      console.error('');
      console.error(chalk.red((error as Error).message));
      process.exit(1);
    }
  });
