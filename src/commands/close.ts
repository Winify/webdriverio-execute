import os from 'node:os';
import { execSync } from 'node:child_process';

import type { ArgumentsCamelCase } from 'yargs';
import { attach } from 'webdriverio';

import { deleteSessionFiles, buildAttachOptions, withSession } from '../session.js';

export const command = ['close', 'stop'];
export const desc = 'Close the current session';

interface CloseArgs {
  session: string
  _sessionsDir?: string
}

function killProcess(pid: number): void {
  const platform = os.platform();
  try {
    if (platform === 'win32') {
      execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
    } else {
      execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
    }
  } catch {
    // Process may already be dead
  }
}

export const handler = withSession<CloseArgs>(async (argv: ArgumentsCamelCase<CloseArgs>, meta, sessionsDir) => {
  const sessionName = argv.session as string;

  if (meta.isAttached) {
    await deleteSessionFiles(sessionName, sessionsDir);
    console.log(`Session "${sessionName}" detached.`);
    return;
  }

  const caps = meta.capabilities as Record<string, unknown>;
  const browserPid = typeof caps['goog:processID'] === 'number' ? caps['goog:processID'] : undefined;
  const driverPid = typeof caps['wdio:driverPID'] === 'number' ? caps['wdio:driverPID'] : undefined;

  try {
    const browser = await attach(buildAttachOptions(meta));
    await browser.deleteSession();
  } catch {
    if (browserPid) {
      killProcess(browserPid);
    }
    if (driverPid && driverPid !== browserPid) {
      killProcess(driverPid);
    }
  }

  await deleteSessionFiles(sessionName, sessionsDir);
  console.log(`Session "${sessionName}" closed.`);
});
