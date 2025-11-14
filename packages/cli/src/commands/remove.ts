// packages/cli/src/commands/remove.ts
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import * as readline from 'readline';
import { Config } from '../lib/config.js';
import { api } from '../lib/api.js';

interface RemoveResponse {
  message: string;
  agent: {
    id: string;
    name: string;
  };
}

async function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

export const remove = new Command('remove')
  .description('Remove a deployed agent')
  .argument('<agentId>', 'ID of the agent to remove')
  .option('-f, --force', 'Skip confirmation prompt')
  .action(async (agentId: string, options: { force?: boolean }) => {
    const config = new Config();
    const token = config.get('token');

    if (!token) {
      console.error(chalk.red('✗ Not authenticated. Run `sniff login` first.'));
      process.exit(1);
    }

    // Confirmation prompt (unless --force flag is used)
    if (!options.force) {
      const confirmed = await confirm(
        chalk.yellow(`⚠ Are you sure you want to remove agent ${agentId}? (y/N) `),
      );

      if (!confirmed) {
        console.log(chalk.gray('Cancelled.'));
        process.exit(0);
      }
    }

    const spinner = ora('Removing agent...').start();

    try {
      const response = await api.delete<RemoveResponse>(`/agents/${agentId}`, token);

      spinner.succeed(chalk.green(`✓ Agent "${response.agent.name}" removed successfully`));
    } catch (error) {
      spinner.fail(chalk.red('✗ Failed to remove agent'));
      console.error(chalk.red((error as Error).message));
      process.exit(1);
    }
  });
