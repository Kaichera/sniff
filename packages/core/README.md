# @sniff-dev/core

Runtime and server for Sniff agent framework.

## Installation

```bash
npm install @sniff-dev/core
```

## Quick Start

```bash
# Set environment variables
export LINEAR_ACCESS_TOKEN=lin_api_xxx
export ANTHROPIC_API_KEY=sk-ant-xxx

# Run the server (reads sniff.yml from current directory)
npx @sniff-dev/core
```

## Programmatic Usage

```typescript
import { startServer } from '@sniff-dev/core';

// Start with defaults (reads sniff.yml, uses env vars)
await startServer();

// Or with options
await startServer({
  configPath: 'custom-config.yml',
  port: 8080,
});
```

## API

### `startServer(options?): Promise<void>`

Start the Sniff server. Reads configuration from YAML and credentials from environment variables.

**Options:**

- `configPath` - Path to config file (default: `sniff.yml`)
- `port` - Server port (default: `PORT` env var or `3000`)

### `createSniffServer(config): SniffServer`

Create a server instance for more control.

```typescript
import { createSniffServer, LinearPlatform, createAnthropicClient } from '@sniff-dev/core';

const server = createSniffServer({
  port: 3000,
  platforms: [linearPlatform],
  agents: [agentConfig],
  llmClient: anthropicClient,
});

await server.start();
await server.stop();
```

### Platform Abstractions

```typescript
import { LinearPlatform } from '@sniff-dev/core';

const linear = new LinearPlatform();
linear.initialize({
  accessToken: process.env.LINEAR_ACCESS_TOKEN,
  webhookSecret: process.env.LINEAR_WEBHOOK_SECRET,
});
```

### LLM Client

```typescript
import { createAnthropicClient } from '@sniff-dev/core';

const client = createAnthropicClient({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
```

## Environment Variables

| Variable                | Required | Description                 |
| ----------------------- | -------- | --------------------------- |
| `LINEAR_ACCESS_TOKEN`   | Yes      | Linear API token            |
| `ANTHROPIC_API_KEY`     | Yes      | Anthropic API key           |
| `LINEAR_WEBHOOK_SECRET` | No       | Webhook signing secret      |
| `PORT`                  | No       | Server port (default: 3000) |

## Webhook Endpoints

- `GET /health` - Health check
- `POST /webhook/linear` - Linear webhook endpoint

## License

MIT
