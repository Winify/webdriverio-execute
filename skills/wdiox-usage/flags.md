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
