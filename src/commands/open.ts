import readline from 'node:readline/promises';
import type { ArgumentsCamelCase, Argv } from 'yargs';
import type { Capabilities, Options } from '@wdio/types';
import { attach, remote } from 'webdriverio';

import { buildAttachOptions, deleteSessionFiles, getSessionDir, readSession, type SessionMetadata, writeSession } from '../session.js';
import { closeStaleMappers, restoreAndSwitchToActiveTab, waitForCDP } from '../cdp.js';
import { appendStep, deleteStepsFile, initSteps } from '../steps.js';
import { loadWdioConfig, pickCapabilities } from '../config-loader.js';

export const command = ['open [url]', 'new [url]', 'start [url]'];
export const desc = 'Open a browser or Appium session';

export const builder = (yargs: Argv) => {
  return yargs
    .positional('url', {
      type: 'string',
      describe: 'URL to navigate to',
    })
    .option('browser', {
      alias: 'b',
      type: 'string',
      default: 'chrome',
      describe: 'Browser to use (chrome, firefox, edge, safari)',
    })
    .option('app', {
      type: 'string',
      describe: 'Path to mobile app (.apk, .ipa, .app)',
    })
    .option('device', {
      alias: 'd',
      type: 'string',
      describe: 'Device name for mobile testing',
    })
    .option('platform', {
      type: 'string',
      describe: 'Mobile platform (android, ios)',
    })
    .option('path', {
      type: 'string',
      describe: 'WebDriver/Appium server session path (default: /)',
    })
    .option('port', {
      alias: 'p',
      type: 'number',
      describe: 'WebDriver/Appium server port (default: 4723)',
    })
    .option('hostname', {
      type: 'string',
      describe: 'WebDriver/Appium server hostname (default: localhost)',
    })
    .option('grant-permissions', {
      type: 'boolean',
      default: true,
      describe: 'Auto-grant app permissions (Appium only)',
    })
    .option('accept-alert', {
      type: 'boolean',
      default: true,
      describe: 'Auto-accept native alerts (Appium only)',
    })
    .option('auto-dismiss', {
      type: 'boolean',
      default: false,
      describe: 'Auto-dismiss native alerts (Appium only)',
    })
    .option('attach', {
      type: 'boolean',
      default: false,
      describe: 'Attach to an already-running browser or app instead of launching a new one',
    })
    .option('debug-port', {
      type: 'number',
      default: 9222,
      describe: 'Chrome remote debugging port (used with --attach)',
    })
    .option('debug-host', {
      type: 'string',
      default: 'localhost',
      describe: 'Chrome remote debugging host (used with --attach)',
    })
    .option('headless', {
      type: 'boolean',
      default: false,
      describe: 'Run browser in headless mode (Chrome only)',
    })
    .option('web-security', {
      type: 'boolean',
      default: true,
      describe: 'Enable web security — pass --no-web-security to disable (Chrome only)',
    })
    .option('config', {
      type: 'string',
      describe: 'Path to wdio.conf.js or wdio.conf.ts',
    });
};

interface OpenArgs {
  url?: string
  browser: string
  session: string
  app?: string
  device?: string
  platform?: string
  port?: number
  hostname?: string
  path?: string
  grantPermissions: boolean
  acceptAlert: boolean
  autoDismiss: boolean
  headless: boolean;
  webSecurity: boolean;
  attach: boolean
  debugPort: number
  debugHost: string
  config?: string
  _sessionsDir?: string
}

function resolveSessionType(argv: ArgumentsCamelCase<OpenArgs>): 'browser' | 'ios' | 'android' {
  const isMobile = !!argv.app || !!argv.device;
  if (!isMobile) return 'browser';
  const platform = argv.platform ?? (argv.app?.endsWith('.apk') ? 'android' : 'ios');
  return platform === 'ios' ? 'ios' : 'android';
}

async function cleanupExistingSession(
  existing: SessionMetadata,
  sessionName: string,
  sessionsDir: string,
  isAttach: boolean,
): Promise<boolean> {
  if (!isAttach) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const context = existing.url || (existing.capabilities['appium:app'] as string) || '';
    const answer = await rl.question(`Session [${sessionName}] is already active${context ? ` (${context})` : ''}.\nClose it and start a new one? (y/N) `);
    rl.close();

    if (answer.trim().toLowerCase() !== 'y') return false;

    try {
      const old = await attach(buildAttachOptions(existing));
      await old.deleteSession();
    } catch {
      // Already dead
    }
  }
  await deleteSessionFiles(sessionName, sessionsDir);
  await deleteStepsFile(sessionName, sessionsDir);
  return true;
}

async function attachBrowser(argv: ArgumentsCamelCase<OpenArgs>): Promise<WebdriverIO.Browser> {
  const host = argv.debugHost ?? 'localhost';
  const port = argv.debugPort ?? 9222;

  await waitForCDP(host, port);
  const { activeTabUrl, allTabUrls } = await closeStaleMappers(host, port);

  const browser = await remote({
    connectionRetryTimeout: 30000,
    connectionRetryCount: 3,
    logLevel: (process.env.WDIO_LOG_LEVEL ?? 'error') as Options.WebDriverLogTypes,
    capabilities: {
      browserName: 'chrome',
      unhandledPromptBehavior: 'dismiss',
      webSocketUrl: false,
      'goog:chromeOptions': {
        debuggerAddress: `${host}:${port}`,
      },
    },
  });

  if (argv.url) {
    await browser.url(argv.url);
  } else if (activeTabUrl) {
    await restoreAndSwitchToActiveTab(browser, activeTabUrl, allTabUrls);
  }

  return browser;
}

async function attachMobile(argv: ArgumentsCamelCase<OpenArgs>): Promise<WebdriverIO.Browser> {
  const platform = argv.platform ?? 'android';
  const capabilities: Record<string, unknown> = {
    platformName: platform === 'ios' ? 'iOS' : 'Android',
    'appium:deviceName': argv.device ?? 'emulator-5554',
    'appium:automationName': platform === 'ios' ? 'XCUITest' : 'UiAutomator2',
    'appium:noReset': true,
    'appium:newCommandTimeout': 300,
    'appium:autoGrantPermissions': argv.grantPermissions,
    'appium:autoAcceptAlerts': argv.acceptAlert,
    'appium:autoDismissAlerts': argv.autoDismiss,
  };

  return remote({
    hostname: argv.hostname ?? 'localhost',
    port: argv.port ?? 4723,
    path: argv.path ?? '/',
    logLevel: (process.env.WDIO_LOG_LEVEL ?? 'error') as WebdriverIO.Config['logLevel'],
    capabilities,
  } as unknown as Capabilities.WebdriverIOConfig);
}

async function createNewSessionFromConfig(argv: ArgumentsCamelCase<OpenArgs>): Promise<{
  browser: WebdriverIO.Browser
  requestedCapabilities: Record<string, unknown>
  sessionType: 'browser' | 'ios' | 'android'
}> {
  const wdioConfig = await loadWdioConfig(argv.config!);
  const baseCaps = await pickCapabilities(wdioConfig) as Record<string, unknown>;

  const isMobile = 'platformName' in baseCaps;
  const sessionType: 'browser' | 'ios' | 'android' = isMobile
    ? (baseCaps.platformName as string) === 'iOS' ? 'ios' : 'android'
    : 'browser';

  const browserExplicit = !isMobile && (process.argv.includes('--browser') || process.argv.includes('-b'));
  const capabilities: Record<string, unknown> = {
    ...baseCaps,
    ...(isMobile && argv.app ? { 'appium:app': argv.app } : {}),
    ...(isMobile && argv.device ? { 'appium:deviceName': argv.device } : {}),
    ...(browserExplicit ? { browserName: argv.browser } : {}),
  };

  const remoteOpts: Capabilities.WebdriverIOConfig = {
    hostname: argv.hostname ?? wdioConfig.hostname,
    port: argv.port ?? wdioConfig.port,
    path: argv.path ?? wdioConfig.path,
    capabilities: capabilities as Capabilities.RequestedStandaloneCapabilities,
    logLevel: (process.env.WDIO_LOG_LEVEL ?? 'error') as Options.WebDriverLogTypes,
  };

  const browser = await remote(remoteOpts);
  if (argv.url) await browser.url(argv.url);

  return { browser, requestedCapabilities: capabilities, sessionType };
}

async function createNewSession(argv: ArgumentsCamelCase<OpenArgs>): Promise<{
  browser: WebdriverIO.Browser
  requestedCapabilities: Record<string, unknown>
  sessionType: 'browser' | 'ios' | 'android'
}> {
  if (argv.config) {
    return createNewSessionFromConfig(argv);
  }

  const capabilities: Capabilities.RequestedStandaloneCapabilities = {};
  const isMobile = !!argv.app || !!argv.device;

  if (isMobile) {
    const platform = argv.platform ?? (argv.app?.endsWith('.apk') ? 'android' : 'ios');
    capabilities.platformName = platform === 'ios' ? 'iOS' : 'Android';
    capabilities['appium:app'] = argv.app;
    capabilities['appium:deviceName'] = argv.device ?? 'emulator-5554';
    capabilities['appium:newCommandTimeout'] = 300;
    capabilities['appium:automationName'] = platform === 'ios' ? 'XCUITest' : 'UiAutomator2';
    capabilities['appium:autoGrantPermissions'] = argv.grantPermissions;
    capabilities['appium:autoAcceptAlerts'] = argv.acceptAlert;
    capabilities['appium:autoDismissAlerts'] = argv.autoDismiss;
  } else {
    capabilities.browserName = argv.browser;
    // @ts-expect-error No `spawnOpts` defined in WebdriverIO.ChromedriverOptions
    capabilities['wdio:chromedriverOptions'] = { spawnOpts: { detached: true } };
    const chromeArgs = [
      '--window-size=1920,920',
      '--no-sandbox',
      '--disable-search-engine-choice-screen',
      '--disable-infobars',
    ];
    if (!argv.webSecurity) chromeArgs.push('--disable-web-security', '--allow-running-insecure-content');
    if (argv.headless) chromeArgs.push('--headless=new', '--disable-gpu', '--disable-dev-shm-usage');

    capabilities['goog:chromeOptions'] = { args: chromeArgs };
  }

  const remoteOpts: Capabilities.WebdriverIOConfig = {
    capabilities,
    logLevel: (process.env.WDIO_LOG_LEVEL ?? 'error') as Options.WebDriverLogTypes,
  };
  if (argv.hostname || argv.port || isMobile) {
    remoteOpts.hostname = argv.hostname ?? 'localhost';
    remoteOpts.port = argv.port ?? (isMobile ? 4723 : 4444);
    remoteOpts.path = argv.path ?? '/';
  }

  const browser = await remote(remoteOpts);
  if (argv.url) {
    await browser.url(argv.url);
  }

  return { browser, requestedCapabilities: capabilities as Record<string, unknown>, sessionType: resolveSessionType(argv) };
}

async function finalizeOpen(opts: {
  sessionName: string
  sessionsDir: string
  browser: WebdriverIO.Browser
  sessionType: 'browser' | 'ios' | 'android'
  capabilities: Record<string, unknown>
  url: string
  isAttached: boolean
  openParams: Record<string, unknown>
  startTime: number
}): Promise<void> {
  const { sessionName, sessionsDir, browser, sessionType, capabilities, url, isAttached, openParams, startTime } = opts;
  const bOpts = browser.options as Capabilities.WebdriverIOConfig;
  await writeSession(sessionName, {
    sessionId: browser.sessionId,
    hostname: bOpts?.hostname || 'localhost',
    port: bOpts?.port || 4444,
    capabilities: { ...capabilities, ...browser.capabilities as Record<string, unknown> },
    created: new Date().toISOString(),
    url,
    ...(isAttached ? { isAttached: true } : {}),
  }, sessionsDir);

  await initSteps(sessionName, browser.sessionId, sessionType, sessionsDir);
  await appendStep(sessionName, 'open', openParams, 'ok', Date.now() - startTime, undefined, sessionsDir);
  console.log(`Session "${sessionName}" ${isAttached ? 'attached' : 'started'}.`);
}

export async function handler(argv: ArgumentsCamelCase<OpenArgs>) {
  const startTime = Date.now();
  const sessionName = argv.session;
  const sessionsDir = (argv._sessionsDir as string) || getSessionDir();

  const existing = await readSession(sessionName, sessionsDir);
  if (existing) {
    const proceed = await cleanupExistingSession(existing, sessionName, sessionsDir, argv.attach);
    if (!proceed) return;
  }

  let browser: WebdriverIO.Browser;
  let sessionType: 'browser' | 'ios' | 'android';
  let capabilities: Record<string, unknown>;
  let url: string;
  let openParams: Record<string, unknown>;
  let isAttached: boolean;

  if (argv.attach) {
    const isMobileAttach = !!argv.device;
    browser = isMobileAttach ? await attachMobile(argv) : await attachBrowser(argv);
    capabilities = browser.capabilities as Record<string, unknown>;
    url = argv.url || (isMobileAttach ? '' : await browser.getUrl().catch(() => ''));
    openParams = { url: argv.url, attach: true };
    isAttached = true;
    sessionType = resolveSessionType(argv);
  } else {
    const result = await createNewSession(argv);
    browser = result.browser;
    sessionType = result.sessionType;
    capabilities = { ...result.requestedCapabilities, ...browser.capabilities as Record<string, unknown> };
    url = argv.url || '';
    const isMobile = !argv.config && (!!argv.app || !!argv.device);
    openParams = argv.config
      ? { config: argv.config, url: argv.url }
      : isMobile
        ? { app: argv.app || '', platform: argv.platform ?? (argv.app?.endsWith('.apk') ? 'android' : 'ios') }
        : { url: argv.url || '', browser: argv.browser };
    isAttached = false;
  }

  await finalizeOpen({ sessionName, sessionsDir, browser, sessionType, capabilities, url, isAttached, openParams, startTime });
}
