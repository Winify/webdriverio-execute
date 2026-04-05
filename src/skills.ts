import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import yargs from 'yargs';
import type { Argv } from 'yargs';

import * as openCmd from './commands/open.js';
import * as closeCmd from './commands/close.js';
import * as snapshotCmd from './commands/snapshot.js';
import * as clickCmd from './commands/click.js';
import * as fillCmd from './commands/type.js';
import * as navigateCmd from './commands/navigate.js';
import * as scrollCmd from './commands/scroll.js';
import * as executeCmd from './commands/execute.js';
import * as screenshotCmd from './commands/screenshot.js';
import * as stepsCmd from './commands/steps.js';
import * as sessionListCmd from './commands/session-list.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CommandModule {
  command: string | readonly string[]
  desc: string
  builder?: (yargs: Argv) => Argv
}

interface TopicEntry {
  description: string
  commandModule?: CommandModule
  referenceFile?: string
  /** Inline content used when there is no command and no reference file */
  inlineContent?: string
}

// ---------------------------------------------------------------------------
// Inline content for topics with no command module and no reference file
// ---------------------------------------------------------------------------

const REFS_INLINE = `# wdiox refs — Element Reference Resolution

After running \`wdiox snapshot\`, each interactive element is assigned a short ref (e1, e2, a1, …).

## Ref priority order

1. **e<n>** — generic element refs, numbered by DOM order (buttons, inputs, links, etc.)
2. **a<n>** — ARIA / accessibility-labelled elements
3. **Selector fallback** — you can also pass a CSS selector directly to \`click\` or \`fill\`

## Usage

\`\`\`bash
wdiox snapshot          # assigns refs: e1, e2, e3 …
wdiox click e2          # click element e2
wdiox fill e1 "hello"   # type into element e1
\`\`\`

Refs are stored in \`.wdiox/<session>.refs.json\` and cleared on \`wdiox snapshot\` or session close.
Refs become stale when the page changes — run \`wdiox snapshot\` again to refresh.
`;

// ---------------------------------------------------------------------------
// Topic registry
// ---------------------------------------------------------------------------

const TOPICS: Record<string, TopicEntry> = {
  overview: {
    description: 'Quick reference and workflow patterns',
    referenceFile: 'SKILL.md',
  },
  open: {
    description: 'Open a browser or Appium session',
    commandModule: openCmd,
  },
  close: {
    description: 'Close the current session',
    commandModule: closeCmd,
  },
  snapshot: {
    description: 'Capture viewport elements and assign refs',
    commandModule: snapshotCmd,
  },
  click: {
    description: 'Click an element by ref',
    commandModule: clickCmd,
  },
  type: {
    description: 'Type text into an element by ref',
    commandModule: fillCmd,
  },
  navigate: {
    description: 'Navigate to a URL mid-session',
    commandModule: navigateCmd,
    referenceFile: 'navigate-scroll-steps.md',
  },
  scroll: {
    description: 'Scroll or swipe the page',
    commandModule: scrollCmd,
    referenceFile: 'navigate-scroll-steps.md',
  },
  execute: {
    description: 'Run JavaScript or mobile commands',
    commandModule: executeCmd,
    referenceFile: 'execute.md',
  },
  screenshot: {
    description: 'Take a screenshot',
    commandModule: screenshotCmd,
  },
  steps: {
    description: 'View recorded steps',
    commandModule: stepsCmd,
    referenceFile: 'navigate-scroll-steps.md',
  },
  sessions: {
    description: 'List and manage sessions',
    commandModule: sessionListCmd,
  },
  refs: {
    description: 'Hand-written explanation of element ref resolution',
    inlineContent: REFS_INLINE,
  },
  skills: {
    description: 'Progressive documentation system — how to use this command',
    inlineContent: '# wdiox skills\n\nProgressively discloses documentation for all wdiox commands.\n\n```\nwdiox skills                  # list all topics\nwdiox skills <topic>          # full guide for a topic\nwdiox skills <topic> --flags  # flags reference only\n```\n',
  },
  'chrome-attach': {
    description: 'Attach to a running Chrome instance',
    referenceFile: 'launch-chrome-remote-debugging.md',
  },
  'mobile-setup': {
    description: 'Set up Android/iOS for Appium',
    referenceFile: 'start-mobile-environment.md',
  },
};

// ---------------------------------------------------------------------------
// Skills directory resolution
// ---------------------------------------------------------------------------

/**
 * Resolves the path to the skills/wdiox-usage/ directory relative to the
 * package root. Works whether the source is run directly or built.
 *
 * Source:  src/skills.ts  → __dirname = <root>/src/  → package root = <root>/
 * Built:   build/skills.js → __dirname = <root>/build/ → package root = <root>/
 */
function getSkillsDir(): string {
  const thisFile = fileURLToPath(import.meta.url);
  const packageRoot = path.resolve(path.dirname(thisFile), '..');
  return path.join(packageRoot, 'skills', 'wdiox-usage');
}

// ---------------------------------------------------------------------------
// Yargs introspection
// ---------------------------------------------------------------------------

/** Internal yargs flags to skip when building the flags table. */
const SKIP_FLAGS = new Set(['_', '$0', 'help', 'version', 'session', 's']);

interface OptionRow {
  name: string
  alias?: string
  type: string
  defaultValue?: unknown
  description: string
  choices?: unknown[]
}

// yargs internal types not exposed via @types/yargs
interface YargsOptions {
  string?: string[]
  boolean?: string[]
  number?: string[]
  array?: string[]
  key?: Record<string, unknown>
  alias?: Record<string, string[]>
  default?: Record<string, unknown>
  choices?: Record<string, unknown[]>
}

interface YargsUsageInstance {
  getDescriptions(): Record<string, string>
}

interface YargsInternalMethods {
  getUsageInstance(): YargsUsageInstance
}

interface YargsInstanceWithInternals {
  getOptions(): YargsOptions
  getInternalMethods(): YargsInternalMethods
}

function extractPositionalNames(command: string | readonly string[]): Set<string> {
  const raw = Array.isArray(command) ? command[0] : command;
  const matches = raw.match(/[<[]\s*([^>\] ]+)/g) ?? [];
  return new Set(matches.map((m: string) => m.replace(/^[<[]\s*/, '')));
}

function buildTypeMap(opts: YargsOptions): Record<string, string> {
  const typeMap: Record<string, string> = {};
  for (const name of (opts.string ?? [])) typeMap[name] = 'string';
  for (const name of (opts.boolean ?? [])) typeMap[name] = 'boolean';
  for (const name of (opts.number ?? [])) typeMap[name] = 'number';
  for (const name of (opts.array ?? [])) typeMap[name] = 'array';
  return typeMap;
}

function buildAliasValues(opts: YargsOptions): Set<string> {
  const aliasValues = new Set<string>();
  for (const aliases of Object.values(opts.alias ?? {})) {
    for (const a of aliases) aliasValues.add(a);
  }
  return aliasValues;
}

function normalizeDescription(raw: string): string {
  return raw.startsWith('__yargsString__:')
    ? raw.slice('__yargsString__:'.length)
    : raw;
}

function buildOptionRows(
  opts: YargsOptions,
  descriptions: Record<string, string>,
  positionals: Set<string>,
): OptionRow[] {
  const typeMap = buildTypeMap(opts);
  const aliasValues = buildAliasValues(opts);
  const allKeys = Object.keys(opts.key ?? {});
  const rows: OptionRow[] = [];

  for (const key of allKeys) {
    if (SKIP_FLAGS.has(key)) continue;
    if (positionals.has(key)) continue;
    if (aliasValues.has(key)) continue;

    const type = typeMap[key] ?? 'string';
    const describe = normalizeDescription(descriptions[key] ?? '');
    const defaultValue = opts.default?.[key];
    const aliases = opts.alias?.[key];
    const choices = opts.choices?.[key];
    const aliasStr = aliases?.[0];

    rows.push({ name: key, alias: aliasStr, type, defaultValue, description: describe, choices });
  }

  return rows;
}

function safeDefaultValue(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') return `\`${JSON.stringify(val)}\``;
  return `\`${String(val)}\``;
}

function buildFlagsTable(mod: CommandModule): string {
  if (!mod.builder) return '';

  const positionals = extractPositionalNames(mod.command);

  // Create a fresh yargs instance and run the builder against it.
  // Cast to access internal methods not exposed in @types/yargs.
  const instance = mod.builder(yargs()) as unknown as YargsInstanceWithInternals;
  const opts = instance.getOptions();
  const descriptions = instance.getInternalMethods().getUsageInstance().getDescriptions();

  const rows = buildOptionRows(opts, descriptions, positionals);

  if (rows.length === 0) return '';

  const lines: string[] = [
    '## Flags',
    '',
    '| Flag | Type | Default | Description |',
    '|------|------|---------|-------------|',
  ];

  for (const row of rows) {
    const flagCol = row.alias
      ? `\`--${row.name}\` / \`-${row.alias}\``
      : `\`--${row.name}\``;

    const typeCol = row.choices
      ? `${row.type} (${(row.choices as string[]).map(String).join(String.raw` \| `)})`
      : row.type;

    const defaultCol = row.defaultValue !== undefined
      ? safeDefaultValue(row.defaultValue)
      : '';

    lines.push(`| ${flagCol} | ${typeCol} | ${defaultCol} | ${row.description} |`);
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Reference file reading
// ---------------------------------------------------------------------------

async function readReferenceFile(filename: string): Promise<string | null> {
  const filePath = path.join(getSkillsDir(), filename);
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns a sorted list of all known topics with their one-line descriptions.
 */
export function listTopics(): { name: string; description: string }[] {
  return Object.entries(TOPICS)
    .map(([name, entry]) => ({ name, description: entry.description }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Returns true if the topic is registered.
 */
export function isKnownTopic(topic: string): boolean {
  return Object.hasOwn(TOPICS, topic);
}

/**
 * Returns a flags-only markdown table for the given topic.
 * Returns null if the topic is unknown or has no command module / builder.
 */
export function getTopicFlags(topic: string): string | null {
  const entry = TOPICS[topic];
  if (!entry?.commandModule) return null;
  const table = buildFlagsTable(entry.commandModule);
  return table || null;
}

/**
 * Builds and returns the full guide for a topic.
 * Returns null if the topic is unknown.
 */
export async function getTopicGuide(topic: string): Promise<string | null> {
  const entry = TOPICS[topic];
  if (!entry) return null;

  // Topics with only inline content (e.g. refs) — mutually exclusive with commandModule/referenceFile
  if (entry.inlineContent && !entry.commandModule && !entry.referenceFile) {
    return entry.inlineContent;
  }

  const sections: string[] = [];

  // Header: command name + description
  if (entry.commandModule) {
    const rawCommand = Array.isArray(entry.commandModule.command)
      ? entry.commandModule.command[0]
      : entry.commandModule.command;

    // Strip positional placeholders for the header
    const baseCommand = rawCommand.split(' ')[0];

    sections.push(`# wdiox ${baseCommand}`, '', entry.commandModule.desc, '', '## Usage', '', `wdiox ${rawCommand}`);

    const flagsTable = buildFlagsTable(entry.commandModule);
    if (flagsTable) {
      sections.push('', flagsTable);
    }
  } else if (entry.referenceFile) {
    // no-op: header will be provided by the reference file content below
  } else {
    sections.push(`# wdiox ${topic}`, '');
  }

  // Reference file content
  if (entry.referenceFile) {
    const raw = await readReferenceFile(entry.referenceFile);
    if (raw) {
      // Strip YAML frontmatter (--- ... ---) that is only meaningful to skill loaders
      const content = raw.replace(/^---[\s\S]*?---\n+/, '').trim();
      if (sections.length > 0) {
        sections.push('', '---', '');
      }
      sections.push(content);
    }
  }

  const result = sections.join('\n');
  return result.length > 0 ? result : null;
}
