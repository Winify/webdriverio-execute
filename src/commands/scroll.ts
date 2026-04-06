import type { ArgumentsCamelCase, Argv } from 'yargs';
import { attach } from 'webdriverio';

import { buildAttachOptions, withSession } from '../session.js';
import { appendStep } from '../steps.js';

export const command = ['scroll <direction>', 'swipe <direction>'];
export const desc = 'Scroll the page (browser) or swipe (mobile)';

const DIRECTIONS = ['up', 'down', 'left', 'right'] as const;
type Direction = typeof DIRECTIONS[number];

const fingerDirection: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

export const builder = (yargs: Argv) => {
  return yargs
    .positional('direction', {
      type: 'string',
      choices: DIRECTIONS as unknown as string[],
      describe: 'Scroll/swipe direction',
    })
    .option('pixels', {
      type: 'number',
      default: 500,
      describe: 'Pixels to scroll (browser only)',
    })
    .option('duration', {
      type: 'number',
      default: 500,
      describe: 'Swipe duration in ms (mobile only)',
    })
    .option('percent', {
      type: 'number',
      describe: 'Screen percentage to swipe 0-1 (mobile only)',
    });
};

interface ScrollArgs {
  direction: Direction
  pixels: number
  duration: number
  percent?: number
  session: string
  _sessionsDir?: string
}

export const handler = withSession<ScrollArgs>(async (argv: ArgumentsCamelCase<ScrollArgs>, meta, sessionsDir) => {
  const startTime = Date.now();
  const sessionName = argv.session as string;
  const direction = argv.direction as Direction;

  const browser = await attach(buildAttachOptions(meta));
  const isMobile = browser.isAndroid || browser.isIOS;

  try {
    if (isMobile) {
      const isVertical = direction === 'up' || direction === 'down';
      const percent = argv.percent ?? (isVertical ? 0.5 : 0.95);
      const duration = argv.duration ?? 500;

      if (browser.isAndroid) {
        // Use Appium's scrollGesture (more reliable than swipe on Android — no scrollable element dependency)
        const { width, height } = await browser.getWindowSize();
        await browser.execute('mobile: scrollGesture', {
          left: Math.round(width * 0.1),
          top: Math.round(height * 0.2),
          width: Math.round(width * 0.8),
          height: Math.round(height * 0.6),
          direction: fingerDirection[direction] as string,
          percent,
        });
      } else {
        // iOS: find XCUIElementTypeScrollView or fall back to screen-level swipe
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let scrollableElement: any;
        try {
          const el = await browser.$('//XCUIElementTypeScrollView');
          const exists = await el.isExisting();
          if (exists) {
            scrollableElement = el;
          }
        } catch { /* no scroll view found */ }
        await browser.swipe({ direction: fingerDirection[direction], duration, percent, ...(scrollableElement ? { scrollableElement } : {}) });
      }
      await appendStep(sessionName, 'scroll', { direction, duration, percent }, 'ok', Date.now() - startTime, undefined, sessionsDir);
      console.log(`Swiped ${direction}`);
    } else {
      if (direction === 'left' || direction === 'right') {
        console.error('Error: Browser does not support left/right scroll. Use wdiox execute "window.scrollBy(500, 0)" for horizontal scroll.');
        return;
      }
      const pixels = argv.pixels ?? 500;
      const amount = direction === 'down' ? pixels : -pixels;
      await browser.execute((px: number) => { window.scrollBy(0, px); }, amount);
      await appendStep(sessionName, 'scroll', { direction, pixels }, 'ok', Date.now() - startTime, undefined, sessionsDir);
      console.log(`Scrolled ${direction} ${pixels}px`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await appendStep(sessionName, 'scroll', { direction }, 'error', Date.now() - startTime, msg, sessionsDir);
    console.error(`Error scrolling ${direction}: ${msg}`);
  }
});
