// packages/cli/src/commands/connect.ts
import { Command } from 'commander';
import open from 'open';
import ora from 'ora';
import chalk from 'chalk';
import { Config } from '../lib/config.js';

export const connect = new Command('connect')
  .argument('<provider>', 'Provider to connect (linear, anthropic)')
  .description('Connect external service')
  .action(async (provider: string) => {
    const config = new Config();
    const token = config.get('token');

    if (!token) {
      console.error(chalk.red('✗ Not authenticated. Run `sniff login` first.'));
      process.exit(1);
    }

    // Validate provider
    const validProviders = ['linear', 'anthropic'];
    if (!validProviders.includes(provider)) {
      console.error(chalk.red(`✗ Invalid provider. Choose from: ${validProviders.join(', ')}`));
      process.exit(1);
    }

    const spinner = ora(`Opening ${provider} connection page...`).start();

    try {
      // Open web app connect page
      const webUrl = config.get('webUrl');
      const connectUrl = `${webUrl}/connect/${provider}?source=cli`;

      await open(connectUrl);
      spinner.succeed(`${provider} connection page opened in browser`);

      console.log(chalk.gray('\nComplete the connection in your browser.'));
      console.log(chalk.gray('Once connected, you can deploy agents!'));
    } catch (error) {
      spinner.fail(`Failed to open ${provider} connection page`);
      console.error(chalk.red((error as Error).message));
      process.exit(1);
    }
  });
