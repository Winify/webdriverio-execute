import fs from 'node:fs/promises';

export interface RefEntry {
  selector?: string
  tagName: string
  text?: string
  placeholder?: string
  [key: string]: unknown
}

export type RefMap = Record<string, RefEntry>;

function isEnoent (err: unknown): boolean {
  return err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT';
}

/**
 * Writes a ref map to disk as JSON.
 */
export async function writeRefs (refsPath: string, refs: RefMap): Promise<void> {
  await fs.writeFile(refsPath, JSON.stringify(refs, null, 2), 'utf-8');
}

/**
 * Reads a ref map from disk. Returns null if the file doesn't exist.
 */
export async function readRefs (refsPath: string): Promise<RefMap | null> {
  try {
    const content = await fs.readFile(refsPath, 'utf-8');
    return JSON.parse(content) as RefMap;
  } catch (err: unknown) {
    if (isEnoent(err)) {
      return null;
    }
    throw err;
  }
}

/**
 * Look up a ref by key: reads refs file, finds the entry, resolves its selector.
 * Logs appropriate error messages and returns null on failure.
 */
export async function lookupRef (
  refsPath: string,
  refKey: string,
): Promise<{ ref: RefEntry; selector: string } | null> {
  const refs = await readRefs(refsPath);
  if (!refs) {
    console.error('Error: No snapshot taken for this session. Run wdiox snapshot first to capture element refs.');
    return null;
  }

  const ref = refs[refKey];
  if (!ref) {
    const available = Object.keys(refs);
    const range = available.length > 0
      ? `Available: ${available[0]}-${available[available.length - 1]}`
      : 'No refs available';
    console.error(`Error: ${refKey} not found in snapshot. ${range}`);
    return null;
  }

  if (!ref.selector) {
    console.error(`Error: Could not resolve selector for ${refKey}`);
    return null;
  }

  return { ref, selector: ref.selector };
}
