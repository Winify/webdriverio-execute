import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitForCDP, closeStaleMappers, restoreAndSwitchToActiveTab } from '../src/cdp.js';

describe('waitForCDP', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves when /json/version returns 200', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    await expect(waitForCDP('localhost', 9222)).resolves.toBeUndefined();
  });

  it('throws after timeout when endpoint never responds', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    await expect(waitForCDP('localhost', 9222, 500)).rejects.toThrow('Chrome did not expose CDP');
  });

  it('retries until endpoint becomes ready', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    await expect(waitForCDP('localhost', 9222)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});

describe('closeStaleMappers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('closes BiDi mapper targets and returns page URLs', async () => {
    const targets = [
      { id: 'bidi-1', title: 'WebdriverIO BiDi Mapper', type: 'other', url: 'about:blank' },
      { id: 'page-1', title: 'Google', type: 'page', url: 'https://google.com' },
      { id: 'page-2', title: 'GitHub', type: 'page', url: 'https://github.com' },
    ];
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ json: () => Promise.resolve(targets) })
      .mockResolvedValue({}),
    );

    const snapshot = await closeStaleMappers('localhost', 9222);
    expect(snapshot.activeTabUrl).toBe('https://google.com');
    expect(snapshot.allTabUrls).toEqual(['https://google.com', 'https://github.com']);
  });

  it('returns empty snapshot when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));
    const snapshot = await closeStaleMappers('localhost', 9222);
    expect(snapshot.activeTabUrl).toBeUndefined();
    expect(snapshot.allTabUrls).toEqual([]);
  });

  it('returns empty snapshot when no page targets exist', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: () => Promise.resolve([]) }));
    const snapshot = await closeStaleMappers('localhost', 9222);
    expect(snapshot.activeTabUrl).toBeUndefined();
    expect(snapshot.allTabUrls).toEqual([]);
  });
});

describe('restoreAndSwitchToActiveTab', () => {
  it('switches to the window matching activeTabUrl', async () => {
    const switchToWindow = vi.fn();
    const getUrl = vi.fn()
      .mockResolvedValueOnce('https://google.com')
      .mockResolvedValueOnce('https://github.com');
    const browser = {
      getWindowHandles: vi.fn().mockResolvedValue(['handle-1', 'handle-2']),
      switchToWindow,
      getUrl,
      url: vi.fn(),
    } as unknown as WebdriverIO.Browser;

    await restoreAndSwitchToActiveTab(browser, 'https://github.com', ['https://google.com', 'https://github.com']);

    // Should switch to handle-2 (which has github.com as its URL)
    expect(switchToWindow).toHaveBeenLastCalledWith('handle-2');
  });

  it('restores blank tabs with missing URLs', async () => {
    const urlFn = vi.fn();
    const switchToWindow = vi.fn();
    const getUrl = vi.fn()
      .mockResolvedValueOnce('https://google.com')
      .mockResolvedValueOnce('about:blank');
    const browser = {
      getWindowHandles: vi.fn().mockResolvedValue(['handle-1', 'handle-2']),
      switchToWindow,
      getUrl,
      url: urlFn,
    } as unknown as WebdriverIO.Browser;

    await restoreAndSwitchToActiveTab(browser, 'https://github.com', ['https://google.com', 'https://github.com']);

    // handle-2 was about:blank and github.com was missing — should be navigated there
    expect(urlFn).toHaveBeenCalledWith('https://github.com');
  });
});
