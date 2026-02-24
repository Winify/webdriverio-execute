import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const { mockUrlFn, mockQuestion } = vi.hoisted(() => ({
  mockUrlFn: vi.fn(),
  mockQuestion: vi.fn().mockResolvedValue('n'),
}));
vi.mock('webdriverio', () => ({
  remote: vi.fn().mockResolvedValue({
    sessionId: 'test-session-123',
    capabilities: { browserName: 'chrome' },
    options: { hostname: 'localhost', port: 4444 },
    url: mockUrlFn,
  }),
  attach: vi.fn().mockResolvedValue({ deleteSession: vi.fn() }),
}));
vi.mock('node:readline/promises', () => ({
  default: {
    createInterface: vi.fn().mockReturnValue({
      question: mockQuestion,
      close: vi.fn(),
    }),
  },
}));

import { remote } from 'webdriverio';
import { handler } from '../../src/commands/open.js';
import { readSession } from '../../src/session.js';

const TEST_DIR = path.join(os.tmpdir(), 'wdio-x-test-open');

describe('open command', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockUrlFn.mockClear();
  });

  afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
    logSpy.mockRestore();
    vi.mocked(remote).mockClear();
  });

  it('should create a session and write metadata', async () => {
    await handler({
      url: 'https://example.com',
      browser: 'chrome',
      session: 'default',
      _sessionsDir: TEST_DIR,
    } as unknown as Parameters<typeof handler>[0]);

    const meta = await readSession('default', TEST_DIR);
    expect(meta).not.toBeNull();
    expect(meta!.sessionId).toBe('test-session-123');
    expect(meta!.url).toBe('https://example.com');
  });

  it('should call remote with browserName capability', async () => {
    await handler({
      url: 'https://example.com',
      browser: 'firefox',
      session: 'default',
      _sessionsDir: TEST_DIR,
    } as unknown as Parameters<typeof handler>[0]);

    expect(remote).toHaveBeenCalledWith(
      expect.objectContaining({
        capabilities: expect.objectContaining({ browserName: 'firefox' }),
      }),
    );
  });

  it('should navigate to URL when provided', async () => {
    await handler({
      url: 'https://example.com',
      browser: 'chrome',
      session: 'default',
      _sessionsDir: TEST_DIR,
    } as unknown as Parameters<typeof handler>[0]);

    expect(mockUrlFn).toHaveBeenCalledWith('https://example.com');
  });

  it('should not navigate when no URL provided', async () => {
    await handler({
      browser: 'chrome',
      session: 'no-url',
      _sessionsDir: TEST_DIR,
    } as unknown as Parameters<typeof handler>[0]);

    expect(mockUrlFn).not.toHaveBeenCalled();
  });

  it('should prompt and abort if user declines when session exists', async () => {
    await handler({
      url: 'https://example.com',
      browser: 'chrome',
      session: 'existing',
      _sessionsDir: TEST_DIR,
    } as unknown as Parameters<typeof handler>[0]);

    vi.mocked(remote).mockClear();
    mockQuestion.mockResolvedValueOnce('n');

    await handler({
      url: 'https://other.com',
      browser: 'chrome',
      session: 'existing',
      _sessionsDir: TEST_DIR,
    } as unknown as Parameters<typeof handler>[0]);

    expect(mockQuestion).toHaveBeenCalledWith(expect.stringContaining('already active'));
    expect(remote).not.toHaveBeenCalled();
  });

  it('should close existing session and open new one when user confirms', async () => {
    await handler({
      url: 'https://example.com',
      browser: 'chrome',
      session: 'existing',
      _sessionsDir: TEST_DIR,
    } as unknown as Parameters<typeof handler>[0]);

    vi.mocked(remote).mockClear();
    mockQuestion.mockResolvedValueOnce('y');

    await handler({
      url: 'https://other.com',
      browser: 'chrome',
      session: 'existing',
      _sessionsDir: TEST_DIR,
    } as unknown as Parameters<typeof handler>[0]);

    expect(remote).toHaveBeenCalledTimes(1);
  });

  it('should build mobile capabilities when app is provided', async () => {
    await handler({
      browser: 'chrome',
      session: 'mobile',
      app: '/path/to/app.apk',
      device: 'Pixel 6',
      _sessionsDir: TEST_DIR,
    } as unknown as Parameters<typeof handler>[0]);

    expect(remote).toHaveBeenCalledWith(
      expect.objectContaining({
        capabilities: expect.objectContaining({
          'appium:app': '/path/to/app.apk',
          'appium:deviceName': 'Pixel 6',
          'appium:newCommandTimeout': 300,
        }),
      }),
    );
  });
});
