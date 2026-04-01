import type { ArgumentsCamelCase, Argv } from 'yargs';
import { attach } from 'webdriverio';

import { getRefsPath, buildAttachOptions, withSession } from '../session.js';
import { writeRefs, type RefMap } from '../refs.js';
import { appendStep } from '../steps.js';
import { getInteractableBrowserElements, getMobileVisibleElements } from '@wdio/mcp/snapshot';
import {
  formatBrowserElement,
  formatMobileElement,
} from '../format.js';

export const command = 'snapshot';
export const desc = 'Capture interactive elements on the page or screen';

export const builder = (yargs: Argv) => {
  return yargs
    .option('visible', {
      type: 'boolean',
      default: true,
      describe: 'Only show elements in viewport',
    });
};

interface SnapshotArgs {
  session: string
  visible: boolean
  _sessionsDir?: string
}

export const handler = withSession<SnapshotArgs>(async (argv: ArgumentsCamelCase<SnapshotArgs>, meta, sessionsDir) => {
  const startTime = Date.now();
  const sessionName = argv.session as string;
  try {
    const browser = await attach(buildAttachOptions(meta));

    const isMobile = browser.isAndroid || browser.isIOS;
    const refs: RefMap = {};

    if (isMobile) {
      const platform = browser.isIOS ? 'ios' : 'android';
      const elements = await getMobileVisibleElements(browser, platform);
      const filtered = argv.visible
        ? elements.filter(el => el.isInViewport)
        : elements;

      const appName = (meta.capabilities['appium:app'] as string) || 'unknown';
      console.log(`\n App: ${appName}\n`);

      filtered.forEach((el, i) => {
        const ref = `e${i + 1}`;
        console.log(formatMobileElement(ref, {
          tagName: el.tagName,
          text: el.text,
          selector: el.selector,
          accessibilityId: el.accessibilityId,
          resourceId: el.resourceId,
        }));
        refs[ref] = {
          selector: el.selector,
          tagName: el.tagName,
          text: el.text,
        };
      });

      console.log(`\n ${filtered.length} elements - ${sessionName} session\n`);
    } else {
      const elements = await getInteractableBrowserElements(browser);
      const filtered = argv.visible
        ? elements.filter(el => el.isInViewport)
        : elements;

      const currentUrl = await browser.getUrl();
      console.log(`\n Page: ${currentUrl}\n`);

      filtered.forEach((el, i) => {
        const ref = `e${i + 1}`;
        console.log(formatBrowserElement(ref, el));
        refs[ref] = {
          selector: el.selector,
          tagName: el.tagName,
          text: el.name || '',
        };
      });

      console.log(`\n ${filtered.length} elements - ${sessionName} session\n`);
    }

    await writeRefs(getRefsPath(sessionName, sessionsDir), refs);
    await appendStep(sessionName, 'snapshot', { visible: argv.visible }, 'ok', Date.now() - startTime, undefined, sessionsDir);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await appendStep(sessionName, 'snapshot', { visible: argv.visible }, 'error', Date.now() - startTime, msg, sessionsDir);
    console.error(`Error taking snapshot: ${msg}`);
  }
});
