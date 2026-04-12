#!/usr/bin/env bash
set -euo pipefail

HOOK=".git/hooks/pre-commit"
mkdir -p "$(dirname "$HOOK")"

cat > "$HOOK" << 'HOOKEOF'
#!/usr/bin/env bash
exec ./scripts/check.sh
HOOKEOF

chmod +x "$HOOK"
echo "Pre-commit hook installed."
