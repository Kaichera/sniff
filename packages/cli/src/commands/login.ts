// packages/cli/src/commands/login.ts
import { Command } from 'commander';
import open from 'open';
import ora from 'ora';
import chalk from 'chalk';
import { createServer } from 'http';
import { Config } from '../lib/config.js';

/**
 * Basic JWT validation - checks if token has valid JWT structure
 */
function isValidJWT(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  try {
    // Try to decode the payload to ensure it's valid base64
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return !!payload;
  } catch {
    return false;
  }
}

export const login = new Command('login').description('Log in to Sniff').action(async () => {
  const config = new Config();

  // Check if already authenticated
  if (config.get('token')) {
    const email = config.get('email');
    console.log(chalk.green(`✓ Already logged in as ${email}`));
    console.log(chalk.gray('\nRun `sniff logout` to log out'));
    return;
  }

  const spinner = ora('Opening browser for authentication...').start();

  // Start local server for callback
  const port = 31415; // Pi port for fun
  let authHandled = false;

  const server = createServer((req, res) => {
    const url = new URL(req.url!, `http://localhost:${port}`);
    const token = url.searchParams.get('token');
    const email = url.searchParams.get('email');

    // Ignore requests without auth params (like favicon.ico)
    if (!token || !email) {
      res.writeHead(204);
      res.end();
      return;
    }

    // Only handle auth once
    if (authHandled) {
      res.writeHead(200);
      res.end();
      return;
    }
    authHandled = true;

    if (token && email) {
      // Validate that the token is a valid JWT (Clerk session token)
      if (!isValidJWT(token)) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(
          `
          <html>
            <head><meta charset="UTF-8"></head>
            <body style="font-family: system-ui; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
              <div style="text-align: center;">
                <h1 style="color: #ef4444;">✗ Invalid Token</h1>
                <p>The authentication token is not valid. Please try again.</p>
              </div>
            </body>
          </html>
        `,
          () => {
            // Response sent, now show message and exit
            spinner.fail('Invalid authentication token');
            server.close();
            process.exit(1);
          },
        );
        return;
      }

      config.set('token', token);
      config.set('email', email);

      // Just acknowledge the callback - the Auth page shows the success message
      res.writeHead(204);
      res.end();

      // Show success in terminal
      spinner.succeed(`Logged in as ${chalk.cyan(email)}`);
      server.close();

      // Show next steps
      console.log(chalk.gray('\nReady to deploy agents!'));
      console.log(chalk.gray('Run `sniff init` to create your first agent.'));

      process.exit(0);
    }
  });

  server.listen(port, () => {
    const authUrl = `${config.get('webUrl')}/auth?callback=http://localhost:${port}`;
    open(authUrl);
  });
});
