import type { ErrorContext, GitHubIssueConfig } from './types';

export function formatErrorForClipboard(err: Error, ctx: ErrorContext): string {
  const lines = [
    `Error: ${err.message}`,
    '',
    `Type: ${ctx.errorType}`,
    `App Version: ${ctx.appVersion}`,
    `Electron: ${ctx.electronVersion}`,
    `Platform: ${ctx.platform} (${ctx.arch})`,
  ];
  if (ctx.logPath) {
    lines.push(`Log File: ${ctx.logPath}`);
  }
  lines.push('', 'Stack Trace:', err.stack || '(no stack)');
  return lines.join('\n');
}

export function defaultGitHubIssueTemplate(err: Error, ctx: ErrorContext): string {
  return [
    `**Error:** ${err.message}`,
    `**Type:** ${ctx.errorType}`,
    `**App Version:** ${ctx.appVersion}`,
    `**Electron:** ${ctx.electronVersion}`,
    `**Platform:** ${ctx.platform} (${ctx.arch})`,
    '',
    '```',
    err.stack || '(no stack)',
    '```',
  ].join('\n');
}

export function buildGitHubIssueURL(
  config: GitHubIssueConfig,
  err: Error,
  ctx: ErrorContext
): string {
  const title = `Crash: ${err.message.slice(0, 100)}`;
  const body = config.template
    ? config.template(ctx)
    : defaultGitHubIssueTemplate(err, ctx);

  const params = new URLSearchParams({ title, body });
  if (config.labels?.length) {
    params.set('labels', config.labels.join(','));
  }

  return `https://github.com/${config.user}/${config.repo}/issues/new?${params.toString()}`;
}
