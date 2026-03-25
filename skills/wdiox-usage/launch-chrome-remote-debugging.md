# Launching Chrome with Remote Debugging

Use this to connect `wdiox open --attach` to a Chrome instance that carries your real browsing profile (cookies, logins, extensions).

## When to use

- You need to automate a site where you're already logged in
- You want to reuse your real Chrome cookies without re-authenticating
- You're testing against a local/internal URL that needs your browser state

## Workflow

1. **Prepare the debug profile** — copies your real Chrome profile to a temp dir
2. **Launch Chrome** with `--remote-debugging-port`
3. **Attach** with `wdiox open --attach`

---

## Step 1 — Prepare the debug profile

The debug profile lives at `/tmp/chrome-debug`. Copy from your real Chrome profile, then remove lock files that would cause conflicts.

### macOS

```bash
CHROME_SRC="$HOME/Library/Application Support/Google/Chrome"
DEBUG_DIR="/tmp/chrome-debug"

rm -rf "$DEBUG_DIR"
mkdir -p "$DEBUG_DIR"

cp "$CHROME_SRC/Local State" "$DEBUG_DIR/Local State"
cp -r "$CHROME_SRC/Default" "$DEBUG_DIR/Default"

# Remove singleton locks from the copy
rm -f "$DEBUG_DIR/SingletonLock" "$DEBUG_DIR/SingletonCookie" "$DEBUG_DIR/SingletonSocket"

# Remove session files (they reference the original profile; Chrome will error without this)
rm -f "$DEBUG_DIR/Default/Current Session" "$DEBUG_DIR/Default/Current Tabs"
rm -f "$DEBUG_DIR/Default/Last Session" "$DEBUG_DIR/Default/Last Tabs"

# Suppress first-run dialogs
touch "$DEBUG_DIR/First Run"
```

### Windows (PowerShell)

```powershell
$chromeSrc = "$env:LOCALAPPDATA\Google\Chrome\User Data"
$debugDir = "$env:TEMP\chrome-debug"

Remove-Item -Recurse -Force $debugDir -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $debugDir | Out-Null

Copy-Item "$chromeSrc\Local State" "$debugDir\Local State"
Copy-Item -Recurse "$chromeSrc\Default" "$debugDir\Default"

# Remove singleton locks
"SingletonLock","SingletonCookie","SingletonSocket" | ForEach-Object {
  Remove-Item "$debugDir\$_" -Force -ErrorAction SilentlyContinue
}

# Remove session files
"Current Session","Current Tabs","Last Session","Last Tabs" | ForEach-Object {
  Remove-Item "$debugDir\Default\$_" -Force -ErrorAction SilentlyContinue
}

New-Item -ItemType File -Path "$debugDir\First Run" | Out-Null
```

### Linux

```bash
CHROME_SRC="$HOME/.config/google-chrome"
DEBUG_DIR="/tmp/chrome-debug"

rm -rf "$DEBUG_DIR"
mkdir -p "$DEBUG_DIR"

cp "$CHROME_SRC/Local State" "$DEBUG_DIR/Local State"
cp -r "$CHROME_SRC/Default" "$DEBUG_DIR/Default"

rm -f "$DEBUG_DIR/SingletonLock" "$DEBUG_DIR/SingletonCookie" "$DEBUG_DIR/SingletonSocket"
rm -f "$DEBUG_DIR/Default/Current Session" "$DEBUG_DIR/Default/Current Tabs"
rm -f "$DEBUG_DIR/Default/Last Session" "$DEBUG_DIR/Default/Last Tabs"

touch "$DEBUG_DIR/First Run"
```

> **Note:** The `Default/` folder can be several hundred MB. The copy may take a few seconds.

---

## Step 2 — Launch Chrome

### macOS

```bash
'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/chrome-debug \
  --profile-directory=Default \
  --no-first-run \
  --disable-session-crashed-bubble \
  &
```

### Windows

```powershell
Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList `
  "--remote-debugging-port=9222",
  "--user-data-dir=$env:TEMP\chrome-debug",
  "--profile-directory=Default",
  "--no-first-run",
  "--disable-session-crashed-bubble"
```

### Linux

```bash
google-chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/chrome-debug \
  --profile-directory=Default \
  --no-first-run \
  --disable-session-crashed-bubble \
  &
```

---

## Step 3 — Wait for CDP, then attach

Chrome takes ~1–2 seconds to expose the CDP endpoint. Poll until it's ready:

```bash
until curl -sf http://localhost:9222/json/version > /dev/null; do sleep 0.3; done
```

Then attach with wdiox:

```bash
wdiox open --attach                                  # connect to existing session
wdiox open --attach https://app.example.com          # connect + navigate
```

---

## Fresh session (no profile copy)

If you don't need your real cookies, skip Step 1 and just launch Chrome with an empty dir:

```bash
rm -rf /tmp/chrome-debug && mkdir -p /tmp/chrome-debug
# then run the launch command from Step 2
```

---

## Notes

- **Cookies are copied at launch time.** Changes during the debug session don't sync back to your main profile.
- **Your main Chrome instance is unaffected** — the debug session uses a separate `--user-data-dir`.
- **Port 9222 is the default.** If it's taken, use any free port and pass `--debug-port <n>` to `wdiox open --attach`.
- **Extensions** in your Default profile are included in the copy and will load automatically.
