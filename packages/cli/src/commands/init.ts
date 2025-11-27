// packages/cli/src/commands/init.ts
import { Command } from 'commander';
import { writeFileSync, existsSync } from 'fs';
import chalk from 'chalk';
import ora from 'ora';

const DEFAULT_CONFIG = `# Sniff Agent Configuration
# Docs: https://github.com/sniff-dev/sniff
#
# Environment variables required:
#   LINEAR_ACCESS_TOKEN   - Linear API token
#   ANTHROPIC_API_KEY     - Anthropic API key
#   PORT                  - Server port (default: 3000)

version: "1.0"

agents:
  - id: "triage-bot"
    name: "Triage Assistant"
    description: "Automatically triages and labels new Linear issues"

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
        name: "claude-sonnet-4-20250514"
        temperature: 0.7
        max_tokens: 4096

        # Optional: Enable web search
        # tools:
        #   - type: web_search_20250305
        #     name: web_search

        # Optional: Add MCP servers
        # mcp_servers:
        #   - type: url
        #     url: https://your-mcp-server.com
        #     name: my-mcp-server
`;

const ENV_EXAMPLE = `# Linear credentials
# Get your access token from: https://linear.app/settings/api
LINEAR_ACCESS_TOKEN=lin_api_xxx

# Anthropic API key
# Get your API key from: https://console.anthropic.com
ANTHROPIC_API_KEY=sk-ant-xxx

# Server port (optional, default: 3000)
PORT=3000
`;

export const init = new Command('init')
  .argument('[name]', 'Agent name', 'triage-bot')
  .description('Initialize a new Sniff configuration')
  .option('-f, --force', 'Overwrite existing config')
  .action((name: string, options: { force?: boolean }) => {
    const configFilename = 'sniff.yml';
    const envFilename = '.env.example';

    // Check if config already exists
    if (existsSync(configFilename) && !options.force) {
      console.error(chalk.red(`✗ ${configFilename} already exists. Use --force to overwrite.`));
      process.exit(1);
    }

    const spinner = ora('Creating Sniff configuration...').start();

    try {
      // Customize config with agent name
      const config = DEFAULT_CONFIG.replace(/triage-bot/g, name).replace(
        'Triage Assistant',
        name.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      );

      writeFileSync(configFilename, config);

      // Also create .env.example if it doesn't exist
      if (!existsSync(envFilename)) {
        writeFileSync(envFilename, ENV_EXAMPLE);
      }

      spinner.succeed(`Created ${chalk.cyan(configFilename)}`);

      console.log('\n' + chalk.bold('Next steps:'));
      console.log(
        chalk.gray('1.'),
        `Copy ${chalk.cyan('.env.example')} to ${chalk.cyan('.env')} and fill in your credentials`,
      );
      console.log(chalk.gray('2.'), `Edit ${chalk.cyan(configFilename)} to customize your agent`);
      console.log(chalk.gray('3.'), `Run ${chalk.cyan('sniff start')} to start the server`);
      console.log(
        chalk.gray('4.'),
        `Configure your Linear webhook to point to ${chalk.cyan('http://your-server:3000/webhook/linear')}`,
      );

      console.log('\n' + chalk.bold('Environment variables:'));
      console.log(chalk.gray('  LINEAR_ACCESS_TOKEN'), '- Linear API token (required)');
      console.log(chalk.gray('  ANTHROPIC_API_KEY'), '- Anthropic API key (required)');
      console.log(chalk.gray('  PORT'), '- Server port (default: 3000)');
    } catch (error) {
      spinner.fail('Failed to create configuration');
      console.error(chalk.red((error as Error).message));
      process.exit(1);
    }
  });
