import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const { mockExecute, mockSwipe } = vi.hoisted(() => ({
  mockExecute: vi.fn(),
  mockSwipe: vi.fn(),
}));

vi.mock('webdriverio', () => ({
  attach: vi.fn().mockImplementation(({ capabilities }: { capabilities: Record<string, unknown> }) => {
    const isMobile = Boolean(capabilities?.platformName);
    const isAndroid = isMobile && capabilities?.platformName !== 'iOS';
    const isIOS = isMobile && capabilities?.platformName === 'iOS';
    return Promise.resolve({
      execute: mockExecute,
      swipe: mockSwipe,
      isAndroid,
      isIOS,
      getWindowSize: vi.fn().mockResolvedValue({ width: 1080, height: 2400 }),
      $: vi.fn().mockResolvedValue({ isExisting: vi.fn().mockResolvedValue(false) }),
    });
  }),
}));
vi.mock('../../src/steps.js', () => ({
  appendStep: vi.fn().mockResolvedValue(undefined),
}));

import { handler } from '../../src/commands/scroll.js';
import { writeSession } from '../../src/session.js';
import type { SessionMetadata } from '../../src/session.js';
import { appendStep } from '../../src/steps.js';

const TEST_DIR = path.join(os.tmpdir(), 'wdio-x-test-scroll');

const browserMeta: SessionMetadata = {
  sessionId: 'abc123', hostname: 'localhost', port: 4444,
  capabilities: { browserName: 'chrome' },
  created: '2026-02-15T10:00:00Z', url: 'https://example.com',
};

const mobileMeta: SessionMetadata = {
  sessionId: 'mob123', hostname: 'localhost', port: 4723,
  capabilities: { platformName: 'Android' },
  created: '2026-02-15T10:00:00Z', url: '',
};

describe('scroll command', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockExecute.mockClear();
    mockSwipe.mockClear();
    vi.mocked(appendStep).mockClear();
  });

  afterEach(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  describe('browser', () => {
    beforeEach(async () => {
      await writeSession('default', browserMeta, TEST_DIR);
    });

    it('should scroll down 500px by default', async () => {
      await handler({ direction: 'down', session: 'default', _sessionsDir: TEST_DIR } as unknown as Parameters<typeof handler>[0]);
      expect(mockExecute).toHaveBeenCalledWith(expect.any(Function), 500);
      expect(appendStep).toHaveBeenCalledWith('default', 'scroll', { direction: 'down', pixels: 500 }, 'ok', expect.any(Number), undefined, expect.any(String));
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('down'));
    });

    it('should scroll up with custom pixels', async () => {
      await handler({ direction: 'up', pixels: 1000, session: 'default', _sessionsDir: TEST_DIR } as unknown as Parameters<typeof handler>[0]);
      expect(mockExecute).toHaveBeenCalledWith(expect.any(Function), -1000);
    });

    it('should error when scrolling left or right in browser', async () => {
      await handler({ direction: 'left', session: 'default', _sessionsDir: TEST_DIR } as unknown as Parameters<typeof handler>[0]);
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('left/right'));
      expect(mockExecute).not.toHaveBeenCalled();
    });
  });

  describe('mobile', () => {
    beforeEach(async () => {
      await writeSession('default', mobileMeta, TEST_DIR);
    });

    it('should scroll via mobile: scrollGesture with inverted direction', async () => {
      await handler({ direction: 'down', session: 'default', _sessionsDir: TEST_DIR } as unknown as Parameters<typeof handler>[0]);
      // "scroll down" = content moves down = finger moves up
      expect(mockExecute).toHaveBeenCalledWith('mobile: scrollGesture', expect.objectContaining({ direction: 'up', percent: 0.5 }));
      expect(appendStep).toHaveBeenCalledWith('default', 'scroll', { direction: 'down', duration: 500, percent: 0.5 }, 'ok', expect.any(Number), undefined, expect.any(String));
    });

    it('should scroll left/right with 0.95 percent default', async () => {
      await handler({ direction: 'left', session: 'default', _sessionsDir: TEST_DIR } as unknown as Parameters<typeof handler>[0]);
      expect(mockExecute).toHaveBeenCalledWith('mobile: scrollGesture', expect.objectContaining({ direction: 'right', percent: 0.95 }));
    });

    it('should scroll with custom percent', async () => {
      await handler({ direction: 'up', percent: 0.8, session: 'default', _sessionsDir: TEST_DIR } as unknown as Parameters<typeof handler>[0]);
      expect(mockExecute).toHaveBeenCalledWith('mobile: scrollGesture', expect.objectContaining({ direction: 'down', percent: 0.8 }));
    });
  });

  it('should error when no session exists', async () => {
    await handler({ direction: 'down', session: 'nonexistent', _sessionsDir: TEST_DIR } as unknown as Parameters<typeof handler>[0]);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('No active session'));
    expect(mockExecute).not.toHaveBeenCalled();
  });
});
