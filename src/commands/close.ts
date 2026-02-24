import type { ArgumentsCamelCase } from 'yargs';
import { attach } from 'webdriverio';

import { deleteSessionFiles, buildAttachOptions, withSession } from '../session.js';

export const command = ['close', 'stop'];
export const desc = 'Close the current session';

interface CloseArgs {
  session: string
  _sessionsDir?: string
}

export const handler = withSession<CloseArgs>(async (argv: ArgumentsCamelCase<CloseArgs>, meta, sessionsDir) => {
  const sessionName = argv.session as string;

  try {
    const browser = await attach(buildAttachOptions(meta));
    await browser.deleteSession();
  } catch {
    // Session may already be dead - clean up anyway
  }

  await deleteSessionFiles(sessionName, sessionsDir);
  console.log(`Session "${sessionName}" closed.`);
});
