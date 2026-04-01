# `wdiox execute` — JavaScript & Mobile Command Execution

Runs arbitrary JavaScript in the browser context, or Appium mobile commands on a native session.

> **Prefer dedicated commands first.** Use `execute` only when `click`, `fill`, `scroll`, or `navigate` don't cover the action. It has no element-ref system and its output is not snapshotted.

## Browser: JavaScript

```bash
wdiox execute "<script>"
wdiox execute "<script>" --args '<json>'
```

### Read page state
```bash
wdiox execute "return document.title"
wdiox execute "return window.location.href"
wdiox execute "return window.scrollY"
wdiox execute "return document.querySelector('.badge')?.textContent?.trim()"
```

### Trigger actions not covered by other commands
```bash
# Horizontal scroll (browser only supports up/down via wdiox scroll)
wdiox execute "window.scrollBy(500, 0)"

# Scroll element into view
wdiox execute "arguments[0].scrollIntoView()" --args '"#deep-section"'

# Trigger a custom event
wdiox execute "document.dispatchEvent(new Event('my-event'))"

# Set a value that React/Vue controls (bypasses synthetic event handling)
wdiox execute "Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(arguments[0], 'new value'); arguments[0].dispatchEvent(new Event('input', {bubbles:true}))" --args '"#controlled-input"'
```

### Argument resolution

When `--args` contains a string that matches a CSS selector and the element exists, it is automatically resolved to the element before calling the script:

```bash
# '#myButton' resolves to the element — equivalent to browser.$('#myButton').click()
wdiox execute "arguments[0].click()" --args '"#myButton"'

# Non-matching strings pass through as raw strings
wdiox execute "console.log(arguments[0])" --args '"hello world"'

# Pass an array of multiple args
wdiox execute "arguments[0].value = arguments[1]" --args '["#email", "test@example.com"]'
```

## Browser: Alert / Dialog Handling

Native browser dialogs (`alert`, `confirm`, `prompt`) block all subsequent commands. Use `execute` to intercept them before they appear, or use WebdriverIO's `acceptAlert`/`dismissAlert` equivalents via execute.

### Override alert before it fires
```bash
# Suppress all alerts for the session
wdiox execute "window.alert = () => {}; window.confirm = () => true; window.prompt = () => null"

# Then trigger the action that causes the alert
wdiox snapshot
wdiox click e3    # button that triggers window.confirm(...)
```

### Read and dismiss an already-open alert
```bash
# Get the alert text, then accept it
wdiox execute "return window.__lastAlertText__"   # if you patched alert() earlier

# Or use the Chromium CDP alert handling via execute
wdiox execute "document.querySelector('[role=dialog] button')?.click()"
```

### Capture alert text before dismissing
```bash
# Patch alert() to capture text before suppressing
wdiox execute "window.__alerts = []; window.alert = (t) => window.__alerts.push(t)"
# ... trigger the alert ...
wdiox execute "return window.__alerts"
```

## Mobile (Appium): `mobile:` commands

On a native Appium session, `browser.execute()` does not work for JavaScript. Use `mobile:` prefixed commands instead.

```bash
# Android key press (BACK=4, HOME=3, ENTER=66)
wdiox execute "mobile: pressKey" --args '{"keycode": 4}'

# Activate / bring app to foreground
wdiox execute "mobile: activateApp" --args '{"appId": "com.example.app"}'

# Terminate app
wdiox execute "mobile: terminateApp" --args '{"appId": "com.example.app"}'

# Deep link
wdiox execute "mobile: deepLink" --args '{"url": "myapp://screen", "package": "com.example.app"}'

# Android shell command
wdiox execute "mobile: shell" --args '{"command": "dumpsys", "args": ["battery"]}'

# Scroll gesture with explicit coordinates (Android — when wdiox scroll isn't enough)
wdiox execute "mobile: scrollGesture" --args '{"left":50,"top":300,"width":900,"height":1200,"direction":"up","percent":0.5}'

# Get contexts (switch between native and WebView)
wdiox execute "mobile: getContexts"
```

## Output format

| Return value | Printed as |
|---|---|
| `undefined` / `null` | `Executed successfully (no return value)` |
| Object / array | Pretty-printed JSON |
| String / number / boolean | `Result: <value>` |

## Step recording

`execute` is recorded as:
```json
{ "tool": "execute", "params": { "script": "return document.title", "args": [] }, "status": "ok", "durationMs": 23 }
```
