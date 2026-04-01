import type { RecordedStep } from './steps.js';

export interface BrowserElementFormatInput {
  tagName: string
  role?: string
  type?: string
  name?: string
  href?: string
  selector: string
}

export interface MobileElementFormatInput {
  tagName: string
  text?: string
  selector: string
  accessibilityId?: string
  resourceId?: string
}

export interface SessionListEntry {
  name: string
  browser: string
  url: string
  status: string
}

function truncate(str: string, max = 80): string {
  return str.length <= max ? str : str.slice(0, max - 3) + '...';
}

export function formatBrowserElement(ref: string, el: BrowserElementFormatInput): string {
  const tag = (el.role && el.role !== el.tagName ? el.role : el.tagName) + (el.type ? `[${el.type}]` : '');
  const desc = [el.name && `"${truncate(el.name)}"`, el.href && `-> ${truncate(el.href)}`].filter(Boolean).join(' ');
  return [ref.padEnd(4), tag, desc, el.selector].filter(Boolean).join('  ');
}

export function formatMobileElement(ref: string, el: MobileElementFormatInput): string {
  const selector = el.accessibilityId ? `[accessibility-id: ${el.accessibilityId}]`
    : el.resourceId ? `[resource-id: ${el.resourceId}]`
      : truncate(el.selector);
  const parts = [ref.padEnd(4), el.tagName.padEnd(28), el.text && `"${truncate(el.text)}"`, selector];
  return parts.filter(Boolean).join('  ');
}

export function formatSteps(steps: RecordedStep[]): string {
  if (steps.length === 0) return 'No steps recorded.';

  const rows = steps.map((s) => ({
    '#': String(s.index),
    TOOL: s.tool,
    PARAMS: Object.entries(s.params).map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : String(v)}`).join(' '),
    STATUS: s.status,
    DURATION: `${s.durationMs}ms`,
    TIMESTAMP: s.timestamp,
  }));

  const keys = ['#', 'TOOL', 'PARAMS', 'STATUS', 'DURATION', 'TIMESTAMP'] as const;
  const cols = keys.map((key) => ({
    key,
    width: Math.max(key.length, ...rows.map((r) => r[key].length)),
  }));

  const header = cols.map((c) => c.key.padEnd(c.width)).join('  ');
  const rowLines = rows.map((r) => cols.map((c) => r[c.key].padEnd(c.width)).join('  '));

  return [header, ...rowLines].join('\n');
}

export function formatStepsList(files: string[]): string {
  if (files.length === 0) return 'No archived steps files found.';
  return files.join('\n');
}

export function formatSessionList(entries: SessionListEntry[]): string {
  if (entries.length === 0) return 'No active sessions.';

  const cols = (['name', 'browser', 'url', 'status'] as const).map((key) => ({
    key,
    header: key.toUpperCase(),
    width: Math.max(key.length, ...entries.map((e) => e[key].length)),
  }));

  const row = (e: SessionListEntry) => cols.map((c) => e[c.key].padEnd(c.width)).join('  ');
  const header = cols.map((c) => c.header.padEnd(c.width)).join('  ');

  return [header, ...entries.map(row)].join('\n');
}
