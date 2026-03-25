# Launching Chrome with Remote Debugging

Use this to connect `wdiox open --attach` to a Chrome instance that carries your real browsing profile (cookies, logins, extensions).

## Supporting scripts

- [`scripts/prepare-chrome-profile.sh`](scripts/prepare-chrome-profile.sh) — copies your real Chrome profile to `/tmp/chrome-debug`, removes lock/session files, resets exit state (macOS + Linux)
- [`scripts/prepare-chrome-profile.ps1`](scripts/prepare-chrome-profile.ps1) — same for Windows PowerShell
- [`scripts/launch-chrome.sh`](scripts/launch-chrome.sh) — launches Chrome with `--remote-debugging-port` and waits for CDP (macOS + Linux); accepts optional port argument

## When to use

- You need to automate a site where you're already logged in
- You want to reuse your real Chrome cookies without re-authenticating
- You're testing against a local/internal URL that needs your browser state

## Workflow

### macOS / Linux

```bash
# Step 1 — prepare the debug profile (copies cookies/logins from your real Chrome)
bash skills/wdiox-usage/scripts/prepare-chrome-profile.sh

# Step 2 — launch Chrome with remote debugging
bash skills/wdiox-usage/scripts/launch-chrome.sh          # port 9222 (default)
bash skills/wdiox-usage/scripts/launch-chrome.sh 9333     # custom port

# Step 3 — attach
wdiox open --attach
wdiox open --attach https://app.example.com
wdiox open --attach --debug-port 9333    # if using a custom port
```

### Windows

```powershell
# Step 1 — prepare the debug profile
.\skills\wdiox-usage\scripts\prepare-chrome-profile.ps1

# Step 2 — launch Chrome
Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList `
  "--remote-debugging-port=9222",
  "--user-data-dir=$env:TEMP\chrome-debug",
  "--profile-directory=Default",
  "--no-first-run",
  "--disable-session-crashed-bubble"

# Wait for CDP
while (-not (Invoke-WebRequest -Uri "http://localhost:9222/json/version" -UseBasicParsing -ErrorAction SilentlyContinue).StatusCode -eq 200) { Start-Sleep -Milliseconds 300 }

# Step 3 — attach
wdiox open --attach
```

## Fresh session (no profile copy)

Skip the prepare step and just launch Chrome with an empty dir:

```bash
rm -rf /tmp/chrome-debug && mkdir -p /tmp/chrome-debug
bash skills/wdiox-usage/scripts/launch-chrome.sh
```

## Notes

- **Cookies are copied at launch time.** Changes during the debug session don't sync back to your main profile.
- **Your main Chrome instance is unaffected** — the debug session uses a separate `--user-data-dir`.
- **Port 9222 is the default.** If it's taken, pass a port to `launch-chrome.sh` and `--debug-port` to `wdiox open --attach`.
- **Extensions** in your Default profile are included in the copy and will load automatically.
