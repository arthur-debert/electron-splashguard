import { describe, it, expect } from 'vitest';
import { buildErrorPageHTML } from '../src/error-html';
import type { ErrorConfig, ErrorContext } from '../src/types';

const ctx: ErrorContext = {
  appVersion: '2.0.0',
  electronVersion: '35.0.0',
  platform: 'win32',
  arch: 'x64',
  errorType: 'load-failure',
  logPath: '/tmp/log.txt',
};

const err = new Error('Failed to load');
err.stack = 'Error: Failed to load\n    at main.js:5';

describe('buildErrorPageHTML', () => {
  it('includes the error title', () => {
    const html = buildErrorPageHTML(err, ctx, {}, 0);
    expect(html).toContain('Something went wrong');
  });

  it('uses custom title', () => {
    const html = buildErrorPageHTML(err, ctx, { title: 'Oops!' }, 0);
    expect(html).toContain('Oops!');
  });

  it('includes error message', () => {
    const html = buildErrorPageHTML(err, ctx, {}, 0);
    expect(html).toContain('Failed to load');
  });

  it('includes stack trace', () => {
    const html = buildErrorPageHTML(err, ctx, {}, 0);
    expect(html).toContain('main.js:5');
  });

  it('includes Copy Details button by default', () => {
    const html = buildErrorPageHTML(err, ctx, {}, 0);
    expect(html).toContain('Copy Details');
    expect(html).toContain('splash-guard:copy');
  });

  it('omits Copy Details when copyToClipboard is false', () => {
    const html = buildErrorPageHTML(err, ctx, { copyToClipboard: false }, 0);
    expect(html).not.toContain('Copy Details');
  });

  it('includes View Log button when logPath is present', () => {
    const html = buildErrorPageHTML(err, ctx, {}, 0);
    expect(html).toContain('View Log');
    expect(html).toContain('splash-guard:open-log');
  });

  it('omits View Log button when no logPath', () => {
    const noLog = { ...ctx, logPath: undefined };
    const html = buildErrorPageHTML(err, noLog, {}, 0);
    expect(html).not.toContain('View Log');
  });

  it('includes Report on GitHub button when configured', () => {
    const config: ErrorConfig = {
      githubIssue: { user: 'acme', repo: 'app' },
    };
    const html = buildErrorPageHTML(err, ctx, config, 0);
    expect(html).toContain('Report on GitHub');
    expect(html).toContain('github.com/acme/app');
  });

  it('omits GitHub button when not configured', () => {
    const html = buildErrorPageHTML(err, ctx, {}, 0);
    expect(html).not.toContain('Report on GitHub');
  });

  it('always includes Quit button', () => {
    const html = buildErrorPageHTML(err, ctx, {}, 0);
    expect(html).toContain('Quit');
    expect(html).toContain('splash-guard:quit');
  });

  it('shows countdown when autoQuitMs > 0', () => {
    const html = buildErrorPageHTML(err, ctx, {}, 5000);
    expect(html).toContain('Auto-quitting in');
    expect(html).toContain('5');
  });

  it('omits countdown when autoQuitMs is 0', () => {
    const html = buildErrorPageHTML(err, ctx, {}, 0);
    expect(html).not.toContain('Auto-quitting');
  });

  it('escapes HTML in error messages rendered as visible text', () => {
    const xss = new Error('<script>alert(1)</script>');
    xss.stack = '<img onerror=alert(1)>';
    const html = buildErrorPageHTML(xss, ctx, {}, 0);
    // The error message div should contain escaped HTML
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    // The stack div should contain escaped HTML
    expect(html).toContain('&lt;img onerror=alert(1)&gt;');
    // The raw <script>alert(1)</script> must NOT appear in any HTML attribute
    // (our <script> block is safe — it uses JSON.stringify into a JS variable)
    const withoutScriptBlocks = html.replace(/<script>[\s\S]*?<\/script>/g, '');
    expect(withoutScriptBlocks).not.toContain('<script>alert(1)</script>');
  });

  it('includes error type and platform info', () => {
    const html = buildErrorPageHTML(err, ctx, {}, 0);
    expect(html).toContain('load-failure');
    expect(html).toContain('2.0.0');
    expect(html).toContain('win32');
  });
});
