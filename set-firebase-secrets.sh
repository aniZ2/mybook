#!/bin/bash
set -e

if [ ! -f .env.local ]; then
  echo "❌ .env.local not found"
  exit 1
fi

echo "⚙️ Setting Firebase App Hosting secrets from .env.local"

while IFS='=' read -r key value; do
  if [[ -z "$key" || "$key" == \#* ]]; then
    continue
  fi

  # Remove quotes and whitespace
  value=$(echo "$value" | sed 's/^"\(.*\)"$/\1/' | sed "s/^'\(.*\)'$/\1/" | xargs)

  echo "🔑 Setting $key ..."
  # Use --data-file with process substitution to avoid interactive prompt
  echo -n "$value" | firebase functions:secrets:set "$key" --data-file=- --force

done < .env.local

echo "✅ All App Hosting secrets set successfully!"