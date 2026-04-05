import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const { mockUrlFn, mockGetUrl, mockGetWindowHandles, mockSwitchToWindow, mockQuestion } = vi.hoisted(() => ({
  mockUrlFn: vi.fn(),
  mockGetUrl: vi.fn().mockResolvedValue('https://example.com'),
  mockGetWindowHandles: vi.fn().mockResolvedValue([]),
  mockSwitchToWindow: vi.fn(),
  mockQuestion: vi.fn().mockResolvedValue('n'),
}));
vi.mock('webdriverio', () => ({
  remote: vi.fn().mockResolvedValue({
    sessionId: 'test-session-123',
    capabilities: { browserName: 'chrome' },
    options: { hostname: 'localhost', port: 4444 },
    url: mockUrlFn,
    getUrl: mockGetUrl,
    getWindowHandles: mockGetWindowHandles,
    switchToWindow: mockSwitchToWindow,
  }),
  attach: vi.fn().mockResolvedValue({ deleteSession: vi.fn() }),
}));
vi.mock('../../src/cdp.js', () => ({
  waitForCDP: vi.fn().mockResolvedValue(undefined),
  closeStaleMappers: vi.fn().mockResolvedValue({ activeTabUrl: 'https://example.com', allTabUrls: ['https://example.com'] }),
  restoreAndSwitchToActiveTab: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('node:readline/promises', () => ({
  default: {
    createInterface: vi.fn().mockReturnValue({
      question: mockQuestion,
      close: vi.fn(),
    }),
  },
}));
vi.mock('../../src/steps.js', () => ({
  appendStep: vi.fn().mockResolvedValue(undefined),
  initSteps: vi.fn().mockResolvedValue(undefined),
  finalizeSteps: vi.fn().mockResolvedValue(undefined),
  deleteStepsFile: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../src/config-loader.js', () => ({
  loadWdioConfig: vi.fn(),
  pickCapabilities: vi.fn(),
}));

import { remote } from 'webdriverio';
import { waitForCDP, closeStaleMappers } from '../../src/cdp.js';
import { handler } from '../../src/commands/open.js';
import { readSession } from '../../src/session.js';
import { appendStep, initSteps } from '../../src/steps.js';
import { loadWdioConfig, pickCapabilities } from '../../src/config-loader.js';

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

    expect(initSteps).toHaveBeenCalledWith('default', expect.any(String), 'browser', expect.any(String));
    expect(appendStep).toHaveBeenCalledWith(
      'default', 'open', expect.objectContaining({ browser: 'chrome' }), 'ok', expect.any(Number), undefined, expect.any(String),
    );
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

  it('should not prompt when --attach replaces an existing session', async () => {
    // Create an existing session first
    await handler({
      url: 'https://example.com',
      browser: 'chrome',
      session: 'reattach',
      _sessionsDir: TEST_DIR,
    } as unknown as Parameters<typeof handler>[0]);

    mockQuestion.mockClear();
    vi.mocked(remote).mockClear();

    await handler({
      browser: 'chrome',
      session: 'reattach',
      attach: true,
      debugHost: 'localhost',
      debugPort: 9222,
      _sessionsDir: TEST_DIR,
    } as unknown as Parameters<typeof handler>[0]);

    expect(mockQuestion).not.toHaveBeenCalled();
    expect(remote).toHaveBeenCalledTimes(1);
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

describe('open command --attach', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    mockUrlFn.mockClear();
    vi.mocked(remote).mockClear();
    vi.mocked(waitForCDP).mockClear();
    vi.mocked(closeStaleMappers).mockClear();
  });

  afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
    logSpy.mockRestore();
  });

  it('should write session with isAttached: true for browser attach', async () => {
    await handler({
      browser: 'chrome',
      session: 'attached',
      attach: true,
      debugHost: 'localhost',
      debugPort: 9222,
      _sessionsDir: TEST_DIR,
    } as unknown as Parameters<typeof handler>[0]);

    const meta = await readSession('attached', TEST_DIR);
    expect(meta).not.toBeNull();
    expect(meta!.isAttached).toBe(true);
  });

  it('should call remote with goog:chromeOptions.debuggerAddress for browser attach', async () => {
    await handler({
      browser: 'chrome',
      session: 'attached',
      attach: true,
      debugHost: 'localhost',
      debugPort: 9222,
      _sessionsDir: TEST_DIR,
    } as unknown as Parameters<typeof handler>[0]);

    expect(remote).toHaveBeenCalledWith(
      expect.objectContaining({
        capabilities: expect.objectContaining({
          'goog:chromeOptions': expect.objectContaining({
            debuggerAddress: 'localhost:9222',
          }),
        }),
      }),
    );
  });

  it('should call waitForCDP and closeStaleMappers for browser attach', async () => {
    await handler({
      browser: 'chrome',
      session: 'attached',
      attach: true,
      debugHost: '127.0.0.1',
      debugPort: 9333,
      _sessionsDir: TEST_DIR,
    } as unknown as Parameters<typeof handler>[0]);

    expect(waitForCDP).toHaveBeenCalledWith('127.0.0.1', 9333);
    expect(closeStaleMappers).toHaveBeenCalledWith('127.0.0.1', 9333);
  });

  it('should navigate to URL if provided during browser attach', async () => {
    await handler({
      browser: 'chrome',
      session: 'attached',
      attach: true,
      debugHost: 'localhost',
      debugPort: 9222,
      url: 'https://example.com',
      _sessionsDir: TEST_DIR,
    } as unknown as Parameters<typeof handler>[0]);

    expect(mockUrlFn).toHaveBeenCalledWith('https://example.com');
  });

  it('should log "attached" message', async () => {
    await handler({
      browser: 'chrome',
      session: 'myapp',
      attach: true,
      debugHost: 'localhost',
      debugPort: 9222,
      _sessionsDir: TEST_DIR,
    } as unknown as Parameters<typeof handler>[0]);

    expect(logSpy).toHaveBeenCalledWith('Session "myapp" attached.');
  });

  it('should build mobile attach capabilities with noReset: true when --device is provided', async () => {
    await handler({
      browser: 'chrome',
      session: 'mobile-attach',
      attach: true,
      device: 'emulator-5554',
      platform: 'android',
      grantPermissions: true,
      acceptAlert: true,
      autoDismiss: false,
      _sessionsDir: TEST_DIR,
    } as unknown as Parameters<typeof handler>[0]);

    expect(remote).toHaveBeenCalledWith(
      expect.objectContaining({
        capabilities: expect.objectContaining({
          'appium:noReset': true,
          'appium:deviceName': 'emulator-5554',
          platformName: 'Android',
        }),
      }),
    );
    // Should NOT have appium:app set
    const call = vi.mocked(remote).mock.calls[0][0] as unknown as Record<string, unknown>;
    const caps = call.capabilities as Record<string, unknown>;
    expect(caps['appium:app']).toBeUndefined();
  });

  it('should write isAttached: true for mobile attach', async () => {
    await handler({
      browser: 'chrome',
      session: 'mobile-attach',
      attach: true,
      device: 'emulator-5554',
      platform: 'android',
      grantPermissions: true,
      acceptAlert: true,
      autoDismiss: false,
      _sessionsDir: TEST_DIR,
    } as unknown as Parameters<typeof handler>[0]);

    const meta = await readSession('mobile-attach', TEST_DIR);
    expect(meta!.isAttached).toBe(true);
  });
});

describe('open command --config', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.mocked(remote).mockClear();
    vi.mocked(loadWdioConfig).mockResolvedValue({
      hostname: 'config-host',
      port: 9999,
      capabilities: { browserName: 'firefox' },
    } as unknown as WebdriverIO.Config);
    vi.mocked(pickCapabilities).mockResolvedValue({ browserName: 'firefox' } as WebdriverIO.Capabilities);
  });

  afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
    logSpy.mockRestore();
    vi.mocked(initSteps).mockClear();
    vi.mocked(appendStep).mockClear();
  });

  it('calls remote with capabilities and connection from config', async () => {
    await handler({
      session: 'cfg',
      config: './wdio.conf.browser.js',
      _sessionsDir: TEST_DIR,
    } as unknown as Parameters<typeof handler>[0]);

    expect(remote).toHaveBeenCalledWith(
      expect.objectContaining({
        hostname: 'config-host',
        port: 9999,
        capabilities: expect.objectContaining({ browserName: 'firefox' }),
      }),
    );
  });

  it('CLI --hostname overrides config hostname', async () => {
    await handler({
      session: 'cfg',
      config: './wdio.conf.browser.js',
      hostname: 'override-host',
      _sessionsDir: TEST_DIR,
    } as unknown as Parameters<typeof handler>[0]);

    expect(remote).toHaveBeenCalledWith(
      expect.objectContaining({ hostname: 'override-host' }),
    );
  });

  it('mobile config: --app patches appium:app, other caps preserved', async () => {
    vi.mocked(loadWdioConfig).mockResolvedValue({
      hostname: 'localhost',
      port: 4723,
      capabilities: {
        platformName: 'Android',
        'appium:deviceName': 'Pixel 6',
        'appium:automationName': 'UiAutomator2',
      },
    } as unknown as WebdriverIO.Config);
    vi.mocked(pickCapabilities).mockResolvedValue({
      platformName: 'Android',
      'appium:deviceName': 'Pixel 6',
      'appium:automationName': 'UiAutomator2',
    } as WebdriverIO.Capabilities);

    await handler({
      session: 'cfg-mobile',
      config: './wdio.conf.mobile.js',
      app: '/new/app.apk',
      _sessionsDir: TEST_DIR,
    } as unknown as Parameters<typeof handler>[0]);

    expect(remote).toHaveBeenCalledWith(
      expect.objectContaining({
        capabilities: expect.objectContaining({
          platformName: 'Android',
          'appium:deviceName': 'Pixel 6',
          'appium:automationName': 'UiAutomator2',
          'appium:app': '/new/app.apk',
        }),
      }),
    );
  });

  it('mobile config: --device patches appium:deviceName', async () => {
    vi.mocked(pickCapabilities).mockResolvedValue({
      platformName: 'Android',
      'appium:deviceName': 'Pixel 6',
    } as WebdriverIO.Capabilities);

    await handler({
      session: 'cfg-mobile',
      config: './wdio.conf.mobile.js',
      device: 'emulator-5554',
      _sessionsDir: TEST_DIR,
    } as unknown as Parameters<typeof handler>[0]);

    expect(remote).toHaveBeenCalledWith(
      expect.objectContaining({
        capabilities: expect.objectContaining({
          'appium:deviceName': 'emulator-5554',
        }),
      }),
    );
  });

  it('session type is inferred as browser from config caps', async () => {
    await handler({
      session: 'cfg',
      config: './wdio.conf.browser.js',
      _sessionsDir: TEST_DIR,
    } as unknown as Parameters<typeof handler>[0]);

    expect(initSteps).toHaveBeenCalledWith('cfg', expect.any(String), 'browser', expect.any(String));
  });

  it('session type is inferred as android from config caps', async () => {
    vi.mocked(pickCapabilities).mockResolvedValue({
      platformName: 'Android',
    } as WebdriverIO.Capabilities);

    await handler({
      session: 'cfg-android',
      config: './wdio.conf.mobile.js',
      _sessionsDir: TEST_DIR,
    } as unknown as Parameters<typeof handler>[0]);

    expect(initSteps).toHaveBeenCalledWith('cfg-android', expect.any(String), 'android', expect.any(String));
  });

  it('logs "started" message after config session', async () => {
    await handler({
      session: 'cfg',
      config: './wdio.conf.browser.js',
      _sessionsDir: TEST_DIR,
    } as unknown as Parameters<typeof handler>[0]);

    expect(logSpy).toHaveBeenCalledWith('Session "cfg" started.');
  });
});
