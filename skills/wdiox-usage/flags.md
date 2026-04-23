# wdiox Flag Reference

## `open` flags

| Flag                  | Default        | Notes                                      |
|-----------------------|----------------|--------------------------------------------|
| `--browser`           | `chrome`       | `chrome`, `firefox`, `edge`, `safari`      |
| `--headless`          | `false`        | Run Chrome in headless mode (`--headless=new` internally) |
| `--no-web-security`   | —              | Disable Chrome web security and CSP — use when snapshot fails on sites with strict CSP |
| `--config`            | —              | Path to a `wdio.conf.js` / `wdio.conf.ts` to fully override browser or Appium capabilities (see below) |
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

### `--config` — custom capabilities

When the built-in flags are not enough (custom Chrome profiles, Firefox options, remote grids, specific Appium driver versions, proxy settings, etc.) point `--config` at a standard WebdriverIO config file. wdiox reads the `capabilities` array from it, lets you pick one interactively if there are multiple, and uses it verbatim:

```bash
wdiox open --config ./wdio.conf.ts
wdiox open https://app.example.com --config ./wdio.conf.ts --session myapp
```

Minimal example `wdio.conf.ts` for a custom Chrome profile:

```ts
export const config = {
  capabilities: [{
    browserName: 'chrome',
    'goog:chromeOptions': {
      args: ['--user-data-dir=/path/to/profile', '--profile-directory=Default'],
    },
  }],
};
```

Minimal example for Appium:

```ts
export const config = {
  hostname: 'localhost',
  port: 4723,
  capabilities: [{
    platformName: 'Android',
    'appium:deviceName': 'Pixel_7_API_34',
    'appium:automationName': 'UiAutomator2',
    'appium:app': '/path/to/app.apk',
  }],
};
```

`--hostname`, `--port`, `--path`, `--browser`, `--app`, and `--device` passed on the CLI override the corresponding values from the config file.

## `snapshot` flags

| Flag            | Default   | Notes                                                    |
|-----------------|-----------|----------------------------------------------------------|
| `--visible`     | `true`    | Snapshot only viewport elements; `--no-visible` for all  |
| `WDIO_SESSION`  | `default` | Env var to set default session name globally             |

## `navigate` / `goto` flags

| Positional / Flag | Notes                                                          |
|-------------------|----------------------------------------------------------------|
| `<url>`           | URL to navigate to                                             |
| `refresh`         | Reload the current page (`wdiox navigate refresh`)             |
| `back`            | Go back in browser history (`wdiox navigate back`)             |
| `forward`         | Go forward in browser history (`wdiox navigate forward`)       |
| `--session` / `-s`| Session name (default: `default`)                              |

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
