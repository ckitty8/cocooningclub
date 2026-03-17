#!/bin/bash
# Auto-deploy to Vercel after git commit/push
# Triggered by Claude Code PostToolUse hook

set -e

# Read stdin to get the bash command that was executed
INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

# Only deploy on git commit or git push
if ! echo "$CMD" | grep -qE 'git (commit|push)'; then
  exit 0
fi

echo "🚀 Déploiement Vercel en cours..."

if [ -z "$VERCEL_TOKEN" ]; then
  echo "⚠️  VERCEL_TOKEN manquant. Ajoutez-le dans .claude/settings.local.json sous \"env\"."
  exit 0
fi

cd /home/user/cocooningclub

# Deploy to Vercel
OUTPUT=$(npx vercel --prod \
  --token="$VERCEL_TOKEN" \
  --scope ckitty8s-projects \
  --yes \
  2>&1)

EXIT_CODE=$?
echo "$OUTPUT" | tail -6

if [ $EXIT_CODE -eq 0 ]; then
  # Extract deploy URL from output
  URL=$(echo "$OUTPUT" | grep -oE 'https://[a-zA-Z0-9._-]+\.vercel\.app' | tail -1)
  if [ -n "$URL" ]; then
    echo "✅ Déployé : $URL"
    # Return as system message for Claude to see
    echo "{\"systemMessage\": \"✅ Vercel déployé : $URL\"}"
  else
    echo "✅ Déploiement réussi"
    echo "{\"systemMessage\": \"✅ Vercel déployé avec succès\"}"
  fi
else
  echo "❌ Échec du déploiement (code $EXIT_CODE)"
  echo "{\"systemMessage\": \"❌ Vercel deploy échoué — vérifiez le token\"}"
fi
