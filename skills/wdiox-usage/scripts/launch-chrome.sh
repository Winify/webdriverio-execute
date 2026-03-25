#!/usr/bin/env bash
# Launches Chrome with remote debugging on port 9222 (or $1) using /tmp/chrome-debug profile.
# Run prepare-chrome-profile.sh first.

set -euo pipefail

PORT="${1:-9222}"

if [[ "$(uname)" == "Darwin" ]]; then
  CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
else
  CHROME="google-chrome"
fi

"$CHROME" \
  --remote-debugging-port="$PORT" \
  --user-data-dir=/tmp/chrome-debug \
  --profile-directory=Default \
  --no-first-run \
  --disable-session-crashed-bubble \
  &

# Wait for CDP endpoint to be ready
until curl -sf "http://localhost:$PORT/json/version" > /dev/null; do sleep 0.3; done
echo "Chrome ready on port $PORT"
