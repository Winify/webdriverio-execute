# wdiox

Interactive browser and app CLI for developers, powered by [WebdriverIO](https://webdriver.io).

```
npm install -g webdriverio-execute
```

## How it works

Each command is stateless. Sessions are stored as JSON in `~/.wdio-x/sessions/`. Commands attach to an existing session by reading that file — no daemon, no background process.

`snapshot` captures all interactable elements and assigns short refs (`e1`, `e2`, …). Subsequent commands use those refs to act on elements.

## Commands

### `open` / `new` / `start`

Open a browser or Appium session.

```bash
wdiox open https://example.com
wdiox open https://example.com --browser firefox
wdiox open --app /path/to/app.apk --device "emulator-5554"
wdiox open --app /path/to/app.ipa --device "iPhone 15"
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
wdiox screenshot
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
