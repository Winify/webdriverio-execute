import readline from 'node:readline/promises';
import type { ArgumentsCamelCase, Argv } from 'yargs';
import type { Capabilities } from '@wdio/types';
import { attach, remote } from 'webdriverio';

import { writeSession, readSession, getSessionDir, buildAttachOptions, deleteSessionFiles } from '../session.js';

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
  grantPermissions: boolean
  acceptAlert: boolean
  autoDismiss: boolean
  _sessionsDir?: string
}

export async function handler (argv: ArgumentsCamelCase<OpenArgs>) {
  const sessionName = argv.session as string;
  const sessionsDir = (argv._sessionsDir as string) || getSessionDir();

  const existing = await readSession(sessionName, sessionsDir);
  if (existing) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const context = existing.url || (existing.capabilities['appium:app'] as string) || '';
    const answer = await rl.question(`Session [${sessionName}] is already active${context ? ` (${context})` : ''}.\nClose it and start a new one? (y/N) `);
    rl.close();

    if (answer.trim().toLowerCase() !== 'y') {
      return;
    }

    try {
      const old = await attach(buildAttachOptions(existing));
      await old.deleteSession();
    } catch {
      // Already dead
    }
    await deleteSessionFiles(sessionName, sessionsDir);
  }

  const capabilities: Record<string, unknown> = {};

  const isMobile = !!argv.app;
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
  }

  const remoteOpts: Record<string, unknown> = { capabilities, logLevel: process.env.WDIO_LOG_LEVEL ?? 'error' };
  // For mobile / Appium, explicit connection is required
  if (argv.hostname || argv.port || isMobile) {
    remoteOpts.hostname = argv.hostname ?? 'localhost';
    remoteOpts.port = argv.port ?? (isMobile ? 4723 : 4444);
    remoteOpts.path =  argv.path ?? '/';
  }

  const browser = await remote(remoteOpts as unknown as Capabilities.WebdriverIOConfig);

  if (argv.url) {
    await browser.url(argv.url);
  }

  const opts = browser.options as Capabilities.WebdriverIOConfig;
  await writeSession(sessionName, {
    sessionId: browser.sessionId,
    hostname: opts?.hostname || 'localhost',
    port: opts?.port || 4444,
    capabilities: { ...capabilities, ...browser.capabilities as Record<string, unknown> },
    created: new Date().toISOString(),
    url: argv.url || '',
  }, sessionsDir);

  console.log(`Session "${sessionName}" started.`);
}
