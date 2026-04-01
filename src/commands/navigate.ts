import type { ArgumentsCamelCase, Argv } from 'yargs';
import { attach } from 'webdriverio';

import { buildAttachOptions, withSession } from '../session.js';
import { appendStep } from '../steps.js';

export const command = ['navigate <url>', 'goto <url>'];
export const desc = 'Navigate to a URL in the active session';

export const builder = (yargs: Argv) => {
  return yargs.positional('url', {
    type: 'string',
    describe: 'URL to navigate to',
  });
};

interface NavigateArgs {
  url: string
  session: string
  _sessionsDir?: string
}

export const handler = withSession<NavigateArgs>(async (argv: ArgumentsCamelCase<NavigateArgs>, meta, sessionsDir) => {
  const startTime = Date.now();
  const sessionName = argv.session as string;
  const url = argv.url as string;

  const browser = await attach(buildAttachOptions(meta));

  try {
    await browser.url(url);
    await appendStep(sessionName, 'navigate', { url }, 'ok', Date.now() - startTime, undefined, sessionsDir);
    console.log(`Navigated to ${url}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await appendStep(sessionName, 'navigate', { url }, 'error', Date.now() - startTime, msg, sessionsDir);
    console.error(`Error navigating to ${url}: ${msg}`);
  }
});
