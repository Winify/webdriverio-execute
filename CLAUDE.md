# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`wdiox` is a stateless CLI for browser and mobile app automation using WebdriverIO. Each command attaches to a session, performs an action, and exits — no daemon or background process.

## Development Commands

```bash
pnpm run bundle      # Build to build/ directory (tsup, ESM only)
pnpm run dev         # Watch mode build
pnpm run test        # Run tests with vitest
pnpm run typecheck   # TypeScript type checking (tsc --noEmit)
pnpm run lint        # ESLint fix + typecheck
pnpm run link        # Build and link globally for local testing
```

Pre-commit hooks automatically run: lint-staged → typecheck → test

## Architecture

### Session Management (`src/session.ts`)

Sessions are JSON files in `~/.wdio-x/sessions/`. Each session file stores:

- `sessionId`, `hostname`, `port` — for reattaching via WebdriverIO's `attach()`
- `capabilities` — browser/app capabilities
- `url` — current page URL
- `isAttached` — whether session was attached vs. started fresh

Session files are named `{name}.json`. Refs are stored in `{name}.refs.json`.

### Refs System (`src/refs.ts`)

The `snapshot` command assigns element references (`e1`, `e2`, …) to interactable elements. Other commands (`click`, `fill`) use these refs to locate elements. Refs are persisted per-session as JSON.

### Commands (`src/commands/`)

All commands are yargs modules with `command`, `desc`, `builder`, and `handler` exports. Handlers use `withSession()` wrapper (except `open` and `session-list`) to read session metadata before executing.

### CDP Integration (`src/cdp.ts`)

Chrome DevTools Protocol utilities for `--attach` mode:

- `waitForCDP()` — polls until Chrome's debugging port is ready
- `closeStaleMappers()` — cleans up stale BiDi mapper tabs from previous sessions
- `restoreAndSwitchToActiveTab()` — restores tab URLs after BiDi remaps them to `about:blank`

### Entry Point (`bin/wdiox.js`)

Sets `WDIO_LOG_LEVEL=error` before importing WebdriverIO, then delegates to `src/cli.ts`.

## Key Dependencies

- **yargs** — CLI argument parsing
- **webdriverio** — browser/mobile automation via `remote()` and `attach()`
- **@wdio/mcp** — element snapshot utilities (`getInteractableBrowserElements`, `getMobileVisibleElements`)
- **@wdio/eslint** — shared ESLint config (indent: 2 spaces, trailing commas, semicolons)

## Testing

Tests use vitest with file naming pattern `tests/**/*.test.ts`. Tests mock session directories with temp directories (`os.tmpdir()`). Run single tests with:

```bash
pnpm run test tests/session.test.ts
```
