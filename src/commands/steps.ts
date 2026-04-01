import fs from 'node:fs/promises';
import type { ArgumentsCamelCase, Argv } from 'yargs';

import { getSessionDir } from '../session.js';
import { readSteps } from '../steps.js';
import type { StepsFile } from '../steps.js';
import { formatSteps, formatStepsList } from '../format.js';

export const command = ['steps', 'record'];
export const desc = 'Display recorded steps for the active session';

export const builder = (yargs: Argv) => {
  return yargs
    .option('json', {
      type: 'boolean',
      describe: 'Output raw JSON',
    })
    .option('list', {
      type: 'boolean',
      describe: 'List all archived steps files',
    })
    .option('file', {
      type: 'string',
      describe: 'Display a specific archived steps file by path',
    });
};

function isEnoent(err: unknown): boolean {
  return err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT';
}

async function readStepsFile(filePath: string): Promise<StepsFile | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as StepsFile;
  } catch (err: unknown) {
    if (isEnoent(err)) return null;
    throw err;
  }
}

async function listArchivedFiles(dir: string): Promise<string[]> {
  try {
    const files = await fs.readdir(dir);
    return files.filter((f) => /-.+\.steps\.json$/.test(f));
  } catch (err: unknown) {
    if (isEnoent(err)) return [];
    throw err;
  }
}

interface StepsArgs {
  session: string
  json?: boolean
  list?: boolean
  file?: string
  _sessionsDir?: string
}

export const handler = async (argv: ArgumentsCamelCase<StepsArgs>): Promise<void> => {
  const sessionName = argv.session as string;
  const sessionsDir = (argv._sessionsDir as string) || getSessionDir();

  // --list: show archived files
  if (argv.list) {
    const files = await listArchivedFiles(sessionsDir);
    console.log(formatStepsList(files));
    return;
  }

  // --file: display a specific archived file
  if (argv.file) {
    const data = await readStepsFile(argv.file as string);
    if (!data) {
      console.error(`Error: File not found: ${argv.file}`);
      return;
    }
    if (argv.json) {
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(formatSteps(data.steps));
    }
    return;
  }

  // Default: active session steps
  const data = await readSteps(sessionName, sessionsDir);
  if (!data) {
    console.error(`Error: No steps file for session [${sessionName}]. The session may not be active or no steps were recorded.`);
    return;
  }

  if (argv.json) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(formatSteps(data.steps));
  }
};
