import type { ArgumentsCamelCase, Argv } from 'yargs';

import { readSteps, getStepsPath } from '../steps.js';
import { withSession } from '../session.js';

export const command = ['steps', 'record'];
export const desc = 'Show recorded steps for a session';

export const builder = (yargs: Argv) => {
  return yargs.option('json', {
    type: 'boolean',
    default: false,
    describe: 'Output raw JSON',
  });
};

interface StepsArgs {
  session: string
  json: boolean
  _sessionsDir?: string
}

export const handler = withSession<StepsArgs>(async (argv: ArgumentsCamelCase<StepsArgs>, _meta, sessionsDir) => {
  const sessionName = argv.session as string;
  const stepsPath = getStepsPath(sessionName, sessionsDir);
  const steps = await readSteps(stepsPath);

  if (steps.length === 0) {
    console.log(`No steps recorded for session "${sessionName}".`);
    return;
  }

  if (argv.json) {
    console.log(JSON.stringify(steps, null, 2));
    return;
  }

  console.log(`\n Steps for session "${sessionName}" (${steps.length} total)\n`);
  for (const step of steps) {
    const status = step.status === 'ok' ? 'OK ' : 'ERR';
    const duration = `${step.durationMs}ms`.padEnd(8);
    const params = JSON.stringify(step.params).slice(0, 60);
    const error = step.error ? ` [${step.error.slice(0, 40)}]` : '';
    console.log(`  ${String(step.index).padStart(3)}. [${status}] ${duration} ${step.tool} ${params}${error}`);
  }
  console.log();
});
