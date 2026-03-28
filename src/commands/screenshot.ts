import type { ArgumentsCamelCase, Argv } from 'yargs';
import { attach } from 'webdriverio';

import { getStepsPath, appendStep } from '../steps.js';
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

export const handler = withSession<ScreenshotArgs>(async (argv: ArgumentsCamelCase<ScreenshotArgs>, meta, sessionsDir) => {
  const browser = await attach(buildAttachOptions(meta));
  const sessionName = argv.session as string;
  const stepsPath = getStepsPath(sessionName, sessionsDir);
  const filePath = (argv.path as string) ||
        `screenshot-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
  const start = Date.now();
  let error: string | undefined;

  try {
    await browser.saveScreenshot(filePath);
    console.log(`Screenshot saved to ${filePath}`);
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    console.error(`Error saving screenshot: ${error}`);
  }

  await appendStep(stepsPath, {
    tool: 'screenshot',
    params: { path: filePath },
    status: error ? 'error' : 'ok',
    durationMs: Date.now() - start,
    error,
  });
});
