# Git Hooks

This project uses git hooks to ensure code quality before commits.

## Pre-commit Hook

The pre-commit hook runs automatically before each commit and performs:

1. **Type checking** (`pnpm check`)
2. **Production build** (`pnpm build`)

If either check fails, the commit will be aborted.

## Setup

Hooks are automatically installed when you run `pnpm install`.

To manually install/update hooks:

```bash
pnpm run setup-hooks
```

## Bypassing Hooks (Not Recommended)

In rare cases where you need to commit without running checks:

```bash
git commit --no-verify -m "your message"
```

**⚠️ Use sparingly!** This should only be used in exceptional circumstances.

## Hook Files

- `scripts/hooks/pre-commit` - The pre-commit hook script
- `scripts/setup-hooks.sh` - Installation script for hooks
- Hook scripts are automatically copied to `.git/hooks/` during setup
