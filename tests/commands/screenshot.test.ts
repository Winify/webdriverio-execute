import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const { mockSaveScreenshot } = vi.hoisted(() => ({
  mockSaveScreenshot: vi.fn(),
}));
vi.mock('webdriverio', () => ({
  attach: vi.fn().mockResolvedValue({ saveScreenshot: mockSaveScreenshot }),
}));
vi.mock('../../src/steps.js', () => ({
  appendStep: vi.fn().mockResolvedValue(undefined),
}));

import { handler } from '../../src/commands/screenshot.js';
import { writeSession } from '../../src/session.js';
import type { SessionMetadata } from '../../src/session.js';
import { appendStep } from '../../src/steps.js';

const TEST_DIR = path.join(os.tmpdir(), 'wdio-x-test-screenshot');

describe('screenshot command', () => {
  const meta: SessionMetadata = {
    sessionId: 'abc123',
    hostname: 'localhost',
    port: 4444,
    capabilities: { browserName: 'chrome' },
    created: '2026-02-15T10:00:00Z',
    url: 'https://example.com',
  };

  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
    await writeSession('default', meta, TEST_DIR);
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSaveScreenshot.mockClear();
  });

  afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('should save screenshot to specified path', async () => {
    await handler({ path: '/tmp/test.png', session: 'default', _sessionsDir: TEST_DIR } as unknown as Parameters<typeof handler>[0]);
    expect(mockSaveScreenshot).toHaveBeenCalledWith('/tmp/test.png');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('/tmp/test.png'));
    expect(appendStep).toHaveBeenCalledWith(
      'default', 'screenshot', { path: '/tmp/test.png' }, 'ok', expect.any(Number), undefined, expect.any(String),
    );
  });

  it('should default to .wdiox/screenshots/<session>-screenshot-<timestamp>.png', async () => {
    await handler({ session: 'default', _sessionsDir: TEST_DIR } as unknown as Parameters<typeof handler>[0]);
    expect(mockSaveScreenshot).toHaveBeenCalledWith(
      expect.stringMatching(/default-screenshot-\d{14}\.png$/),
    );
    expect(mockSaveScreenshot).toHaveBeenCalledWith(
      expect.stringContaining(path.join(TEST_DIR, 'screenshots')),
    );
  });

  it('should error when no session exists', async () => {
    await handler({ session: 'nonexistent', _sessionsDir: TEST_DIR } as unknown as Parameters<typeof handler>[0]);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('No active session'));
    expect(mockSaveScreenshot).not.toHaveBeenCalled();
  });
});
