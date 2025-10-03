#!/bin/bash
set -e

# Ensure .env.local exists
if [ ! -f .env.local ]; then
  echo "❌ .env.local not found in project root"
  exit 1
fi

# Read .env.local line by line
while IFS='=' read -r key value; do
  # Skip comments and empty lines
  if [[ -z "$key" || "$key" == \#* ]]; then
    continue
  fi

  # Remove surrounding quotes if any
  value=$(echo "$value" | sed 's/^"\(.*\)"$/\1/' | sed "s/^'\(.*\)'$/\1/")

  echo "🔑 Setting $key"
  firebase apphosting:secrets:set "$key"="$value"
done < .env.local

echo "✅ All Firebase secrets set from .env.local!"
