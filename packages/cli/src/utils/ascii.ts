// packages/cli/src/utils/ascii.ts
import chalk from 'chalk';

export const dogAscii = `
   / \\__
  (    @\\___
  /         O
 /   (_____/
/_____/   U
`;

export const smallDogAscii = chalk.yellow('🐕');

export const messages = [
  'I sniff bugs for breakfast!',
  'Every good agent needs a good nose!',
  'Deploying goodness, one sniff at a time!',
  'Fetch me some Linear issues!',
  'Tail-wagging deployment detected!',
  'Pawsitively amazing code ahead!',
  'Who let the bots out? WOOF WOOF WOOF!',
  'Sniffing out production issues like a pro!',
  'Good agent! Yes you are!',
  'No squirrels allowed - stay focused!',
];

export function getRandomMessage(): string {
  return messages[Math.floor(Math.random() * messages.length)];
}

export function getBarkSound(): string {
  const barks = ['woof!', 'WOOF!', 'woof woof!', 'AROOO!', '*wag wag*'];
  return barks[Math.floor(Math.random() * barks.length)];
}
