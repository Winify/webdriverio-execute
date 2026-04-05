import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import type { ArgumentsCamelCase } from 'yargs';

import { listTopics, isKnownTopic, getTopicFlags, getTopicGuide } from '../../src/skills.js';
import { handler } from '../../src/commands/skills.js';

type HandlerArg = ArgumentsCamelCase<{ topic?: string; flags?: boolean }>;

describe('skills engine', () => {
  describe('listTopics()', () => {
    it('returns an array of objects with name and description fields', () => {
      const topics = listTopics();
      expect(Array.isArray(topics)).toBe(true);
      for (const t of topics) {
        expect(t).toHaveProperty('name');
        expect(t).toHaveProperty('description');
        expect(typeof t.name).toBe('string');
        expect(typeof t.description).toBe('string');
      }
    });

    it('includes all expected topics', () => {
      const topics = listTopics();
      const names = topics.map(t => t.name);
      for (const expected of ['open', 'execute', 'refs', 'chrome-attach', 'mobile-setup', 'overview']) {
        expect(names).toContain(expected);
      }
    });

    it('results are sorted alphabetically by name', () => {
      const topics = listTopics();
      const names = topics.map(t => t.name);
      const sorted = [...names].sort((a, b) => a.localeCompare(b));
      expect(names).toEqual(sorted);
    });
  });

  describe('isKnownTopic()', () => {
    it('returns true for a known topic', () => {
      expect(isKnownTopic('open')).toBe(true);
    });

    it('returns false for an unknown topic', () => {
      expect(isKnownTopic('nonexistent')).toBe(false);
    });
  });

  describe('getTopicFlags()', () => {
    it('returns a markdown string containing a flags table for a topic with a command module', () => {
      const result = getTopicFlags('open');
      expect(result).not.toBeNull();
      expect(result).toContain('| Flag |');
    });

    it('returns null for a topic with no command module (refs)', () => {
      const result = getTopicFlags('refs');
      expect(result).toBeNull();
    });

    it('returns null for an unknown topic', () => {
      const result = getTopicFlags('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getTopicGuide()', () => {
    it('returns a non-null string for a known topic', async () => {
      const result = await getTopicGuide('open');
      expect(result).not.toBeNull();
      expect(typeof result).toBe('string');
    });

    it('the guide for open contains ## Flags and ## Usage sections', async () => {
      const result = await getTopicGuide('open');
      expect(result).toContain('## Flags');
      expect(result).toContain('## Usage');
    });

    it('the guide for execute includes content from execute.md reference file', async () => {
      const result = await getTopicGuide('execute');
      expect(result).not.toBeNull();
      // "Prefer dedicated commands first" is a phrase unique to execute.md
      expect(result).toContain('Prefer dedicated commands first');
    });

    it('the guide for overview contains a # heading but not # wdiox overview', async () => {
      const result = await getTopicGuide('overview');
      expect(result).not.toBeNull();
      expect(result).toMatch(/#\s+\S/);
      expect(result).not.toContain('# wdiox overview');
    });

    it('returns null for an unknown topic', async () => {
      const result = await getTopicGuide('nonexistent');
      expect(result).toBeNull();
    });
  });
});

describe('skills command handler', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let logSpy: ReturnType<typeof vi.spyOn<any, any>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let errorSpy: ReturnType<typeof vi.spyOn<any, any>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let exitSpy: ReturnType<typeof vi.spyOn<any, any>>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('no topic → prints "Available topics" in console.log', async () => {
    await handler({ _: [], $0: '' } as HandlerArg);
    const output = logSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('Available topics');
  });

  it('known topic → prints structured guide with ## Flags and ## Usage', async () => {
    await handler({ topic: 'open', flags: false, _: [], $0: '' } as HandlerArg);
    const output = logSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('## Flags');
    expect(output).toContain('## Usage');
  });

  it('unknown topic → calls process.exit(1) and console.error with "Unknown topic"', async () => {
    await expect(() =>
      handler({ topic: 'bogus', flags: false, _: [], $0: '' } as HandlerArg),
    ).rejects.toThrow('exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
    const errOutput = errorSpy.mock.calls.map(c => c[0]).join('\n');
    expect(errOutput).toContain('Unknown topic');
  });

  it('topic + --flags for topic with flags → prints flags table', async () => {
    await handler({ topic: 'open', flags: true, _: [], $0: '' } as HandlerArg);
    const output = logSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('| Flag |');
  });

  it('topic + --flags for topic without flags (refs) → prints "has no flags"', async () => {
    await handler({ topic: 'refs', flags: true, _: [], $0: '' } as HandlerArg);
    const output = logSpy.mock.calls.map(c => c[0]).join('\n');
    expect(output).toContain('has no flags');
  });

  it('topic + --flags for unknown topic → calls process.exit(1)', async () => {
    await expect(() =>
      handler({ topic: 'bogus', flags: true, _: [], $0: '' } as HandlerArg),
    ).rejects.toThrow('exit');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
