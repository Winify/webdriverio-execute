#!/usr/bin/env bash
# Prepares a Chrome debug profile at /tmp/chrome-debug from the real Chrome profile.
# Copies cookies/logins, removes lock files and session state so the copy opens cleanly.
# Works on macOS and Linux.

set -euo pipefail

if [[ "$(uname)" == "Darwin" ]]; then
  CHROME_SRC="$HOME/Library/Application Support/Google/Chrome"
else
  CHROME_SRC="$HOME/.config/google-chrome"
fi

DEBUG_DIR="/tmp/chrome-debug"

echo "WARNING: Copying Chrome cookies, saved passwords, and session tokens to $DEBUG_DIR"
echo "         This grants the debug session full access to your authenticated accounts."

rm -rf "$DEBUG_DIR"
mkdir -p "$DEBUG_DIR"
chmod 700 "$DEBUG_DIR"

cp "$CHROME_SRC/Local State" "$DEBUG_DIR/Local State"
cp -r "$CHROME_SRC/Default" "$DEBUG_DIR/Default"

# Remove singleton locks from the copy
rm -f "$DEBUG_DIR/SingletonLock" "$DEBUG_DIR/SingletonCookie" "$DEBUG_DIR/SingletonSocket"

# Remove session files (they reference the original profile's state)
rm -f "$DEBUG_DIR/Default/Current Session" "$DEBUG_DIR/Default/Current Tabs"
rm -f "$DEBUG_DIR/Default/Last Session" "$DEBUG_DIR/Default/Last Tabs"

# Reset exit_type so Chrome doesn't show "Something went wrong with your profile"
python3 -c "
import json, pathlib
p = pathlib.Path('$DEBUG_DIR/Default/Preferences')
prefs = json.loads(p.read_text())
prefs.setdefault('profile', {})['exit_type'] = 'Normal'
prefs.setdefault('profile', {})['exited_cleanly'] = True
p.write_text(json.dumps(prefs))
"

# Suppress first-run dialogs
touch "$DEBUG_DIR/First Run"

echo "Chrome debug profile ready at $DEBUG_DIR"
