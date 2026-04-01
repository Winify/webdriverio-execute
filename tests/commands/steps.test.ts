import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import { handler } from '../../src/commands/steps.js';
import { writeSession } from '../../src/session.js';
import { initSteps, appendStep as realAppendStep } from '../../src/steps.js';
import type { SessionMetadata } from '../../src/session.js';

const TEST_DIR = path.join(os.tmpdir(), 'wdio-x-test-steps');

describe('steps command', () => {
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
  });

  afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('should print formatted table of steps for active session', async () => {
    await initSteps('default', 'abc123', 'browser', TEST_DIR);
    await realAppendStep('default', 'click', { ref: 'e1' }, 'ok', 89, undefined, TEST_DIR);
    await realAppendStep('default', 'type', { ref: 'e2', text: 'hello' }, 'error', 12, 'Element not found', TEST_DIR);

    await handler({ session: 'default', _sessionsDir: TEST_DIR } as unknown as Parameters<typeof handler>[0]);

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('click'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('type'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('error'));
  });

  it('should print raw JSON with --json flag', async () => {
    await initSteps('default', 'abc123', 'browser', TEST_DIR);
    await realAppendStep('default', 'click', { ref: 'e1' }, 'ok', 89, undefined, TEST_DIR);

    await handler({ session: 'default', json: true, _sessionsDir: TEST_DIR } as unknown as Parameters<typeof handler>[0]);

    const call = logSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(call) as unknown;
    expect(parsed).toMatchObject({ sessionId: 'abc123', steps: expect.any(Array) });
  });

  it('should print message when no steps recorded', async () => {
    await initSteps('default', 'abc123', 'browser', TEST_DIR);
    await handler({ session: 'default', _sessionsDir: TEST_DIR } as unknown as Parameters<typeof handler>[0]);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('No steps'));
  });

  it('should error when no steps file exists for session', async () => {
    await handler({ session: 'default', _sessionsDir: TEST_DIR } as unknown as Parameters<typeof handler>[0]);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('No steps file'));
  });

  it('should list archived steps files with --list', async () => {
    // Create a fake archived steps file
    const archivedName = 'default-20260401120000.steps.json';
    await fs.writeFile(
      path.join(TEST_DIR, archivedName),
      JSON.stringify({ sessionId: 'abc123', type: 'browser', startedAt: '2026-04-01T12:00:00Z', endedAt: '2026-04-01T12:05:00Z', steps: [] }),
    );

    await handler({ session: 'default', list: true, _sessionsDir: TEST_DIR } as unknown as Parameters<typeof handler>[0]);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining(archivedName));
  });

  it('should display a specific archived steps file with --file', async () => {
    const archivedPath = path.join(TEST_DIR, 'default-20260401120000.steps.json');
    await fs.writeFile(
      archivedPath,
      JSON.stringify({
        sessionId: 'abc123', type: 'browser',
        startedAt: '2026-04-01T12:00:00Z', endedAt: '2026-04-01T12:05:00Z',
        steps: [{ index: 1, tool: 'open', params: { url: 'https://example.com' }, status: 'ok', durationMs: 1200, timestamp: '2026-04-01T12:00:00Z' }],
      }),
    );

    await handler({ session: 'default', file: archivedPath, _sessionsDir: TEST_DIR } as unknown as Parameters<typeof handler>[0]);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('open'));
  });
});
