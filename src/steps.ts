import fs from 'node:fs/promises';
import path from 'node:path';

export interface RecordedStep {
  index: number
  tool: string
  params: Record<string, unknown>
  status: 'ok' | 'error'
  error?: string
  durationMs: number
  timestamp: string
}

function isEnoent (err: unknown): boolean {
  return err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT';
}

/**
 * Returns the file path for a session's steps JSON file.
 */
export function getStepsPath (name: string, sessionsDir: string): string {
  return path.join(sessionsDir, `${name}.steps.json`);
}

/**
 * Reads the steps file from disk. Returns an empty array if the file does not exist.
 */
export async function readSteps (stepsPath: string): Promise<RecordedStep[]> {
  try {
    const content = await fs.readFile(stepsPath, 'utf-8');
    return JSON.parse(content) as RecordedStep[];
  } catch (err: unknown) {
    if (isEnoent(err)) {
      return [];
    }
    throw err;
  }
}

/**
 * Writes the full steps array to disk, creating the directory if needed.
 */
export async function writeSteps (stepsPath: string, steps: RecordedStep[]): Promise<void> {
  const dir = path.dirname(stepsPath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(stepsPath, JSON.stringify(steps, null, 2), 'utf-8');
}

/**
 * Appends a single step to the on-disk steps file.
 * Reads existing steps, appends the new one, writes back atomically.
 */
export async function appendStep (
  stepsPath: string,
  step: Omit<RecordedStep, 'index' | 'timestamp'>,
): Promise<void> {
  const steps = await readSteps(stepsPath);
  const fullStep: RecordedStep = {
    ...step,
    index: steps.length + 1,
    timestamp: new Date().toISOString(),
  };
  steps.push(fullStep);
  await writeSteps(stepsPath, steps);
}
