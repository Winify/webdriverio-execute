import { describe, it, expect, vi } from 'vitest';
import { getInteractableBrowserElements } from '@wdio/mcp/snapshot';

describe('getInteractableBrowserElements', () => {
  it('should call browser.execute and return elements', async () => {
    const mockElements = [
      { tagName: 'button', name: 'Submit', type: '', value: '', href: '', selector: 'button.submit', isInViewport: true },
    ];
    const mockBrowser = {
      execute: vi.fn().mockResolvedValue(mockElements),
    } as unknown as WebdriverIO.Browser;

    const result = await getInteractableBrowserElements(mockBrowser);
    expect(result).toEqual(mockElements);
    expect(mockBrowser.execute).toHaveBeenCalledOnce();
  });
});
