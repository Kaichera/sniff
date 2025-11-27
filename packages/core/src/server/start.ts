/**
 * Server Startup
 *
 * Entry point for running the Sniff server.
 * Loads config, initializes platforms and LLM, and starts the server.
 */

import { loadConfig } from '@sniff-dev/config';
import { createSniffServer, type SniffServerConfig } from './index.js';
import { LinearPlatform, type Platform } from '../platforms/index.js';
import { createAnthropicClient } from '../llm/anthropic.js';
import type { AgentConfig } from '../agent/runner.js';

export interface StartServerOptions {
  configPath?: string;
  port?: number;
}

/**
 * Start the Sniff server
 *
 * Reads configuration from YAML file and credentials from environment variables.
 */
export async function startServer(options: StartServerOptions = {}): Promise<void> {
  const configPath = options.configPath ?? 'sniff.yml';

  // Load configuration
  console.log('Loading configuration...');
  const config = loadConfig(configPath);
  console.log('Configuration loaded');

  // Read credentials from environment variables
  const linearToken = process.env.LINEAR_ACCESS_TOKEN;
  const linearWebhookSecret = process.env.LINEAR_WEBHOOK_SECRET;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  // Validate required credentials
  if (!anthropicKey) {
    throw new Error('Missing required environment variable: ANTHROPIC_API_KEY');
  }

  if (!linearToken) {
    throw new Error('Missing required environment variable: LINEAR_ACCESS_TOKEN');
  }

  // Initialize Linear platform
  console.log('Initializing Linear platform...');
  const platforms: Platform[] = [];
  const linearPlatform = new LinearPlatform();
  linearPlatform.initialize({
    accessToken: linearToken,
    webhookSecret: linearWebhookSecret || undefined,
  });
  platforms.push(linearPlatform);
  console.log('Linear platform initialized');

  // Initialize LLM client
  console.log('Initializing LLM client...');
  const llmClient = createAnthropicClient({
    apiKey: anthropicKey,
  });
  console.log('LLM client initialized');

  // Convert config agents to AgentConfig format
  const agents: AgentConfig[] = config.agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    systemPrompt: agent.system_prompt,
    model: {
      name: agent.model.anthropic.name,
      temperature: agent.model.anthropic.temperature,
      maxTokens: agent.model.anthropic.max_tokens,
      thinking: agent.model.anthropic.thinking,
      tools: agent.model.anthropic.tools,
      mcpServers: agent.model.anthropic.mcp_servers,
    },
  }));

  // Determine port: options > PORT env var > default 3000
  const port = options.port ?? (process.env.PORT ? parseInt(process.env.PORT, 10) : 3000);

  // Create server
  const serverConfig: SniffServerConfig = {
    port,
    platforms,
    agents,
    llmClient,
  };

  const server = createSniffServer(serverConfig);

  // Handle shutdown
  const shutdown = async () => {
    console.log('\nShutting down...');
    await server.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Start server
  console.log('\nStarting Sniff server...\n');
  await server.start();

  console.log('\nServer is running!');
  console.log('\nAgents:');
  for (const agent of agents) {
    console.log(`  - ${agent.name} (${agent.id})`);
  }
  console.log('\nWebhooks:');
  for (const platform of platforms) {
    console.log(`  - POST http://localhost:${port}/webhook/${platform.name}`);
  }
  console.log('\nPress Ctrl+C to stop');
}
