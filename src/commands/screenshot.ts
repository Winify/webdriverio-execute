import type { ArgumentsCamelCase, Argv } from 'yargs';
import { attach } from 'webdriverio';

import { buildAttachOptions, withSession } from '../session.js';

export const command = 'screenshot [path]';
export const desc = 'Save a screenshot of the current page or screen';

export const builder = (yargs: Argv) => {
  return yargs.positional('path', {
    type: 'string',
    describe: 'File path to save screenshot (default: ./screenshot-<timestamp>.png)',
  });
};

interface ScreenshotArgs {
  path?: string
  session: string
  _sessionsDir?: string
}

export const handler = withSession<ScreenshotArgs>(async (argv: ArgumentsCamelCase<ScreenshotArgs>, meta) => {
  const browser = await attach(buildAttachOptions(meta));

  const filePath = (argv.path as string) ||
        `screenshot-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;

  await browser.saveScreenshot(filePath);
  console.log(`Screenshot saved to ${filePath}`);
});
