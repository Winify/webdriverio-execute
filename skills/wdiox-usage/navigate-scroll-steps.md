# `navigate`, `scroll`, and `steps` — Guide

## `wdiox navigate <url|action>` / `goto <url>`

Changes the URL of the active session, or controls browser history. Works on both browser and mobile (deep link / intent).

```bash
wdiox navigate https://example.com/dashboard
wdiox goto https://example.com/settings      # alias

# Browser history actions
wdiox navigate refresh   # reload the current page
wdiox navigate back      # go back in browser history
wdiox navigate forward   # go forward in browser history
```

**When to use over `open`:**
- Mid-session page changes (after login, after clicking a link that fails, etc.)
- Skipping intermediate pages in a multi-step flow to resume from a known URL
- Mobile deep links (if the app registers the URL scheme)

**Mobile note:** `navigate` on a native Appium session sends a URL intent via ADB. It works for apps that register URL schemes (deep links). For navigating within the app, use `click` on nav elements instead. History actions (`refresh`, `back`, `forward`) are browser-only.

```bash
# Browser: skip login, start from the dashboard
wdiox open https://app.example.com/login
wdiox fill e2 user@example.com && wdiox fill e3 "$PASSWORD" && wdiox click e4
wdiox navigate https://app.example.com/dashboard   # jump straight to target
wdiox snapshot

# Reload after a form submission to check the result
wdiox click e3 && wdiox navigate refresh && wdiox snapshot
```

---

## `wdiox scroll <direction>` / `swipe <direction>`

Scrolls the page (browser) or swipes the screen (mobile).

```
wdiox scroll <up|down|left|right> [options]
```

### Browser

Only `up` and `down` are supported. Scrolls the page by pixels using `window.scrollBy`.

```bash
wdiox scroll down                 # scroll down 500px (default)
wdiox scroll up --pixels 1000     # scroll up 1000px
```

> **Always re-snapshot after scrolling.** Refs are assigned to the last snapshot's viewport. After scrolling, new elements come into view — run `wdiox snapshot` before the next `click` or `fill`.

For horizontal browser scroll use `wdiox execute "window.scrollBy(500, 0)"`.

### Mobile

All four directions are supported. Uses `mobile: scrollGesture` (Android) or `browser.swipe()` (iOS) internally.

```bash
wdiox scroll down                 # swipe down (content moves down)
wdiox scroll up                   # swipe up
wdiox scroll left                 # carousel / onboarding next page
wdiox scroll right                # carousel / onboarding previous page

wdiox scroll down --percent 0.8   # swipe 80% of screen height
wdiox scroll left --duration 300  # faster swipe (300ms)
```

**Direction convention:** direction refers to content movement, not finger movement. `scroll down` = content moves down = finger swipes up.

**Typical mobile pattern:**
```bash
# Swipe through onboarding
wdiox open --app app.apk
wdiox snapshot                    # Step 1
wdiox scroll left                 # Step 2
wdiox scroll left                 # Step 3
wdiox scroll left                 # Step 4
wdiox snapshot
wdiox click e4                    # "Let's go!"
```

---

## `wdiox steps` / `record`

Displays the recorded step log for a session. Every command (`open`, `click`, `fill`, `navigate`, `scroll`, `execute`, `snapshot`, `screenshot`) is recorded automatically — no setup needed.

### Active session
```bash
wdiox steps                       # formatted table
wdiox steps --json                # raw StepsFile JSON
```

**Table columns:** `#`, `TOOL`, `PARAMS`, `STATUS`, `DURATION`, `TIMESTAMP`

`click` and `fill` params include both the ref and the resolved selector, so the log is replayable without re-snapshotting:
```
7   click    ref=e4 selector=android=new UiSelector().text("Let's go!")   ok   2167ms
```

### Archived sessions

Steps are finalized and renamed on `close`:  
`.wdiox/<session>-<YYYYMMDDHHmmss>.steps.json`

```bash
wdiox steps --list                # list all archived files in .wdiox/
wdiox steps --file .wdiox/default-20260401120000.steps.json
wdiox steps --file .wdiox/default-20260401120000.steps.json --json
```

### Reading step data in scripts
```bash
# Count how many steps ran successfully
wdiox steps --json | python3 -c "
import sys, json
s = json.load(sys.stdin)['steps']
print(f\"{sum(1 for x in s if x['status']=='ok')}/{len(s)} steps ok\")
"

# Get the selector used for every click
wdiox steps --json | python3 -c "
import sys, json
for s in json.load(sys.stdin)['steps']:
    if s['tool'] == 'click':
        print(s['params'].get('selector','?'))
"
```

### Step schema

```json
{
  "sessionId": "abc123",
  "type": "browser",
  "startedAt": "2026-04-01T10:00:00.000Z",
  "endedAt": "2026-04-01T10:05:00.000Z",
  "steps": [
    {
      "index": 1,
      "tool": "open",
      "params": { "url": "https://example.com", "browser": "chrome" },
      "status": "ok",
      "durationMs": 3714,
      "timestamp": "2026-04-01T10:00:00.000Z"
    }
  ]
}
```

Mobile `open` params use `app` and `platform` instead of `url` and `browser`:
```json
{ "app": "/path/to/app.apk", "platform": "android" }
```
