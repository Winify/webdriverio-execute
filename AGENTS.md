# AGENTS.md

Guidelines for agentic coding agents working in this repository.

## Project Overview

This is `webdriverio-execute` (CLI: `wdiox`), an interactive browser and app automation CLI powered by WebdriverIO. It manages sessions as JSON files in `~/.wdio-x/sessions/`.

## Build/Lint/Test Commands

```bash
# Install dependencies
pnpm install

# Build (bundles to build/ directory)
pnpm run bundle

# Development (watch mode)
pnpm run dev

# Run all tests
pnpm run test

# Run a single test file
pnpm run test tests/commands/open.test.ts

# Run tests matching a pattern
pnpm run test -- --grep "open command"

# Type checking only
pnpm run typecheck

# Lint (ESLint + typecheck)
pnpm run lint
```

## Code Style

### TypeScript Configuration

- Target: ES2022, Module: ESNext
- Strict mode enabled
- Module resolution: bundler
- Declaration files generated

### ESLint Rules

From `eslint.config.mjs`:
- Indent: 2 spaces
- Trailing commas: always-multiline
- Semicolons: always
- Curly braces: multi-line

### Import Conventions

```typescript
// Node.js built-ins use node: prefix
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

// External packages (no extension)
import { attach, remote } from 'webdriverio';
import type { ArgumentsCamelCase, Argv } from 'yargs';

// Internal imports use .js extension (required for ESM)
import { writeSession, readSession } from '../session.js';
import type { SessionMetadata } from '../session.js';
```

Order: Node built-ins → External packages → Internal imports

### Type Imports

Use `import type` for type-only imports:
```typescript
import type { ArgumentsCamelCase, Argv } from 'yargs';
import type { Capabilities } from '@wdio/types';
import type { AttachOptions } from 'webdriverio';
```

### Naming Conventions

- **Variables/functions**: camelCase (`getSessionDir`, `isEnoent`)
- **Types/interfaces**: PascalCase (`SessionMetadata`, `RefEntry`)
- **Files**: kebab-case (`session-list.ts`, `open.ts`)
- **Constants**: UPPER_SNAKE_CASE for true constants, camelCase otherwise
- **Command exports**: `command`, `desc`, `builder`, `handler`

### Interface Definitions

```typescript
export interface SessionMetadata {
  sessionId: string
  hostname: string
  port: number
  capabilities: Record<string, unknown>
  created: string
  url: string
}
```

- No "I" prefix for interfaces
- One property per line
- No trailing comma on last property in inline types

### Error Handling

```typescript
// Use unknown for catch variables
catch (err: unknown) {
  if (err instanceof Error) {
    console.error(err.message);
  }
}

// Helper function pattern for type narrowing
function isEnoent(err: unknown): boolean {
  return err instanceof Error && 'code' in err && 
    (err as NodeJS.ErrnoException).code === 'ENOENT';
}
```

### Async Functions

- Always use `async/await`
- Return `Promise<void>` for functions that don't return values
- Use `Promise.all` for parallel operations

### Command Handler Pattern

```typescript
export const command = 'click <ref>';
export const desc = 'Click an element by snapshot reference';

export const builder = (yargs: Argv) => {
  return yargs.positional('ref', {
    type: 'string',
    describe: 'Element reference from snapshot',
  });
};

interface ClickArgs {
  ref: string
  session: string
  _sessionsDir?: string
}

export const handler = withSession<ClickArgs>(async (argv, meta, sessionsDir) => {
  // Implementation
});
```

### Testing Conventions

- Test files mirror src structure: `tests/commands/open.test.ts`
- Use Vitest: `import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'`
- Mock external dependencies at the top with `vi.mock()`
- Use `vi.hoisted()` for mock functions that need to be available during module loading
- Use temp directories for file system tests, clean up in `afterEach`

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockFn } = vi.hoisted(() => ({
  mockFn: vi.fn(),
}));

vi.mock('webdriverio', () => ({
  remote: vi.fn().mockResolvedValue({ /* ... */ }),
}));

describe('module name', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
    vi.restoreAllMocks();
  });

  it('should do something', async () => {
    // Test
    expect(result).toBe(expected);
  });
});
```

### File Organization

```
src/
  cli.ts           # Entry point, yargs setup
  session.ts       # Session management utilities
  refs.ts          # Element reference utilities
  format.ts        # Output formatting
  commands/
    open.ts        # Command implementations
    close.ts
    snapshot.ts
    ...

tests/
  session.test.ts
  refs.test.ts
  format.test.ts
  commands/
    open.test.ts
    ...
```

### Console Output

- Use `console.log()` for success/info messages
- Use `console.error()` for error messages
- Format: `Session "${name}" started.` or `Error: No snapshot taken.`

### Environment Variables

- `WDIO_SESSION`: Default session name
- `WDIO_LOG_LEVEL`: WebdriverIO log level (default: 'error')

## Key Patterns

### Session Wrapper

Use `withSession` helper for commands requiring an active session:

```typescript
export const handler = withSession<Args>(async (argv, meta, sessionsDir) => {
  // meta contains sessionId, hostname, port, capabilities
  const browser = await attach(buildAttachOptions(meta));
  // ... work with browser
});
```

### Ref Lookup Pattern

```typescript
const result = await lookupRef(getRefsPath(sessionName, sessionsDir), refKey);
if (!result) return; // Error already logged
const { ref, selector } = result;
```

## Package Manager

This project uses pnpm. Always use `pnpm` commands, not `npm` or `yarn`.

## Node Version

Minimum Node.js version: 18.20.0