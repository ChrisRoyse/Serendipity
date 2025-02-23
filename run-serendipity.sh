#!/bin/bash

# Navigate to project root (where user_profiles.json is located)
cd "$(dirname "$0")"

# Check if user ID is provided
if [ -z "$1" ]; then
    echo "Usage: ./run-serendipity.sh <userId> [goals]"
    echo "Example: ./run-serendipity.sh nz7nnwkdhls \"find AI collaborators,learn blockchain\""
    exit 1
fi

USER_ID="$1"
GOALS="$2"

# Run Deno CLI mode with all necessary permissions
OUTPUT=$(deno run --allow-net --allow-env --allow-read --allow-write src/main.ts cli "$USER_ID" "$GOALS" 2> error.log)

# Check exit status
if [ $? -ne 0 ]; then
    echo "Error running Deno script. Check error.log:"
    cat error.log
    exit 1
fi

# Output suggestions
echo "$OUTPUT"

exit 0
