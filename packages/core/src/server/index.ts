/**
 * Sniff Server
 *
 * A simple headless server that:
 * - Receives webhooks from platforms
 * - Routes them to the appropriate agent
 * - Executes agents using the LLM
 * - Sends responses back via the platform
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { Platform, PlatformEvent } from '../platforms/index.js';
import type { AnthropicClient } from '../llm/anthropic.js';
import { runAgent, type AgentConfig } from '../agent/runner.js';

export interface SniffServerConfig {
  port: number;
  platforms: Platform[];
  agents: AgentConfig[];
  llmClient: AnthropicClient;
}

export interface SniffServer {
  start(): Promise<void>;
  stop(): Promise<void>;
}

/**
 * Create a Sniff server instance
 */
export function createSniffServer(config: SniffServerConfig): SniffServer {
  const { port, platforms, agents, llmClient } = config;

  // Create platform lookup map
  const platformMap = new Map<string, Platform>();
  for (const platform of platforms) {
    platformMap.set(platform.name, platform);
  }

  // Create HTTP server
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // Health check
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    // Webhook endpoints: /webhook/:platform
    if (req.method === 'POST' && req.url?.startsWith('/webhook/')) {
      const platformName = req.url.replace('/webhook/', '');
      const platform = platformMap.get(platformName);

      if (!platform) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Unknown platform: ${platformName}` }));
        return;
      }

      try {
        // Read request body
        const body = await readBody(req);
        const signature = (req.headers['x-linear-signature'] as string) || '';

        // Verify webhook
        if (!platform.verifyWebhook(body, signature)) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid webhook signature' }));
          return;
        }

        // Parse webhook
        const payload = JSON.parse(body);
        const event = platform.parseWebhookEvent(payload);

        if (!event) {
          // Event should be ignored
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ignored' }));
          return;
        }

        // Check if we should process this event
        if (!platform.shouldProcessEvent(event)) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'skipped' }));
          return;
        }

        // Find matching agent
        const agent = findAgentForEvent(agents, event);
        if (!agent) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'no_matching_agent' }));
          return;
        }

        // Respond immediately, process async
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'processing' }));

        // Run agent asynchronously
        const sessionId = generateSessionId();
        runAgent({
          event,
          config: agent,
          platform,
          llmClient,
          sessionId,
        }).catch((error) => {
          console.error('Agent run failed:', error);
        });
      } catch (error) {
        console.error('Webhook processing error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }

      return;
    }

    // 404 for unknown routes
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  return {
    start: () =>
      new Promise((resolve) => {
        server.listen(port, () => {
          console.log(`Sniff server listening on port ${port}`);
          console.log(`Webhook endpoints:`);
          for (const platform of platforms) {
            console.log(`  - POST /webhook/${platform.name}`);
          }
          resolve();
        });
      }),

    stop: () =>
      new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      }),
  };
}

/**
 * Read request body as string
 */
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/**
 * Find an agent that should handle this event
 * For now, returns the first agent. Can be extended with filtering logic.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function findAgentForEvent(agents: AgentConfig[], event: PlatformEvent): AgentConfig | null {
  // TODO: Add filtering based on event type, labels, team, etc.
  return agents[0] || null;
}

/**
 * Generate a unique session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Export startServer
export { startServer, type StartServerOptions } from './start.js';
