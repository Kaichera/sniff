# Sniff Agent Examples

Example configurations for common use cases.

## Available Examples

| Example                 | Description                          | Features               |
| ----------------------- | ------------------------------------ | ---------------------- |
| `triage-agent.yml`      | Classifies and prioritizes issues    | Low temperature        |
| `docs-search-agent.yml` | Answers questions from documentation | Web search + fetch     |
| `research-agent.yml`    | Research assistant with web tools    | Web search + citations |

## Usage

```bash
# Copy an example
cp examples/triage-agent.yml sniff.yml

# Edit as needed
# ...

# Validate
sniff validate

# Run with Docker
docker compose up
```

## Configuration Tips

**Temperature:**

- `0.3-0.5` - Consistent (triage, classification)
- `0.5-0.7` - Balanced (docs, support)
- `0.7-1.0` - Creative (writing, brainstorming)

**Models:**

- `claude-sonnet-4-20250514` - Best balance (recommended)
- `claude-haiku-4-5-20251001` - Fastest, cheapest
- `claude-opus-4-20250514` - Most capable

## More Info

- [Configuration Reference](../CONFIG.md)
- [GitHub](https://github.com/sniff-dev/sniff)
