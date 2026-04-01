import os from 'node:os';
import fs from 'node:fs/promises';
import path from 'node:path';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import {
  getStepsPath,
  initSteps,
  appendStep,
  finalizeSteps,
  readSteps,
  deleteStepsFile,
} from '../src/steps.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wdio-x-steps-test-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('steps', () => {
  describe('getStepsPath', () => {
    it('should return path with .steps.json suffix', () => {
      const result = getStepsPath('default', tmpDir);
      expect(result).toBe(path.join(tmpDir, 'default.steps.json'));
    });
  });

  describe('initSteps', () => {
    it('should create a valid steps file with empty steps array', async () => {
      await initSteps('test', 'sess-abc', 'browser', tmpDir);
      const data = await readSteps('test', tmpDir);

      expect(data).not.toBeNull();
      expect(data!.sessionId).toBe('sess-abc');
      expect(data!.type).toBe('browser');
      expect(data!.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(data!.steps).toEqual([]);
      expect(data!.endedAt).toBeUndefined();
    });
  });

  describe('appendStep', () => {
    it('should append a step with index 1 after initSteps', async () => {
      await initSteps('test', 'sess-abc', 'browser', tmpDir);
      await appendStep('test', 'navigate', { url: 'https://example.com' }, 'ok', 150, undefined, tmpDir);

      const data = await readSteps('test', tmpDir);
      expect(data!.steps).toHaveLength(1);

      const step = data!.steps[0];
      expect(step.index).toBe(1);
      expect(step.tool).toBe('navigate');
      expect(step.params).toEqual({ url: 'https://example.com' });
      expect(step.status).toBe('ok');
      expect(step.durationMs).toBeGreaterThanOrEqual(0);
      expect(step.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should append a second step with index 2', async () => {
      await initSteps('test', 'sess-abc', 'browser', tmpDir);
      await appendStep('test', 'navigate', { url: 'https://example.com' }, 'ok', 100, undefined, tmpDir);
      await appendStep('test', 'click', { ref: 'e1' }, 'ok', 50, undefined, tmpDir);

      const data = await readSteps('test', tmpDir);
      expect(data!.steps).toHaveLength(2);
      expect(data!.steps[1].index).toBe(2);
      expect(data!.steps[1].tool).toBe('click');
    });

    it('should silently return when the file does not exist', async () => {
      await expect(
        appendStep('nonexistent', 'navigate', {}, 'ok', 0, undefined, tmpDir),
      ).resolves.toBeUndefined();
    });

    it('should include error field when status is error', async () => {
      await initSteps('test', 'sess-abc', 'browser', tmpDir);
      await appendStep('test', 'click', { ref: 'e99' }, 'error', 10, 'Element not found', tmpDir);

      const data = await readSteps('test', tmpDir);
      const step = data!.steps[0];
      expect(step.status).toBe('error');
      expect(step.error).toBe('Element not found');
    });
  });

  describe('finalizeSteps', () => {
    it('should set endedAt and rename the file to <sessionId>-<timestamp>.steps.json', async () => {
      await initSteps('test', 'sess-abc', 'browser', tmpDir);
      await finalizeSteps('test', tmpDir);

      // Original file should be gone
      const original = await readSteps('test', tmpDir);
      expect(original).toBeNull();

      // Archived file should exist with correct name pattern
      const files = await fs.readdir(tmpDir);
      const archived = files.find((f) => f.startsWith('test-') && f.endsWith('.steps.json'));
      expect(archived).toBeDefined();

      const content = JSON.parse(await fs.readFile(path.join(tmpDir, archived!), 'utf-8'));
      expect(content.endedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should silently return when the file does not exist', async () => {
      await expect(finalizeSteps('nonexistent', tmpDir)).resolves.toBeUndefined();
    });
  });

  describe('readSteps', () => {
    it('should return null for a non-existent file', async () => {
      const result = await readSteps('nonexistent', tmpDir);
      expect(result).toBeNull();
    });
  });

  describe('deleteStepsFile', () => {
    it('should remove the steps file', async () => {
      await initSteps('test', 'sess-abc', 'browser', tmpDir);
      await deleteStepsFile('test', tmpDir);

      const result = await readSteps('test', tmpDir);
      expect(result).toBeNull();
    });

    it('should not throw when the file does not exist', async () => {
      await expect(deleteStepsFile('nonexistent', tmpDir)).resolves.toBeUndefined();
    });
  });
});
