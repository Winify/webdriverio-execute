import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const { mockUrl, mockRefresh, mockBack, mockForward } = vi.hoisted(() => ({
  mockUrl: vi.fn(),
  mockRefresh: vi.fn(),
  mockBack: vi.fn(),
  mockForward: vi.fn(),
}));

vi.mock('webdriverio', () => ({
  attach: vi.fn().mockResolvedValue({
    url: mockUrl,
    refresh: mockRefresh,
    back: mockBack,
    forward: mockForward,
  }),
}));
vi.mock('../../src/steps.js', () => ({
  appendStep: vi.fn().mockResolvedValue(undefined),
}));

import { handler } from '../../src/commands/navigate.js';
import { writeSession } from '../../src/session.js';
import type { SessionMetadata } from '../../src/session.js';
import { appendStep } from '../../src/steps.js';

const TEST_DIR = path.join(os.tmpdir(), 'wdio-x-test-navigate');

describe('navigate command', () => {
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
    mockUrl.mockClear();
    mockRefresh.mockClear();
    mockBack.mockClear();
    mockForward.mockClear();
  });

  afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('should navigate to url', async () => {
    await handler({ url: 'https://httpbin.org', session: 'default', _sessionsDir: TEST_DIR } as unknown as Parameters<typeof handler>[0]);
    expect(mockUrl).toHaveBeenCalledWith('https://httpbin.org');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('https://httpbin.org'));
    expect(appendStep).toHaveBeenCalledWith('default', 'navigate', { url: 'https://httpbin.org' }, 'ok', expect.any(Number), undefined, expect.any(String));
  });

  it('should refresh the page', async () => {
    await handler({ url: 'refresh', session: 'default', _sessionsDir: TEST_DIR } as unknown as Parameters<typeof handler>[0]);
    expect(mockRefresh).toHaveBeenCalled();
    expect(mockUrl).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith('Browser: refresh');
    expect(appendStep).toHaveBeenCalledWith('default', 'refresh', {}, 'ok', expect.any(Number), undefined, expect.any(String));
  });

  it('should go back', async () => {
    await handler({ url: 'back', session: 'default', _sessionsDir: TEST_DIR } as unknown as Parameters<typeof handler>[0]);
    expect(mockBack).toHaveBeenCalled();
    expect(mockUrl).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith('Browser: back');
    expect(appendStep).toHaveBeenCalledWith('default', 'back', {}, 'ok', expect.any(Number), undefined, expect.any(String));
  });

  it('should go forward', async () => {
    await handler({ url: 'forward', session: 'default', _sessionsDir: TEST_DIR } as unknown as Parameters<typeof handler>[0]);
    expect(mockForward).toHaveBeenCalled();
    expect(mockUrl).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith('Browser: forward');
    expect(appendStep).toHaveBeenCalledWith('default', 'forward', {}, 'ok', expect.any(Number), undefined, expect.any(String));
  });

  it('should record error step when navigation throws', async () => {
    mockUrl.mockRejectedValueOnce(new Error('Navigation failed'));
    await handler({ url: 'https://httpbin.org', session: 'default', _sessionsDir: TEST_DIR } as unknown as Parameters<typeof handler>[0]);
    expect(appendStep).toHaveBeenCalledWith(
      'default', 'navigate', { url: 'https://httpbin.org' }, 'error', expect.any(Number), 'Navigation failed', expect.any(String),
    );
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Navigation failed'));
  });

  it('should record error step when refresh throws', async () => {
    mockRefresh.mockRejectedValueOnce(new Error('Refresh failed'));
    await handler({ url: 'refresh', session: 'default', _sessionsDir: TEST_DIR } as unknown as Parameters<typeof handler>[0]);
    expect(appendStep).toHaveBeenCalledWith(
      'default', 'refresh', {}, 'error', expect.any(Number), 'Refresh failed', expect.any(String),
    );
  });

  it('should error when no url provided', async () => {
    await handler({ url: undefined, session: 'default', _sessionsDir: TEST_DIR } as unknown as Parameters<typeof handler>[0]);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('URL or action required'));
    expect(mockUrl).not.toHaveBeenCalled();
  });

  it('should error when no session exists', async () => {
    await handler({ url: 'https://httpbin.org', session: 'nonexistent', _sessionsDir: TEST_DIR } as unknown as Parameters<typeof handler>[0]);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('No active session'));
    expect(mockUrl).not.toHaveBeenCalled();
  });
});