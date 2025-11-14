// packages/cli/src/commands/init.ts
import { Command } from 'commander';
import { writeFileSync, existsSync } from 'fs';
import chalk from 'chalk';
import ora from 'ora';

const DEFAULT_CONFIG = `version: "1.0"

agent:
  id: "triage-bot"
  name: "Triage Assistant"
  description: "Automatically triages and labels new Linear issues"

  # This prompt defines your agent's behavior
  system_prompt: |
    You are a triage specialist for an engineering team.

    When a new issue is created:
    1. Analyze the content and classify as: bug, feature, question, or task
    2. Set priority: P0 (critical), P1 (high), P2 (medium), P3 (low)
    3. Add relevant labels based on the issue content
    4. Provide a brief analysis of the issue

    Respond with:
    - Classification and reasoning
    - Suggested priority with justification
    - Recommended labels
    - Next steps for the team

    Be concise but thorough in your analysis.

  model:
    anthropic:
      name: "claude-3-5-sonnet-20241022"
      temperature: 0.7
      max_tokens: 2000
`;

export const init = new Command('init')
  .argument('[name]', 'Agent name', 'my-agent')
  .description('Initialize a new agent configuration')
  .option('-f, --force', 'Overwrite existing config')
  .action((name: string, options: { force?: boolean }) => {
    const filename = 'config.yml';

    // Check if config already exists
    if (existsSync(filename) && !options.force) {
      console.error(chalk.red(`✗ ${filename} already exists. Use --force to overwrite.`));
      process.exit(1);
    }

    const spinner = ora('Creating agent configuration...').start();

    try {
      // Customize config with agent name
      const config = DEFAULT_CONFIG.replace('triage-bot', name).replace(
        'Triage Assistant',
        name.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      );

      writeFileSync(filename, config);
      spinner.succeed(`Created ${chalk.cyan(filename)}`);

      console.log('\nNext steps:');
      console.log(chalk.gray('1.'), `Edit ${chalk.cyan(filename)} to customize your agent`);
      console.log(
        chalk.gray('2.'),
        `Run ${chalk.cyan('sniff connect linear')} to connect your Linear workspace`,
      );
      console.log(chalk.gray('3.'), `Run ${chalk.cyan('sniff deploy')} to deploy your agent`);
    } catch (error) {
      spinner.fail('Failed to create configuration');
      console.error(chalk.red((error as Error).message));
      process.exit(1);
    }
  });
