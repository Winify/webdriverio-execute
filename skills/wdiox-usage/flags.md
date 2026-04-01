# wdiox Flag Reference

## `open` flags

| Flag                  | Default        | Notes                                      |
|-----------------------|----------------|--------------------------------------------|
| `--browser`           | `chrome`       | `chrome`, `firefox`, `edge`, `safari`      |
| `--app`               | —              | Path to `.apk`, `.ipa`, or `.app`          |
| `--device`            | `emulator-5554`| Device name for Appium                     |
| `--platform`          | auto-detected  | `android` or `ios`                         |
| `--hostname`          | `localhost`    | WebDriver/Appium server hostname           |
| `--port`              | `4723`/`4444`  | Server port                                |
| `--path`              | `/`            | WebDriver/Appium server session path       |
| `--grant-permissions` | `true`         | Auto-grant app permissions (Appium)        |
| `--accept-alert`      | `true`         | Auto-accept native alerts (Appium)         |
| `--auto-dismiss`      | `false`        | Auto-dismiss native alerts (Appium)        |
| `--attach`            | `false`        | Connect to a running browser or app instead of launching |
| `--debug-port`        | `9222`         | Chrome remote debugging port (`--attach` only) |
| `--debug-host`        | `localhost`    | Chrome remote debugging host (`--attach` only) |
| `--session` / `-s`    | `default`      | Session name                               |

## `snapshot` flags

| Flag            | Default   | Notes                                                    |
|-----------------|-----------|----------------------------------------------------------|
| `--visible`     | `true`    | Snapshot only viewport elements; `--no-visible` for all  |
| `WDIO_SESSION`  | `default` | Env var to set default session name globally             |

## `navigate` / `goto` flags

| Positional / Flag | Notes                                    |
|-------------------|------------------------------------------|
| `<url>`           | URL to navigate to (required)            |
| `--session` / `-s`| Session name (default: `default`)        |

## `scroll` / `swipe` flags

| Positional / Flag | Default   | Notes                                                                 |
|-------------------|-----------|-----------------------------------------------------------------------|
| `<direction>`     | —         | `up`, `down`, `left`, `right` (required)                              |
| `--pixels`        | `500`     | Pixels to scroll — **browser only**                                   |
| `--duration`      | `500`     | Swipe duration in ms — **mobile only**                                |
| `--percent`       | `0.5` / `0.95` | Screen percentage to swipe — **mobile only**; defaults to `0.5` for vertical, `0.95` for horizontal |

Browser only supports `up`/`down`. For horizontal browser scroll use `wdiox execute "window.scrollBy(x, 0)"`.

Mobile uses `mobile: scrollGesture` (Android) or `browser.swipe()` (iOS) internally.

## `execute` flags

| Positional / Flag | Notes                                                                 |
|-------------------|-----------------------------------------------------------------------|
| `<script>`        | JavaScript string (browser) or `mobile: <command>` (Appium, required) |
| `--args`          | JSON-encoded argument(s): array `'["val"]'` or single value `'"#id"'` or object `'{"key":1}'` |

## `steps` / `record` flags

| Flag       | Notes                                                             |
|------------|-------------------------------------------------------------------|
| `--json`   | Print raw `StepsFile` JSON instead of a formatted table           |
| `--list`   | List all archived steps files in `.wdiox/`                        |
| `--file`   | Path to a specific archived steps file to display                 |
