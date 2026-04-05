import yargs from 'yargs';
import type { CommandModule } from 'yargs';
import { hideBin } from 'yargs/helpers';

import * as openCmd from './commands/open.js';
import * as closeCmd from './commands/close.js';
import * as snapshotCmd from './commands/snapshot.js';
import * as clickCmd from './commands/click.js';
import * as fillCmd from './commands/type';
import * as screenshotCmd from './commands/screenshot.js';
import * as sessionListCmd from './commands/session-list.js';
import * as navigateCmd from './commands/navigate.js';
import * as scrollCmd from './commands/scroll.js';
import * as executeCmd from './commands/execute.js';
import * as stepsCmd from './commands/steps.js';
import * as skillsCmd from './commands/skills.js';

const commands = [
  openCmd, closeCmd, snapshotCmd, clickCmd,
  fillCmd, screenshotCmd, sessionListCmd, navigateCmd, scrollCmd, executeCmd, stepsCmd, skillsCmd,
] as unknown as CommandModule[];

export async function run() {

  // webdriverio's attach() can spawn async BiDi connections that fail after
  // the function returns (e.g. stale session). Suppress these so the CLI
  // doesn't crash during close/reconnect of dead sessions.
  process.on('unhandledRejection', () => {});

  let cli = yargs(hideBin(process.argv))
    .scriptName('wdiox')
    .usage('$0 <command> [options]')
    .option('session', {
      alias: 's',
      type: 'string',
      default: process.env.WDIO_SESSION || 'default',
      describe: 'Session name',
    });

  for (const cmd of commands) {
    cli = cli.command(cmd);
  }

  await cli
    .demandCommand(1, 'You need to specify a command. Try: wdiox open <url>')
    .strict()
    .help()
    .version()
    .parse();

  // webdriverio keeps HTTP agents alive — force clean exit after command completes
  process.exit(0);
}
