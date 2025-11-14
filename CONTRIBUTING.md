# Contributing

Thanks for your interest in contributing to Sniff!

This repository contains the open-source CLI and shared packages. The backend API and web dashboard are closed-source.

## Development Setup

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Test CLI locally
cd packages/cli
pnpm dev --help
pnpm dev init
```

## Making Changes

### Pull Requests

- Follow existing code style (we use ESLint + Prettier)
- Write clear commit messages
- Test your changes locally
- Update documentation if needed
- Keep PRs focused on a single change

### Code Style

We use automated formatting:

```bash
pnpm format          # Format all code
pnpm format:check    # Check formatting
pnpm lint            # Run linter
```

## Reporting Issues

- Search existing issues before creating new ones
- Provide clear reproduction steps for bugs
- Include version information (`sniff --version`)
- Use issue templates when available

## Questions?

- Join our [Discord community](https://discord.gg/huk9sSQCJA)
- Check the [documentation](https://docs.sniff.to)
