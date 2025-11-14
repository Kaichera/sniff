// packages/cli/src/commands/logout.ts
import { Command } from 'commander';
import chalk from 'chalk';
import { Config } from '../lib/config.js';

export const logout = new Command('logout').description('Log out of Sniff').action(() => {
  const config = new Config();
  const email = config.get('email');

  if (!email) {
    console.log(chalk.gray('Not currently logged in'));
    return;
  }

  config.delete('token');
  config.delete('email');
  console.log(chalk.green(`✓ Logged out ${email}`));
});
