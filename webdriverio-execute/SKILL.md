---
name: webdriverio-execute
description: Use when automating a browser or mobile app interactively from the CLI, inspecting page elements, clicking or filling inputs by snapshot reference, or scripting multi-step browser workflows without writing test code.
---

# wdiox — WebdriverIO Execute

CLI tool for interactive browser and Appium automation. Sessions persist on disk; every command is stateless.

## When to Use

- Explore a live page or app without writing a test file
- Quickly click, fill, or screenshot a running browser/app session
- Script a multi-step browser workflow from the shell
- Debug a UI flow by inspecting elements interactively
- Automate a mobile app (Android/iOS via Appium) from the terminal

## Quick Reference

```bash
# Browser
wdiox open https://example.com
wdiox snapshot                    # capture viewport elements → assigns e1, e2, …
wdiox snapshot --no-visible       # capture ALL elements (including off-screen)
wdiox click e3
wdiox fill e1 "hello@example.com"
wdiox screenshot /tmp/page.png
wdiox close

# Mobile (Appium)
wdiox open --app ./app.apk --device "emulator-5554"
wdiox snapshot                    # mobile elements → e1, e2, …
wdiox click e2
wdiox close

# Multi-session
wdiox open https://site-a.com --session a
wdiox open https://site-b.com --session b
wdiox snapshot --session a
wdiox ls                          # list all active sessions
wdiox close --session b

# Aliases
wdiox start / new                 # → open
wdiox stop                        # → close
wdiox type <ref> <text>           # → fill
```

## Element Refs

`snapshot` writes numbered refs (`e1`, `e2`, …) to `~/.wdio-x/sessions/<name>.refs.json`. Refs resolve to the best available selector:

1. `tag*=text` (text match)
2. `aria/label`
3. `[data-testid]`
4. `#id`
5. `tag[name=…]`
6. `tag.class`
7. CSS path with `:nth-of-type`

For Appium, prefer `[accessibility-id: …]` or `[resource-id: …]` over raw XPath.

## Common Use Cases

### Explore a page interactively
```bash
wdiox open https://app.example.com/login
wdiox snapshot
# → e1  input[email]  "Email"  #email
# → e2  input[password]  "Password"  #password
# → e3  button  "Sign in"  button*=Sign in
wdiox fill e1 "user@example.com"
wdiox fill e2 "password123"
wdiox click e3
wdiox snapshot          # re-snapshot after navigation
```

### Automate a mobile app
```bash
wdiox open --app ./app.apk --device "emulator-5554" \
  --no-accept-alert     # override alert defaults
wdiox snapshot
wdiox click e3          # "Accept All Cookies"
wdiox snapshot
```

## Open Flags

| Flag                  | Default        | Notes                                      |
|-----------------------|----------------|--------------------------------------------|
| `--browser`           | `chrome`       | `chrome`, `firefox`, `edge`, `safari`      |
| `--app`               | —              | Path to `.apk`, `.ipa`, or `.app`          |
| `--device`            | `emulator-5554`| Device name for Appium                     |
| `--grant-permissions` | `true`         | Auto-grant app permissions (Appium)        |
| `--accept-alert`      | `true`         | Auto-accept native alerts (Appium)         |
| `--auto-dismiss`      | `false`        | Auto-dismiss native alerts (Appium)        |
| `--session` / `-s`    | `default`      | Name for this session                      |

## Snapshot Flags

| Flag            | Default | Notes                                                              |
|-----------------|---------|--------------------------------------------------------------------|
| `--visible`     | `true`  | Snapshot only viewport elements; `--no-visible` captures all      |
| `WDIO_SESSION`  | `default` | Env var to set default session name globally                     |

## Common Mistakes

- **Running `click` before `snapshot`** — refs file won't exist; always snapshot first
- **Stale refs after navigation** — re-run `snapshot` after page changes
- **Element not in snapshot** — it may be below the fold; try `wdiox snapshot --no-visible`
- **Mobile session shows `App: unknown`** — close and reopen session; old sessions predate the fix that preserves `appium:app` in metadata
