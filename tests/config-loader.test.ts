import path from 'node:path';
import { describe, it, expect, vi } from 'vitest';

const { mockQuestion } = vi.hoisted(() => ({
  mockQuestion: vi.fn().mockResolvedValue(''),
}));
vi.mock('node:readline/promises', () => ({
  default: {
    createInterface: vi.fn().mockReturnValue({
      question: mockQuestion,
      close: vi.fn(),
    }),
  },
}));

import { loadWdioConfig, pickCapabilities } from '../src/config-loader.js';

const FIXTURES = path.join(import.meta.dirname, 'fixtures');

describe('loadWdioConfig', () => {
  it('loads a valid JS config and returns the config object', async () => {
    const config = await loadWdioConfig(path.join(FIXTURES, 'wdio.conf.browser.js'));
    expect(config.capabilities).toEqual({ browserName: 'firefox' });
    expect(config.hostname).toBe('custom-host');
    expect(config.port).toBe(9999);
  });

  it('loads a valid TypeScript config', async () => {
    const config = await loadWdioConfig(path.join(FIXTURES, 'wdio.conf.ts'));
    expect(config.capabilities).toEqual({ browserName: 'chrome' });
  });

  it('throws a clear error when file does not exist', async () => {
    await expect(loadWdioConfig('/nonexistent/wdio.conf.js'))
      .rejects.toThrow('Config file not found: /nonexistent/wdio.conf.js');
  });

  it('throws a clear error when file does not export config', async () => {
    await expect(loadWdioConfig(path.join(FIXTURES, 'wdio.conf.no-export.js')))
      .rejects.toThrow("does not export a 'config' object");
  });
});

describe('pickCapabilities', () => {
  it('returns a single capabilities object directly', async () => {
    const config = { capabilities: { browserName: 'chrome' } } as unknown as WebdriverIO.Config;
    const caps = await pickCapabilities(config);
    expect(caps).toEqual({ browserName: 'chrome' });
  });

  it('returns the first element of a single-entry array', async () => {
    const config = { capabilities: [{ browserName: 'firefox' }] } as unknown as WebdriverIO.Config;
    const caps = await pickCapabilities(config);
    expect(caps).toEqual({ browserName: 'firefox' });
  });

  it('prompts when multiple capabilities and returns chosen entry', async () => {
    mockQuestion.mockResolvedValueOnce('2');
    const config = {
      capabilities: [
        { browserName: 'chrome' },
        { browserName: 'firefox' },
      ],
    } as unknown as WebdriverIO.Config;
    const caps = await pickCapabilities(config);
    expect(caps).toEqual({ browserName: 'firefox' });
    expect(mockQuestion).toHaveBeenCalledWith('Pick one [1]: ');
  });

  it('defaults to first entry on empty input', async () => {
    mockQuestion.mockResolvedValueOnce('');
    const config = {
      capabilities: [
        { browserName: 'chrome' },
        { browserName: 'firefox' },
      ],
    } as unknown as WebdriverIO.Config;
    const caps = await pickCapabilities(config);
    expect(caps).toEqual({ browserName: 'chrome' });
  });

  it('throws on empty capabilities array', async () => {
    const config = { capabilities: [] } as unknown as WebdriverIO.Config;
    await expect(pickCapabilities(config)).rejects.toThrow('No capabilities found in config');
  });
});
