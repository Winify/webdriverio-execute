import { describe, expect, it } from 'vitest';

import {
  formatBrowserElement,
  formatMobileElement,
  formatSessionList,
  formatSteps,
  formatStepsList,
} from '../src/format.js';

import type {
  BrowserElementFormatInput,
  MobileElementFormatInput,
  SessionListEntry,
} from '../src/format.js';
import type { RecordedStep } from '../src/steps.js';

describe('formatBrowserElement', () => {
  it('should format a button with accessible name', () => {
    const el: BrowserElementFormatInput = {
      tagName: 'button',
      name: 'Submit Form',
      selector: 'form > button.primary',
    };
    const result = formatBrowserElement('e1', el);
    expect(result).toContain('e1');
    expect(result).toContain('button');
    expect(result).toContain('"Submit Form"');
    expect(result).toContain('form > button.primary');
  });

  it('should format an input with type suffix and name', () => {
    const el: BrowserElementFormatInput = {
      tagName: 'input',
      type: 'email',
      name: 'Enter your email',
      selector: '#email-input',
    };
    const result = formatBrowserElement('e2', el);
    expect(result).toContain('e2');
    expect(result).toContain('input[email]');
    expect(result).toContain('Enter your email');
    expect(result).toContain('#email-input');
  });

  it('should format a link with href using -> prefix when no name', () => {
    const el: BrowserElementFormatInput = {
      tagName: 'a',
      href: 'https://example.com/about',
      selector: 'nav a.about-link',
    };
    const result = formatBrowserElement('e3', el);
    expect(result).toContain('e3');
    expect(result).toContain('a');
    expect(result).toContain('-> https://example.com/about');
    expect(result).toContain('nav a.about-link');
  });

  it('should show name and append href when both present', () => {
    const el: BrowserElementFormatInput = {
      tagName: 'a',
      name: 'About us',
      href: 'https://example.com/about',
      selector: 'a*=About us',
    };
    const result = formatBrowserElement('e4', el);
    expect(result).toContain('"About us"');
    expect(result).toContain('-> https://example.com/about');
  });

  it('should left-align ref padded to 4 chars', () => {
    const el: BrowserElementFormatInput = {
      tagName: 'span',
      name: 'hi',
      selector: 'span',
    };
    const result = formatBrowserElement('e1', el);
    expect(result.startsWith('e1  ')).toBe(true);
  });

  it('should truncate long name', () => {
    const longName = 'A'.repeat(200);
    const el: BrowserElementFormatInput = {
      tagName: 'button',
      name: longName,
      selector: 'button',
    };
    const result = formatBrowserElement('e7', el);
    expect(result).toContain('...');
    expect(result.length).toBeLessThan(longName.length + 50);
  });
});

describe('formatMobileElement', () => {
  it('should format an iOS element with accessibility-id', () => {
    const el: MobileElementFormatInput = {
      tagName: 'XCUIElementTypeButton',
      text: 'Submit',
      selector: '~submit-btn',
      accessibilityId: 'submit-btn',
    };
    const result = formatMobileElement('m1', el);
    expect(result).toContain('m1');
    expect(result).toContain('XCUIElementTypeButton');
    expect(result).toContain('"Submit"');
    expect(result).toContain('[accessibility-id: submit-btn]');
  });

  it('should format element with resourceId', () => {
    const el: MobileElementFormatInput = {
      tagName: 'android.widget.EditText',
      text: 'Enter name',
      selector: 'android=new UiSelector().resourceId("name-input")',
      resourceId: 'name-input',
    };
    const result = formatMobileElement('m2', el);
    expect(result).toContain('m2');
    expect(result).toContain('android.widget.EditText');
    expect(result).toContain('"Enter name"');
    expect(result).toContain('[resource-id: name-input]');
  });

  it('should pad tag to 28 chars', () => {
    const el: MobileElementFormatInput = {
      tagName: 'Button',
      selector: '~btn',
    };
    const result = formatMobileElement('m3', el);
    // After ref (4 chars), tag "Button" should be padded to 28 chars
    const afterRef = result.slice(4); // skip ref
    // The tag portion should occupy 28 chars
    expect(afterRef.length).toBeGreaterThanOrEqual(28);
  });

  it('should show selector when no accessibilityId or resourceId', () => {
    const el: MobileElementFormatInput = {
      tagName: 'XCUIElementTypeStaticText',
      text: 'Hello',
      selector: '//XCUIElementTypeStaticText[@name="Hello"]',
    };
    const result = formatMobileElement('m4', el);
    expect(result).toContain('"Hello"');
    // Should show the raw selector in brackets
    expect(result).toContain('//XCUIElementTypeStaticText[@name="Hello"]');
  });
});

describe('formatSessionList', () => {
  it('should format a table with entries', () => {
    const entries: SessionListEntry[] = [
      { name: 'default', browser: 'chrome', url: 'https://example.com', status: 'active' },
      { name: 'mobile', browser: 'safari', url: 'https://test.io', status: 'idle' },
    ];
    const result = formatSessionList(entries);
    expect(result).toContain('NAME');
    expect(result).toContain('BROWSER');
    expect(result).toContain('URL');
    expect(result).toContain('STATUS');
    expect(result).toContain('default');
    expect(result).toContain('chrome');
    expect(result).toContain('https://example.com');
    expect(result).toContain('active');
    expect(result).toContain('mobile');
    expect(result).toContain('safari');
    expect(result).toContain('https://test.io');
    expect(result).toContain('idle');
  });

  it('should return "No active sessions." for empty array', () => {
    const result = formatSessionList([]);
    expect(result).toBe('No active sessions.');
  });

  it('should pad columns for alignment', () => {
    const entries: SessionListEntry[] = [
      { name: 'a', browser: 'chrome', url: 'https://x.com', status: 'active' },
    ];
    const result = formatSessionList(entries);
    const lines = result.split('\n');
    // Header and at least one data row
    expect(lines.length).toBeGreaterThanOrEqual(2);
    // All lines should have consistent column positions
    const headerNameEnd = lines[0].indexOf('BROWSER');
    const dataNameEnd = lines[1].indexOf('chrome');
    expect(headerNameEnd).toBe(dataNameEnd);
  });
});

describe('formatSteps', () => {
  it('should return message when steps array is empty', () => {
    expect(formatSteps([])).toBe('No steps recorded.');
  });

  it('should format a table with step columns', () => {
    const steps: RecordedStep[] = [
      { index: 1, tool: 'click', params: { ref: 'e1' }, status: 'ok', durationMs: 89, timestamp: '2026-04-01T10:00:00.000Z' },
      { index: 2, tool: 'type', params: { ref: 'e2', text: 'hello' }, status: 'error', error: 'Not found', durationMs: 12, timestamp: '2026-04-01T10:00:01.000Z' },
    ];
    const result = formatSteps(steps);
    expect(result).toContain('#');
    expect(result).toContain('click');
    expect(result).toContain('type');
    expect(result).toContain('ok');
    expect(result).toContain('error');
    expect(result).toContain('89ms');
  });
});

describe('formatStepsList', () => {
  it('should return message when no archived files', () => {
    expect(formatStepsList([])).toBe('No archived steps files found.');
  });

  it('should list archived file names', () => {
    const files = ['default-20260401120000.steps.json', 'other-20260401130000.steps.json'];
    const result = formatStepsList(files);
    expect(result).toContain('default-20260401120000.steps.json');
    expect(result).toContain('other-20260401130000.steps.json');
  });
});
