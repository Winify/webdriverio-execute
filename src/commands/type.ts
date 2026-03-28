import type { ArgumentsCamelCase, Argv } from 'yargs';
import { attach } from 'webdriverio';

import { getStepsPath, appendStep } from '../steps.js';
import { getRefsPath, buildAttachOptions, withSession } from '../session.js';
import { lookupRef } from '../refs.js';

export const command = ['type <ref> <text>', 'fill <ref> <text>'];
export const desc = 'Clear and type text into an input element by snapshot reference';

export const builder = (yargs: Argv) => {
  return yargs
    .positional('ref', {
      type: 'string',
      describe: 'Element reference from snapshot (e.g., e1)',
    })
    .positional('text', {
      type: 'string',
      describe: 'Text to type',
    });
};

interface FillArgs {
  ref: string
  text: string
  session: string
  _sessionsDir?: string
}

export const handler = withSession<FillArgs>(async (argv: ArgumentsCamelCase<FillArgs>, meta, sessionsDir) => {
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
    const element = await browser.$(result.selector);
    await element.clearValue();
    await element.addValue(argv.text as string);
    console.log(`Filled ${refKey} with "${argv.text}"`);
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${refKey} not found on page — the page may have changed. Run wdiox snapshot to refresh.\n${error}`);
  }

  await appendStep(stepsPath, {
    tool: 'type',
    params: { ref: refKey, selector: result.selector, text: argv.text },
    status: error ? 'error' : 'ok',
    durationMs: Date.now() - start,
    error,
  });
});
