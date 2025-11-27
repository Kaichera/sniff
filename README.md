# Sniff - Self-Hosted AI Agent Framework

> Declarative AI agents for Linear. Like Docker Compose for AI agents.

Deploy AI agents with a simple YAML config. Fully self-hosted, no vendor lock-in.

## Quick Start

### With Docker (Recommended)

```bash
# 1. Create config file
npx @sniff-dev/cli init

# 2. Set environment variables
export LINEAR_ACCESS_TOKEN=lin_api_xxx
export ANTHROPIC_API_KEY=sk-ant-xxx

# 3. Start with Docker
docker compose up
```

### Without Docker

```bash
# 1. Install CLI
npm install -g @sniff-dev/cli

# 2. Create config
sniff init

# 3. Validate config
sniff validate

# 4. Start server
LINEAR_ACCESS_TOKEN=xxx ANTHROPIC_API_KEY=xxx npx @sniff-dev/core
```

Your agent is now listening at `http://localhost:3000/webhook/linear`.

## Configuration

Define your agents in `sniff.yml`:

```yaml
version: '1.0'

agents:
  - id: 'triage-bot'
    name: 'Triage Assistant'
    description: 'Analyzes and classifies engineering issues'

    system_prompt: |
      You are a triage specialist for an engineering team.

      When a new issue is created:
      1. Classify as: bug, feature, question, or task
      2. Set priority: P0 (critical), P1 (high), P2 (medium), P3 (low)
      3. Provide a brief analysis

      Be concise but thorough.

    model:
      anthropic:
        name: 'claude-sonnet-4-20250514'
        temperature: 0.7
        max_tokens: 4096
```

### With Web Search

```yaml
version: '1.0'

agents:
  - id: 'research-bot'
    name: 'Research Assistant'
    system_prompt: |
      You are a research assistant.
      Use web search to find relevant information.
      Always cite your sources.

    model:
      anthropic:
        name: 'claude-sonnet-4-20250514'
        temperature: 0.7
        max_tokens: 4096
        tool_choice:
          type: 'auto'
        tools:
          - type: web_search_20250305
            name: web_search
            max_uses: 5
          - type: web_fetch_20250910
            name: web_fetch
            max_uses: 10
            citations:
              enabled: true
```

See [CONFIG.md](CONFIG.md) for full configuration reference.

## Environment Variables

| Variable                | Required | Description                                                        |
| ----------------------- | -------- | ------------------------------------------------------------------ |
| `LINEAR_ACCESS_TOKEN`   | Yes      | Linear API token ([get one here](https://linear.app/settings/api)) |
| `ANTHROPIC_API_KEY`     | Yes      | Anthropic API key ([get one here](https://console.anthropic.com))  |
| `LINEAR_WEBHOOK_SECRET` | No       | Webhook signing secret (recommended for production)                |
| `PORT`                  | No       | Server port (default: 3000)                                        |

## CLI Commands

```bash
sniff init [name]        # Create sniff.yml template
sniff validate           # Validate configuration
sniff validate -c path   # Validate specific config file
```

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Linear      │────▶│   Sniff Server  │────▶│   Anthropic     │
│   (Webhook)     │     │   (Your Host)   │     │   (Claude API)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │   MCP Servers   │
                        │   (Optional)    │
                        └─────────────────┘
```

1. **Linear sends webhook** → When issues are created/updated
2. **Sniff processes event** → Validates and normalizes the event
3. **Agent runs** → Sends context to Claude with your system prompt
4. **Tools execute** → Web search, MCP servers, etc.
5. **Response posted** → Agent response appears as Linear comment

## Features

- **Declarative Config** - Define agents in YAML, version control your config
- **Self-Hosted** - Run anywhere: Docker, cloud, or local machine
- **No Database** - Stateless design, config from YAML file
- **MCP Support** - Connect any MCP-compatible tool server
- **Web Search** - Built-in web search and fetch capabilities
- **Extended Thinking** - Enable Claude's extended thinking for complex analysis

## Project Structure

```
sniff/
├── packages/
│   ├── cli/          # @sniff-dev/cli - Command-line tools
│   ├── core/         # @sniff-dev/core - Agent runtime and server
│   └── config/       # @sniff-dev/config - Config validation
├── docker-compose.yml
├── Dockerfile
├── sniff.yml         # Your agent configuration
└── CONFIG.md         # Configuration specification
```

## Webhook Setup

After starting the server, configure Linear to send webhooks:

1. Go to **Linear Settings** → **API** → **Webhooks**
2. Create webhook pointing to `http://your-server:3000/webhook/linear`
3. Select events: `Issue` (create, update)
4. (Optional) Copy the signing secret to `LINEAR_WEBHOOK_SECRET`

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run server locally
LINEAR_ACCESS_TOKEN=xxx ANTHROPIC_API_KEY=xxx node packages/core/dist/bin.js

# Or with Docker
docker compose up --build
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for more details.

## License

MIT

## Support

- **Issues**: [github.com/sniff-dev/sniff/issues](https://github.com/sniff-dev/sniff/issues)
- **Discord**: [discord.gg/huk9sSQCJA](https://discord.gg/huk9sSQCJA)
