#!/usr/bin/env bash
# Helper script: stop tracking frontend/.env.local (safe to run locally)
set -e

FILE=frontend/.env.local

if [ ! -f "$FILE" ]; then
  echo "No $FILE found on disk. Nothing to untrack.";
  exit 0
fi

echo "Removing $FILE from git index (keeps file on disk)..."
git rm --cached "$FILE" || echo "(git rm returned non-zero)"
echo "$FILE removed from index. Remember to commit the change and push."
echo "If this file was pushed, rotate the exposed API key immediately and consider removing it from history." 

echo "Done."
