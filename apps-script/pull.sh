#!/bin/bash
set -e

GAME_SHOW_CREDS="$HOME/.clasprc-game-show.json"
OTHER_CREDS="$HOME/.clasprc-other-project.json"
GLOBAL_CREDS="$HOME/.clasprc.json"

if [ ! -f "$GAME_SHOW_CREDS" ]; then
  echo "❌ $GAME_SHOW_CREDS not found. Run 'clasp login' and save with: cp ~/.clasprc.json ~/.clasprc-game-show.json"
  exit 1
fi

echo "🔄 Swapping to game-show clasp account..."
cp "$GLOBAL_CREDS" "$OTHER_CREDS" 2>/dev/null || true
cp "$GAME_SHOW_CREDS" "$GLOBAL_CREDS"

echo "⬇️  Pulling from Apps Script..."
clasp pull

echo "🔄 Restoring previous clasp account..."
cp "$OTHER_CREDS" "$GLOBAL_CREDS"

echo "✅ Done."
