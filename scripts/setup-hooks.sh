#!/bin/sh

echo "🔧 Setting up git hooks..."

# Copy pre-commit hook
cp scripts/hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

echo "✅ Git hooks installed successfully!"
echo "📝 Pre-commit hook will now check builds before each commit."
