import fs from 'node:fs/promises';
import path from 'node:path';

import { getSessionDir } from './session.js';

export interface RecordedStep {
  index: number
  tool: string
  params: Record<string, unknown>
  status: 'ok' | 'error'
  error?: string
  durationMs: number
  timestamp: string
}

export interface StepsFile {
  sessionId: string
  type: 'browser' | 'ios' | 'android'
  startedAt: string
  endedAt?: string
  steps: RecordedStep[]
}

function isEnoent(err: unknown): boolean {
  return err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT';
}

/**
 * Returns the file path for a session's steps JSON file.
 */
export function getStepsPath(name: string, baseDir?: string): string {
  return path.join(getSessionDir(baseDir), `${name}.steps.json`);
}

/**
 * Creates a new steps file for a session with empty steps array.
 */
export async function initSteps(
  name: string,
  sessionId: string,
  type: 'browser' | 'ios' | 'android',
  baseDir?: string,
): Promise<void> {
  const dir = getSessionDir(baseDir);
  await fs.mkdir(dir, { recursive: true });
  const filePath = getStepsPath(name, baseDir);
  const data: StepsFile = {
    sessionId,
    type,
    startedAt: new Date().toISOString(),
    steps: [],
  };
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

/**
 * Appends a recorded step to the steps file. Silently returns if file not found.
 */
export async function appendStep(
  name: string,
  tool: string,
  params: Record<string, unknown>,
  status: 'ok' | 'error',
  durationMs: number,
  error?: string,
  baseDir?: string,
): Promise<void> {
  const filePath = getStepsPath(name, baseDir);
  let data: StepsFile;
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    data = JSON.parse(content) as StepsFile;
  } catch (err: unknown) {
    if (isEnoent(err)) {
      return;
    }
    throw err;
  }

  const step: RecordedStep = {
    index: data.steps.length + 1,
    tool,
    params,
    status,
    durationMs,
    timestamp: new Date().toISOString(),
  };
  if (error !== undefined) {
    step.error = error;
  }

  data.steps.push(step);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

/**
 * Sets endedAt on the steps file and renames it to <sessionId>-<endedAt>.steps.json.
 * Silently returns if file not found.
 */
export async function finalizeSteps(name: string, baseDir?: string): Promise<void> {
  const filePath = getStepsPath(name, baseDir);
  let data: StepsFile;
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    data = JSON.parse(content) as StepsFile;
  } catch (err: unknown) {
    if (isEnoent(err)) {
      return;
    }
    throw err;
  }

  data.endedAt = new Date().toISOString();
  const compactTimestamp = data.endedAt.replace(/[-:TZ.]/g, '').slice(0, 14);
  const archivedPath = path.join(
    getSessionDir(baseDir),
    `${name}-${compactTimestamp}.steps.json`,
  );
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  await fs.rename(filePath, archivedPath);
}

/**
 * Reads a steps file from disk. Returns null if the file does not exist.
 */
export async function readSteps(name: string, baseDir?: string): Promise<StepsFile | null> {
  const filePath = getStepsPath(name, baseDir);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as StepsFile;
  } catch (err: unknown) {
    if (isEnoent(err)) {
      return null;
    }
    throw err;
  }
}

/**
 * Deletes the steps file. Does not throw if the file does not exist.
 */
export async function deleteStepsFile(name: string, baseDir?: string): Promise<void> {
  const filePath = getStepsPath(name, baseDir);
  await fs.rm(filePath, { force: true });
}
