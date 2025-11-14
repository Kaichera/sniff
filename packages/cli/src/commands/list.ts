// packages/cli/src/commands/list.ts
import { Command } from 'commander';
import chalk from 'chalk';
import { Config } from '../lib/config.js';
import { api } from '../lib/api.js';

interface Agent {
  id: string;
  name: string;
  status: string;
  config: any;
  createdAt: string;
  hasLinearConnection?: boolean;
  hasAnthropicConnection?: boolean;
}

export const list = new Command('list').description('List deployed agents').action(async () => {
  const config = new Config();
  const token = config.get('token');

  if (!token) {
    console.error(chalk.red('✗ Not authenticated. Run `sniff login` first.'));
    process.exit(1);
  }

  try {
    const agents = await api.get<Agent[]>('/agents', token);

    if (agents.length === 0) {
      console.log(chalk.gray('No agents deployed yet.'));
      console.log(chalk.gray('Run `sniff init` to create your first agent.'));
      return;
    }

    console.log(chalk.bold('\nYour Agents:\n'));

    agents.forEach((agent) => {
      // Determine status icon and message based on connections
      let statusIcon: string;
      let statusText: string;
      let hint: string | null = null;

      if (!agent.hasLinearConnection && !agent.hasAnthropicConnection) {
        statusIcon = chalk.red('❌');
        statusText = agent.status + ' (no connections)';
        hint = 'Connect both Linear and Anthropic to enable this agent';
      } else if (!agent.hasLinearConnection) {
        statusIcon = chalk.yellow('⚠️ ');
        statusText = agent.status + ' (no Linear connection)';
        hint = 'Run `sniff connect linear` to reconnect';
      } else if (!agent.hasAnthropicConnection) {
        statusIcon = chalk.yellow('⚠️ ');
        statusText = agent.status + ' (no Anthropic connection)';
        hint = 'Run `sniff connect anthropic` to add your API key';
      } else {
        statusIcon = agent.status === 'active' ? chalk.green('●') : chalk.yellow('●');
        statusText = agent.status;
        hint = null;
      }

      console.log(`  ${chalk.cyan(agent.name)} ${statusIcon} ${statusText}`);
      console.log(chalk.gray(`    ID: ${agent.id}`));
      console.log(chalk.gray(`    Created: ${new Date(agent.createdAt).toLocaleDateString()}`));
      if (hint) {
        console.log(chalk.gray(`    💡 ${hint}`));
      }
      console.log();
    });
  } catch (error) {
    console.error(chalk.red('✗ Failed to fetch agents:'), (error as Error).message);
    process.exit(1);
  }
});
