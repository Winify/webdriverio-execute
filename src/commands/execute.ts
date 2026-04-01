import type { ArgumentsCamelCase, Argv } from 'yargs';
import { attach } from 'webdriverio';

import { buildAttachOptions, withSession } from '../session.js';
import { appendStep } from '../steps.js';

export const command = 'execute <script>';
export const desc = 'Execute JavaScript in the browser or a mobile command via Appium';

export const builder = (yargs: Argv) => {
  return yargs
    .positional('script', {
      type: 'string',
      describe: 'JavaScript code (browser) or mobile command string like "mobile: pressKey" (Appium)',
    })
    .option('args', {
      type: 'string',
      describe: 'JSON-encoded arguments for the script (array or single value)',
    });
};

function parseArgs(raw: string | undefined): unknown[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [raw];
  }
}

interface ExecuteArgs {
  script: string
  args?: string
  session: string
  _sessionsDir?: string
}

export const handler = withSession<ExecuteArgs>(async (argv: ArgumentsCamelCase<ExecuteArgs>, meta, sessionsDir) => {
  const startTime = Date.now();
  const sessionName = argv.session as string;
  const script = argv.script as string;
  const rawArgs = argv.args as string | undefined;
  const scriptArgs = parseArgs(rawArgs);

  const browser = await attach(buildAttachOptions(meta));
  const isMobile = script.startsWith('mobile:');

  // Resolve string args to elements for browser scripts
  const resolvedArgs = isMobile
    ? scriptArgs
    : await Promise.all(
      scriptArgs.map(async (arg) => {
        if (typeof arg === 'string') {
          try {
            const el = await browser.$(arg);
            if (await el.isExisting()) return el;
          } catch {
            // Not a valid selector, pass as-is
          }
        }
        return arg;
      }),
    );

  try {
    const result = await browser.execute(script, ...resolvedArgs);

    let output: string;
    if (result === undefined || result === null) {
      output = 'Executed successfully (no return value)';
    } else if (typeof result === 'object') {
      try {
        output = `Result: ${JSON.stringify(result, null, 2)}`;
      } catch {
        output = `Result: ${String(result)}`;
      }
    } else {
      output = `Result: ${result}`;
    }

    await appendStep(sessionName, 'execute', { script, args: scriptArgs }, 'ok', Date.now() - startTime, undefined, sessionsDir);
    console.log(output);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await appendStep(sessionName, 'execute', { script, args: scriptArgs }, 'error', Date.now() - startTime, msg, sessionsDir);
    console.error(`Error executing script: ${msg}`);
  }
});
