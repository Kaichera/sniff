# Contributing

Thanks for your interest in contributing to Sniff!

Sniff is a fully open-source, self-hosted AI agent framework for Linear.

## Project Structure

```
sniff/
├── packages/
│   ├── cli/          # @sniff-dev/cli - Command-line tools (init, validate)
│   ├── core/         # @sniff-dev/core - Agent runtime, server, platform abstractions
│   └── config/       # @sniff-dev/config - Config validation (Zod schemas)
├── Dockerfile
├── docker-compose.yml
├── sniff.yml         # Example agent configuration
├── CONFIG.md         # Configuration specification
└── config.schema.json
```

## Development Setup

```bash
# Clone the repo
git clone https://github.com/sniff-dev/sniff.git
cd sniff

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Test CLI locally
node packages/cli/dist/index.js --help
node packages/cli/dist/index.js init
node packages/cli/dist/index.js validate
```

## Running the Server Locally

```bash
# Set environment variables
export LINEAR_ACCESS_TOKEN=lin_api_xxx
export ANTHROPIC_API_KEY=sk-ant-xxx

# Run the server
node packages/core/dist/bin.js
```

Or with Docker:

```bash
cp .env.example .env
# Edit .env with your credentials

docker compose up --build
```

## Making Changes

### Pull Requests

- Follow existing code style (we use ESLint + Prettier)
- Write clear commit messages
- Test your changes locally
- Update documentation if needed (CONFIG.md, README.md)
- Keep PRs focused on a single change

### Code Style

We use automated formatting:

```bash
pnpm format          # Format all code
pnpm format:check    # Check formatting
pnpm lint            # Run linter
```

### Testing Changes

```bash
# Validate config schema
node packages/cli/dist/index.js validate

# Test server startup (requires env vars)
node packages/core/dist/bin.js

# Build Docker image
docker compose build
```

## Package Overview

### @sniff-dev/config

Zod schemas for validating `sniff.yml` configuration files.

- `ConfigSchema` - Main configuration schema
- `loadConfig()` - Load and validate config from file
- `interpolateEnvVars()` - Environment variable substitution

### @sniff-dev/core

Runtime for executing agents:

- `startServer()` - Start the webhook server
- `LinearPlatform` - Linear API integration
- `createAnthropicClient()` - Anthropic API client
- `runAgent()` - Execute agent in response to events

### @sniff-dev/cli

Command-line tools:

- `sniff init` - Create sniff.yml template
- `sniff validate` - Validate configuration

## Reporting Issues

- Search existing issues before creating new ones
- Provide clear reproduction steps for bugs
- Include version information (`sniff --version`)
- Include relevant config (redact secrets)

## Adding New Features

### Adding a New Platform (e.g., GitHub, Slack)

1. Create `packages/core/src/platforms/github/` directory
2. Implement the `Platform` interface from `platforms/platform.ts`
3. Export from `platforms/index.ts`
4. Update `startServer()` to initialize the new platform

### Adding New Model Options

1. Update `AnthropicModelSchema` in `packages/config/src/index.ts`
2. Update `AgentConfig` type in `packages/core/src/agent/runner.ts`
3. Pass new options to the Anthropic client
4. Update CONFIG.md and config.schema.json

## Questions?

- Open an issue on [GitHub](https://github.com/sniff-dev/sniff/issues)
- Join our [Discord community](https://discord.gg/huk9sSQCJA)
