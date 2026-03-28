import os from 'node:os';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { readSteps, writeSteps, appendStep, getStepsPath } from '../src/steps.js';
import type { RecordedStep } from '../src/steps.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wdio-steps-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('steps', () => {
  describe('getStepsPath', () => {
    it('should return correct path for a named session', () => {
      const result = getStepsPath('my-session', tmpDir);
      expect(result).toBe(path.join(tmpDir, 'my-session.steps.json'));
    });
  });

  describe('writeSteps + readSteps', () => {
    it('should round-trip steps correctly', async () => {
      const stepsPath = path.join(tmpDir, 'test.steps.json');
      const steps: RecordedStep[] = [
        {
          index: 1,
          tool: 'snapshot',
          params: { visible: true },
          status: 'ok',
          durationMs: 150,
          timestamp: '2026-03-28T10:00:00.000Z',
        },
      ];
      await writeSteps(stepsPath, steps);
      const result = await readSteps(stepsPath);
      expect(result).toEqual(steps);
    });
  });

  describe('readSteps', () => {
    it('should return empty array for non-existent file', async () => {
      const result = await readSteps(path.join(tmpDir, 'nonexistent.steps.json'));
      expect(result).toEqual([]);
    });
  });

  describe('appendStep', () => {
    it('should append a step and assign correct index', async () => {
      const stepsPath = path.join(tmpDir, 'append.steps.json');
      await appendStep(stepsPath, {
        tool: 'snapshot',
        params: { visible: true },
        status: 'ok',
        durationMs: 100,
      });
      await appendStep(stepsPath, {
        tool: 'click',
        params: { ref: 'e1' },
        status: 'ok',
        durationMs: 50,
      });
      await appendStep(stepsPath, {
        tool: 'type',
        params: { ref: 'e2', text: 'hello' },
        status: 'error',
        durationMs: 10,
        error: 'element not found',
      });

      const steps = await readSteps(stepsPath);
      expect(steps).toHaveLength(3);
      expect(steps[0]).toMatchObject({ index: 1, tool: 'snapshot', status: 'ok' });
      expect(steps[1]).toMatchObject({ index: 2, tool: 'click', status: 'ok' });
      expect(steps[2]).toMatchObject({
        index: 3,
        tool: 'type',
        status: 'error',
        error: 'element not found',
      });
      expect(steps[0].timestamp).toBeDefined();
      expect(steps[1].timestamp).toBeDefined();
    });
  });
});
