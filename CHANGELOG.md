# Changelog

## [1.0.0](https://github.com/Winify/webdriverio-execute/compare/v0.3.0...v1.0.0) (2026-04-02)

### ⚠ BREAKING CHANGES

* Change default directory to `__cwd__/.wdiox`

### Features

* Add new commands (`execute`, `navigate`, `scroll`, `steps`) for session automation ([19a9935](https://github.com/Winify/webdriverio-execute/commit/19a993532b59de8af4ddf5e9143d6a6b7a58f9b5))
* Implement step tracking and persistence for session actions ([dbbb257](https://github.com/Winify/webdriverio-execute/commit/dbbb2573d99a974d6e2257d2d7be568753dfbbfc))

## 0.3.0 (2026-03-25)

### Features

* Add SKILL.md documentation for `webdriverio-execute` tool ([8ed4074](https://github.com/Winify/webdriverio-execute/commit/8ed40746f25fbb8da835c4b4aaf30d5b56185c01))
* Implement `--attach` functionality for mobile and chrome sessions ([0649e67](https://github.com/Winify/webdriverio-execute/commit/0649e67d5f249ff0f52f964f16ac3f5a5fe5a5f8))

### Bug Fixes

* Introduce detach in `chromedriverOptions` to correctly manage open command ([82c282d](https://github.com/Winify/webdriverio-execute/commit/82c282d35dc867c2e2d0a45d82cc04ccc35954ea))
* **open:** handle `--attach` option to skip prompting for existing sessions and update ESLint ignores ([ceef74a](https://github.com/Winify/webdriverio-execute/commit/ceef74a1d4f1f3d7b19a032f7069827271138bcc))
* Use environment variable for password in example ([cac36fc](https://github.com/Winify/webdriverio-execute/commit/cac36fc4d6aadd224cc5324f58aa083062c1c815))
