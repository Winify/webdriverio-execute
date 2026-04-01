import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const { mockExecute, mock$ } = vi.hoisted(() => {
  const execute = vi.fn();
  const $fn = vi.fn().mockResolvedValue({ isExisting: vi.fn().mockResolvedValue(true) });
  return { mockExecute: execute, mock$: $fn };
});

vi.mock('webdriverio', () => ({
  attach: vi.fn().mockResolvedValue({ execute: mockExecute, $: mock$ }),
}));
vi.mock('../../src/steps.js', () => ({
  appendStep: vi.fn().mockResolvedValue(undefined),
}));

import { handler } from '../../src/commands/execute.js';
import { writeSession } from '../../src/session.js';
import type { SessionMetadata } from '../../src/session.js';
import { appendStep } from '../../src/steps.js';

const TEST_DIR = path.join(os.tmpdir(), 'wdio-x-test-execute');

describe('execute command', () => {
  const meta: SessionMetadata = {
    sessionId: 'abc123', hostname: 'localhost', port: 4444,
    capabilities: { browserName: 'chrome' },
    created: '2026-02-15T10:00:00Z', url: 'https://example.com',
  };

  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
    await writeSession('default', meta, TEST_DIR);
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockExecute.mockClear();
    mock$.mockClear();
    vi.mocked(appendStep).mockClear();
  });

  afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('should execute script and print result', async () => {
    mockExecute.mockResolvedValueOnce('My Page Title');
    await handler({ script: 'return document.title', session: 'default', _sessionsDir: TEST_DIR } as unknown as Parameters<typeof handler>[0]);
    expect(mockExecute).toHaveBeenCalledWith('return document.title');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('My Page Title'));
    expect(appendStep).toHaveBeenCalledWith('default', 'execute', { script: 'return document.title', args: [] }, 'ok', expect.any(Number), undefined, expect.any(String));
  });

  it('should print message when script returns no value', async () => {
    mockExecute.mockResolvedValueOnce(undefined);
    await handler({ script: 'window.myFlag = true', session: 'default', _sessionsDir: TEST_DIR } as unknown as Parameters<typeof handler>[0]);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('no return value'));
  });

  it('should resolve selector args to elements for non-mobile scripts', async () => {
    const fakeElement = { isExisting: vi.fn().mockResolvedValue(true) };
    mock$.mockResolvedValueOnce(fakeElement);
    mockExecute.mockResolvedValueOnce(undefined);
    await handler({ script: 'arguments[0].click()', args: '#myButton', session: 'default', _sessionsDir: TEST_DIR } as unknown as Parameters<typeof handler>[0]);
    expect(mock$).toHaveBeenCalledWith('#myButton');
    expect(mockExecute).toHaveBeenCalledWith('arguments[0].click()', fakeElement);
  });

  it('should pass args as-is for mobile: scripts without selector resolution', async () => {
    mockExecute.mockResolvedValueOnce(undefined);
    await handler({ script: 'mobile: pressKey', args: '{"keycode":4}', session: 'default', _sessionsDir: TEST_DIR } as unknown as Parameters<typeof handler>[0]);
    // No selector resolution for mobile: scripts
    expect(mock$).not.toHaveBeenCalled();
    expect(mockExecute).toHaveBeenCalledWith('mobile: pressKey', { keycode: 4 });
  });

  it('should record error step and print error when script throws', async () => {
    mockExecute.mockRejectedValueOnce(new Error('Script error'));
    await handler({ script: 'throw new Error("oops")', session: 'default', _sessionsDir: TEST_DIR } as unknown as Parameters<typeof handler>[0]);
    expect(appendStep).toHaveBeenCalledWith(
      'default', 'execute', expect.any(Object), 'error', expect.any(Number), 'Script error', expect.any(String),
    );
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Script error'));
  });

  it('should error when no session exists', async () => {
    await handler({ script: 'return 1', session: 'nonexistent', _sessionsDir: TEST_DIR } as unknown as Parameters<typeof handler>[0]);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('No active session'));
    expect(mockExecute).not.toHaveBeenCalled();
  });
});
