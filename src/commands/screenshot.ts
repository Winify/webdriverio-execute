import fs from 'node:fs/promises';
import path from 'node:path';
import type { ArgumentsCamelCase, Argv } from 'yargs';
import { attach } from 'webdriverio';

import { buildAttachOptions, withSession } from '../session.js';
import { appendStep } from '../steps.js';

export const command = 'screenshot [path]';
export const desc = 'Save a screenshot of the current page or screen';

export const builder = (yargs: Argv) => {
  return yargs.positional('path', {
    type: 'string',
    describe: 'File path to save screenshot (default: .wdiox/screenshots/<session>-screenshot-<timestamp>.png)',
  });
};

interface ScreenshotArgs {
  path?: string
  session: string
  _sessionsDir?: string
}

export const handler = withSession<ScreenshotArgs>(async (argv: ArgumentsCamelCase<ScreenshotArgs>, meta, sessionsDir) => {
  const startTime = Date.now();
  const browser = await attach(buildAttachOptions(meta));

  const sessionName = argv.session as string;
  const screenshotsDir = path.join(sessionsDir, 'screenshots');
  const filePath = (argv.path as string) ||
        path.join(screenshotsDir, `${sessionName}-screenshot-${new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14)}.png`);

  if (!argv.path) {
    await fs.mkdir(screenshotsDir, { recursive: true });
  }

  try {
    await browser.saveScreenshot(filePath);
    await appendStep(sessionName, 'screenshot', { path: filePath }, 'ok', Date.now() - startTime, undefined, sessionsDir);
    console.log(`Screenshot saved to ${filePath}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await appendStep(sessionName, 'screenshot', { path: filePath }, 'error', Date.now() - startTime, msg, sessionsDir);
    console.error(`Error saving screenshot: ${msg}`);
  }
});
