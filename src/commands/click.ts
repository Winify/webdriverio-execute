import type { ArgumentsCamelCase, Argv } from 'yargs';
import { attach } from 'webdriverio';

import { getStepsPath, appendStep } from '../steps.js';
import { buildAttachOptions, getRefsPath, withSession } from '../session.js';
import { lookupRef } from '../refs.js';

export const command = 'click <ref>';
export const desc = 'Click an element by snapshot reference (e.g., e1)';

export const builder = (yargs: Argv) => {
  return yargs.positional('ref', {
    type: 'string',
    describe: 'Element reference from snapshot (e.g., e1, a3)',
  });
};

interface ClickArgs {
  ref: string
  session: string
  _sessionsDir?: string
}

export const handler = withSession<ClickArgs>(async (argv: ArgumentsCamelCase<ClickArgs>, meta, sessionsDir) => {
  const sessionName = argv.session as string;
  const refKey = argv.ref as string;
  const result = await lookupRef(getRefsPath(sessionName, sessionsDir), refKey);
  if (!result) {
    return;
  }

  const browser = await attach(buildAttachOptions(meta));
  const stepsPath = getStepsPath(sessionName, sessionsDir);
  const start = Date.now();
  let error: string | undefined;

  try {
    await browser.$(result.selector).click();
    console.log(`Clicked ${refKey} (${result.ref.selector})`);
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    console.error(`Error clicking ${refKey}: ${error}`);
  }

  await appendStep(stepsPath, {
    tool: 'click',
    params: { ref: refKey, selector: result.ref.selector },
    status: error ? 'error' : 'ok',
    durationMs: Date.now() - start,
    error,
  });
});
