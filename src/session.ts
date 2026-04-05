import fs from 'node:fs/promises';
import path from 'node:path';

import type { AttachOptions } from 'webdriverio';
import type { ArgumentsCamelCase } from 'yargs';

export interface SessionMetadata {
  sessionId: string
  hostname: string
  port: number
  capabilities: WebdriverIO.Capabilities
  created: string
  url: string
  isAttached?: boolean
}

export interface SessionEntry {
  name: string
  metadata: SessionMetadata
}

const DEFAULT_SESSION_DIR = path.join(process.cwd(), '.wdiox');

function isEnoent(err: unknown): boolean {
  return err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT';
}

/**
 * Build attach options from session metadata for use with webdriverio's `attach()`.
 */
export function buildAttachOptions(meta: SessionMetadata): AttachOptions {
  return {
    sessionId: meta.sessionId,
    capabilities: meta.capabilities,
    options: {
      hostname: meta.hostname,
      port: meta.port,
      logLevel: process.env.WDIO_LOG_LEVEL ?? 'error',
    },
  } as AttachOptions;
}

/**
 * Returns the session directory path. Defaults to ~/.wdio-x/sessions/.
 */
export function getSessionDir (baseDir?: string): string {
  return baseDir ?? DEFAULT_SESSION_DIR;
}

/**
 * Returns the file path for a session's metadata JSON file.
 */
export function getSessionPath (name: string, baseDir?: string): string {
  return path.join(getSessionDir(baseDir), `${name}.json`);
}

/**
 * Returns the file path for a session's refs JSON file.
 */
export function getRefsPath (name: string, baseDir?: string): string {
  return path.join(getSessionDir(baseDir), `${name}.refs.json`);
}

/**
 * Writes session metadata to disk, creating the directory if needed.
 */
export async function writeSession (
  name: string,
  metadata: SessionMetadata,
  baseDir?: string,
): Promise<void> {
  const dir = getSessionDir(baseDir);
  await fs.mkdir(dir, { recursive: true });
  const filePath = getSessionPath(name, baseDir);
  await fs.writeFile(filePath, JSON.stringify(metadata, null, 2));
}

/**
 * Reads session metadata from disk. Returns null if the session file does not exist.
 */
export async function readSession (
  name: string,
  baseDir?: string,
): Promise<SessionMetadata | null> {
  const filePath = getSessionPath(name, baseDir);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as SessionMetadata;
  } catch (err: unknown) {
    if (isEnoent(err)) {
      return null;
    }
    throw err;
  }
}

/**
 * Deletes both the .json and .refs.json files for a session.
 * Does not throw if the files do not exist.
 */
export async function deleteSessionFiles (
  name: string,
  baseDir?: string,
): Promise<void> {
  const sessionPath = getSessionPath(name, baseDir);
  const refsPath = getRefsPath(name, baseDir);
  await Promise.all([
    fs.rm(sessionPath, { force: true }),
    fs.rm(refsPath, { force: true }),
  ]);
}

/**
 * Lists all sessions in the session directory.
 * Only considers .json files (excludes .refs.json).
 * Returns an empty array if the directory does not exist.
 */
export async function listSessions (baseDir?: string): Promise<SessionEntry[]> {
  const dir = getSessionDir(baseDir);
  let files: string[];
  try {
    files = await fs.readdir(dir);
  } catch (err: unknown) {
    if (isEnoent(err)) {
      return [];
    }
    throw err;
  }

  const sessionFiles = files.filter(
    (f) => f.endsWith('.json') && !f.endsWith('.refs.json') && !f.endsWith('.steps.json'),
  );

  return await Promise.all(
    sessionFiles.map(async (f) => {
      const name = f.replace(/\.json$/, '');
      const metadata = await readSession(name, baseDir);
      return { name, metadata: metadata! };
    }),
  );
}

interface SessionArgs {
  session: string
  _sessionsDir?: string
}

/**
 * Wraps a command handler that requires an active session.
 * Reads the session from disk and exits early with an error if not found.
 */
export function withSession<T extends SessionArgs>(
  fn: (argv: ArgumentsCamelCase<T>, meta: SessionMetadata, sessionsDir: string) => Promise<void>,
): (argv: ArgumentsCamelCase<T>) => Promise<void> {
  return async function handler(argv: ArgumentsCamelCase<T>): Promise<void> {
    const sessionName = argv.session as string;
    const sessionsDir = (argv._sessionsDir as string) || getSessionDir();

    const meta = await readSession(sessionName, sessionsDir);
    if (!meta) {
      console.error(`Error: No active session [${sessionName}]. Run wdiox open <url> first.`);
      return;
    }

    await fn(argv, meta, sessionsDir);
  };
}
