#!/bin/sh

echo "🔧 Setting up git hooks..."

# Symlink pre-commit hook so changes to scripts/hooks/pre-commit are picked up automatically
ln -sf "$(pwd)/scripts/hooks/pre-commit" .git/hooks/pre-commit
chmod +x scripts/hooks/pre-commit

echo "✅ Git hooks installed successfully!"
echo "📝 Pre-commit hook will now check builds before each commit."
