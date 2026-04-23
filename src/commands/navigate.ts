import type { ArgumentsCamelCase, Argv } from 'yargs';
import { attach } from 'webdriverio';

import { buildAttachOptions, withSession } from '../session.js';
import { appendStep } from '../steps.js';

export const command = ['navigate [url]', 'goto [url]'];
export const desc = 'Navigate to a URL, or run refresh / back / forward';

const BROWSER_ACTIONS = ['refresh', 'back', 'forward'] as const;
type BrowserAction = typeof BROWSER_ACTIONS[number];

export const builder = (yargs: Argv) => {
  return yargs.positional('url', {
    type: 'string',
    describe: 'URL to navigate to, or: refresh | back | forward',
  });
};

interface NavigateArgs {
  url?: string;
  session: string
  _sessionsDir?: string
}

export const handler = withSession<NavigateArgs>(async (argv: ArgumentsCamelCase<NavigateArgs>, meta, sessionsDir) => {
  const startTime = Date.now();
  const session = argv.session;
  const url = argv.url;

  if (!url) {
    console.error('URL or action required. Usage: wdiox navigate <url|refresh|back|forward>');
    return;
  }

  const browser = await attach(buildAttachOptions(meta));
  const action = BROWSER_ACTIONS.includes(url as BrowserAction) ? url as BrowserAction : null;

  try {
    if (action) {
      await browser[action](); // This calls browser.refresh() or browser.back() or browser.forward() respectively
      await appendStep(session, action, {}, 'ok', Date.now() - startTime, undefined, sessionsDir);
      console.log(`Browser: ${action}`);
    } else {
      await browser.url(url);
      await appendStep(session, 'navigate', { url }, 'ok', Date.now() - startTime, undefined, sessionsDir);
      console.log(`Navigated to [${url}]`);
    }

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await appendStep(session, action ?? 'navigate', action ? {} : { url }, 'error', Date.now() - startTime, msg, sessionsDir);
    console.error(`Error: ${msg}`);
  }
});
