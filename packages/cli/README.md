# @sniff-dev/cli

Command-line tools for Sniff agent framework.

## Installation

```bash
npm install -g @sniff-dev/cli
```

Or use with npx:

```bash
npx @sniff-dev/cli init
```

## Commands

### `sniff init [name]`

Create a new `sniff.yml` configuration file.

```bash
sniff init                    # Creates sniff.yml with default agent
sniff init my-agent           # Creates sniff.yml with custom agent name
sniff init --force            # Overwrite existing config
```

Also creates `.env.example` with required environment variables.

### `sniff validate`

Validate the configuration file.

```bash
sniff validate                # Validate sniff.yml
sniff validate -c custom.yml  # Validate custom config file
```

### `sniff --help`

Show help and available commands.

```bash
sniff --help
sniff init --help
sniff validate --help
```

## Example Workflow

```bash
# 1. Create configuration
sniff init triage-bot

# 2. Edit sniff.yml with your system prompt

# 3. Validate configuration
sniff validate

# 4. Set environment variables
export LINEAR_ACCESS_TOKEN=lin_api_xxx
export ANTHROPIC_API_KEY=sk-ant-xxx

# 5. Start server (using @sniff-dev/core)
npx @sniff-dev/core
```

## Configuration

The CLI creates a `sniff.yml` file:

```yaml
version: '1.0'

agents:
  - id: 'triage-bot'
    name: 'Triage Bot'
    system_prompt: |
      You are a triage specialist.
      Classify issues and set priorities.
    model:
      anthropic:
        name: 'claude-sonnet-4-20250514'
        temperature: 0.7
        max_tokens: 4096
```

See [CONFIG.md](../../CONFIG.md) for full specification.

## License

MIT
