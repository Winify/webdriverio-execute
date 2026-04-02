# wdiox — WebdriverIO Execute

Interactive browser and app CLI for developers, powered by [WebdriverIO](https://webdriver.io).

```
npm install -g webdriverio-execute
```

## How it works

Each command is stateless. Sessions are stored as JSON in `.wdiox/` in the current working directory (add `.wdiox/` to your `.gitignore`). Commands attach to an existing session by reading that file — no daemon, no background process.

`snapshot` captures all interactable elements and assigns short refs (`e1`, `e2`, …). Subsequent commands use those refs to act on elements.

Every action command appends a step to `<session>.steps.json`. On `close`, the steps file is renamed to `<session>-<YYYYMMDDHHmmss>.steps.json` and preserved on disk.

## Commands

### `open` / `new` / `start`

Open a browser or Appium session.

```bash
wdiox open https://example.com
wdiox open https://example.com --browser firefox
wdiox open --app /path/to/app.apk --device "emulator-5554"
wdiox open --app /path/to/app.ipa --device "iPhone 15"

# Attach to an already-running Chrome instance (via CDP)
wdiox open --attach
wdiox open --attach --debug-port 9333 --debug-host 127.0.0.1

# Attach to an already-running mobile app (Appium)
wdiox open --attach --device "emulator-5554" --platform android
```

| Option | Default | Description |
|---|---|---|
| `--browser` | `chrome` | Browser to use (`chrome`, `firefox`, `edge`, `safari`) |
| `--app` | — | Path to mobile app (`.apk`, `.ipa`, `.app`) |
| `--device` | `emulator-5554` | Device name |
| `--platform` | auto-detected | `android` or `ios` |
| `--hostname` | `localhost` | WebDriver/Appium server hostname |
| `--port` | `4723` (mobile) / `4444` (browser) | Server port |
| `--grant-permissions` | `true` | Auto-grant app permissions (Appium) |
| `--accept-alert` | `true` | Auto-accept native alerts (Appium) |
| `--auto-dismiss` | `false` | Auto-dismiss native alerts (Appium) |
| `--attach` | `false` | Attach to an already-running browser or app instead of launching a new one |
| `--debug-port` | `9222` | Chrome remote debugging port (used with `--attach`) |
| `--debug-host` | `localhost` | Chrome remote debugging host (used with `--attach`) |
| `--session` | `default` | Session name |

If a session with the given name is already active, you'll be prompted to close it first.

---

### `snapshot`

Capture interactable elements on the current page or screen and assign numbered refs.

```bash
wdiox snapshot
wdiox snapshot --no-visible   # include off-screen elements
```

```
 Page: https://example.com/login

e1    input[email]  "Email address"  #email
e2    input[password]  "Password"  #password
e3    button  "Sign in"  button*=Sign in

 3 elements - default session
```

---

### `click`

Click an element by ref.

```bash
wdiox click e3
```

---

### `fill` / `type`

Clear and type into an input by ref.

```bash
wdiox fill e1 "hello@example.com"
wdiox type e2 "mysecretpassword"
```

---

### `screenshot`

Save a screenshot.

```bash
wdiox screenshot
wdiox screenshot /tmp/login-page.png
```

---

### `navigate` / `goto`

Navigate to a URL within the active session.

```bash
wdiox navigate https://example.com/login
wdiox goto https://example.com/login
```

---

### `scroll` / `swipe`

Scroll the page (browser) or swipe (mobile).

```bash
wdiox scroll down
wdiox scroll up --pixels 1000
wdiox swipe left --duration 300 --percent 0.9
```

| Option | Default | Description |
|---|---|---|
| `--pixels` | `500` | Pixels to scroll (browser only) |
| `--duration` | `500` | Swipe duration in ms (mobile only) |
| `--percent` | `0.5` (vertical) / `0.95` (horizontal) | Screen percentage to swipe, `0`–`1` (mobile only) |

> Browser: `up`/`down` only. For horizontal scroll use `execute`.

---

### `execute`

Execute JavaScript in the browser, or run a mobile command via Appium.

```bash
wdiox execute "return document.title"
wdiox execute "return arguments[0].textContent" --args '["#main"]'
wdiox execute "mobile: pressKey" --args '{"keycode": 4}'
```

| Option | Default | Description |
|---|---|---|
| `--args` | — | JSON-encoded arguments (array or single value) |

String args that match a valid CSS selector are automatically resolved to DOM elements before the script runs.

---

### `steps` / `record`

Display recorded steps for the active session or list archived step files.

```bash
wdiox steps                       # active session steps
wdiox steps --json                # raw JSON output
wdiox steps --list                # list all archived step files
wdiox steps --file .wdiox/<session>-20240101120000.steps.json
```

| Option | Default | Description |
|---|---|---|
| `--json` | `false` | Output raw JSON |
| `--list` | `false` | List all archived steps files |
| `--file` | — | Display a specific archived steps file by path |

---

### `close` / `stop`

Close the current session.

```bash
wdiox close
wdiox close --session myapp
```

---

### `ls` / `session-list`

List all active sessions.

```bash
wdiox ls
```

```
NAME     BROWSER   URL                       STATUS
default  chrome    https://example.com       active
myapp    Android   /path/to/app.apk          active
```

---

## Multi-session

Every command accepts `--session <name>` (or `-s <name>`) to target a specific session. The `WDIO_SESSION` environment variable sets the default session name.

```bash
wdiox open https://site-a.com --session a
wdiox open https://site-b.com --session b
wdiox snapshot --session a
wdiox click e1 --session a
wdiox close --session b
```

## Typical browser workflow

```bash
wdiox open https://example.com
wdiox snapshot
wdiox fill e1 "user@example.com"
wdiox fill e2 "password"
wdiox click e3
wdiox navigate https://example.com/dashboard
wdiox scroll down
wdiox screenshot
wdiox steps
wdiox close
```

## Typical mobile workflow

```bash
wdiox open --app ./app.apk --device "emulator-5554"
wdiox snapshot
wdiox click e1
wdiox fill e2 "hello"
wdiox close
```
