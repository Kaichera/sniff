// packages/cli/src/commands/woof.ts
import { Command } from 'commander';
import chalk from 'chalk';
import { dogAscii, getRandomMessage, getBarkSound } from '../utils/ascii.js';

export const woof = new Command('woof').description('🐕 A hidden surprise...').action(() => {
  console.log(chalk.bold('\n  🦴 SNIFF DOG SAYS:\n'));
  console.log(dogAscii);
  console.log(chalk.cyan(`  ${getRandomMessage()} ${chalk.gray(getBarkSound())}\n`));
  console.log(chalk.dim('  (Psst... this is a hidden command. Good job finding it!)\n'));
});
