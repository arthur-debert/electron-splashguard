import { describe, it, expect } from 'vitest';
import {
  formatErrorForClipboard,
  defaultGitHubIssueTemplate,
  buildGitHubIssueURL,
} from '../src/error-format';
import type { ErrorContext, GitHubIssueConfig } from '../src/types';

const ctx: ErrorContext = {
  appVersion: '1.2.3',
  electronVersion: '35.0.0',
  platform: 'darwin',
  arch: 'arm64',
  errorType: 'uncaught-exception',
  logPath: '/tmp/app.log',
};

const err = new Error('Something broke');
err.stack = 'Error: Something broke\n    at foo.js:10:5';

describe('formatErrorForClipboard', () => {
  it('includes error message', () => {
    const text = formatErrorForClipboard(err, ctx);
    expect(text).toContain('Something broke');
  });

  it('includes version info', () => {
    const text = formatErrorForClipboard(err, ctx);
    expect(text).toContain('App Version: 1.2.3');
    expect(text).toContain('Electron: 35.0.0');
    expect(text).toContain('darwin (arm64)');
  });

  it('includes error type', () => {
    const text = formatErrorForClipboard(err, ctx);
    expect(text).toContain('Type: uncaught-exception');
  });

  it('includes log path when present', () => {
    const text = formatErrorForClipboard(err, ctx);
    expect(text).toContain('Log File: /tmp/app.log');
  });

  it('omits log path when absent', () => {
    const noLog = { ...ctx, logPath: undefined };
    const text = formatErrorForClipboard(err, noLog);
    expect(text).not.toContain('Log File');
  });

  it('includes stack trace', () => {
    const text = formatErrorForClipboard(err, ctx);
    expect(text).toContain('foo.js:10:5');
  });

  it('handles missing stack', () => {
    const noStack = new Error('no stack');
    noStack.stack = undefined;
    const text = formatErrorForClipboard(noStack, ctx);
    expect(text).toContain('(no stack)');
  });
});

describe('defaultGitHubIssueTemplate', () => {
  it('produces markdown with error info', () => {
    const md = defaultGitHubIssueTemplate(err, ctx);
    expect(md).toContain('**Error:** Something broke');
    expect(md).toContain('**App Version:** 1.2.3');
    expect(md).toContain('```');
  });
});

describe('buildGitHubIssueURL', () => {
  const ghConfig: GitHubIssueConfig = {
    user: 'acme',
    repo: 'myapp',
    labels: ['crash', 'auto'],
  };

  it('builds a valid github.com URL', () => {
    const url = buildGitHubIssueURL(ghConfig, err, ctx);
    expect(url).toMatch(/^https:\/\/github\.com\/acme\/myapp\/issues\/new\?/);
  });

  it('includes title with error message', () => {
    const url = buildGitHubIssueURL(ghConfig, err, ctx);
    const parsed = new URL(url);
    expect(parsed.searchParams.get('title')).toContain('Something broke');
  });

  it('includes labels', () => {
    const url = buildGitHubIssueURL(ghConfig, err, ctx);
    const parsed = new URL(url);
    expect(parsed.searchParams.get('labels')).toBe('crash,auto');
  });

  it('uses custom template when provided', () => {
    const custom: GitHubIssueConfig = {
      ...ghConfig,
      template: (c) => `Custom: ${c.appVersion}`,
    };
    const url = buildGitHubIssueURL(custom, err, ctx);
    const parsed = new URL(url);
    expect(parsed.searchParams.get('body')).toBe('Custom: 1.2.3');
  });

  it('truncates very long error messages in title', () => {
    const longErr = new Error('x'.repeat(200));
    const url = buildGitHubIssueURL(ghConfig, longErr, ctx);
    const parsed = new URL(url);
    const title = parsed.searchParams.get('title')!;
    // "Crash: " + 100 chars
    expect(title.length).toBeLessThanOrEqual(108);
  });

  it('omits labels param when no labels', () => {
    const noLabels: GitHubIssueConfig = { user: 'a', repo: 'b' };
    const url = buildGitHubIssueURL(noLabels, err, ctx);
    const parsed = new URL(url);
    expect(parsed.searchParams.has('labels')).toBe(false);
  });
});
