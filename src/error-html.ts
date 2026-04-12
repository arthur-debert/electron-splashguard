import type { ErrorConfig, ErrorContext } from './types';
import { formatErrorForClipboard, buildGitHubIssueURL } from './error-format';

export function buildErrorPageHTML(
  err: Error,
  ctx: ErrorContext,
  config: ErrorConfig,
  autoQuitMs: number
): string {
  const title = config.title || 'Something went wrong';
  const clipboardText = formatErrorForClipboard(err, ctx);

  let githubURL = '';
  if (config.githubIssue) {
    githubURL = buildGitHubIssueURL(config.githubIssue, err, ctx);
  }

  const buttons: string[] = [];

  if (config.copyToClipboard !== false) {
    buttons.push(`<button id="sg-copy-btn">Copy Details</button>`);
  }

  if (ctx.logPath) {
    buttons.push(`<button id="sg-log-btn">View Log</button>`);
  }

  if (githubURL) {
    buttons.push(`<button id="sg-report-btn">Report on GitHub</button>`);
  }

  buttons.push(`<button id="sg-quit-btn" class="quit-btn">Quit</button>`);

  // Build a script block that wires up buttons via JS variables (not inline
  // handlers) so user-controlled data never lands in an HTML attribute context.
  const scriptLines = [
    `const {ipcRenderer} = require('electron');`,
    `const _sgClipboard = ${JSON.stringify(clipboardText)};`,
    `const _sgGithubURL = ${JSON.stringify(githubURL)};`,
  ];

  if (config.copyToClipboard !== false) {
    scriptLines.push(`
      document.getElementById('sg-copy-btn').addEventListener('click', () => {
        ipcRenderer.send('splash-guard:copy', _sgClipboard);
        const btn = document.getElementById('sg-copy-btn');
        btn.textContent = 'Copied!';
        setTimeout(() => btn.textContent = 'Copy Details', 1500);
      });
    `);
  }

  if (ctx.logPath) {
    scriptLines.push(`
      document.getElementById('sg-log-btn').addEventListener('click', () => {
        ipcRenderer.send('splash-guard:open-log');
      });
    `);
  }

  if (githubURL) {
    scriptLines.push(`
      document.getElementById('sg-report-btn').addEventListener('click', () => {
        ipcRenderer.send('splash-guard:open-url', _sgGithubURL);
      });
    `);
  }

  scriptLines.push(`
    document.getElementById('sg-quit-btn').addEventListener('click', () => {
      ipcRenderer.send('splash-guard:quit');
    });
  `);

  if (autoQuitMs > 0) {
    scriptLines.push(`
      let remaining = ${Math.ceil(autoQuitMs / 1000)};
      const iv = setInterval(() => {
        remaining--;
        const el = document.getElementById('countdown-secs');
        if (el) el.textContent = remaining;
        if (remaining <= 0) {
          clearInterval(iv);
          ipcRenderer.send('splash-guard:quit');
        }
      }, 1000);
    `);
  }

  const countdownHTML = autoQuitMs > 0
    ? `<div id="countdown" style="margin-top:12px;font-size:12px;color:rgba(255,255,255,0.5);">
        Auto-quitting in <span id="countdown-secs">${Math.ceil(autoQuitMs / 1000)}</span>s…
      </div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
</head>
<body>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: #1a1a2e;
        color: #e0e0e0;
        padding: 24px;
        display: flex;
        flex-direction: column;
        height: 100vh;
      }
      h1 { font-size: 18px; color: #ff6b6b; margin-bottom: 12px; }
      .error-message {
        font-size: 14px;
        margin-bottom: 8px;
        word-break: break-word;
      }
      .error-type {
        font-size: 12px;
        color: rgba(255,255,255,0.4);
        margin-bottom: 16px;
      }
      .stack {
        flex: 1;
        overflow: auto;
        background: rgba(0,0,0,0.3);
        border-radius: 6px;
        padding: 12px;
        font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
        font-size: 11px;
        line-height: 1.5;
        color: rgba(255,255,255,0.6);
        white-space: pre-wrap;
        word-break: break-all;
      }
      .buttons {
        margin-top: 16px;
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      button {
        padding: 8px 16px;
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 6px;
        background: rgba(255,255,255,0.08);
        color: #e0e0e0;
        font-size: 13px;
        cursor: pointer;
        transition: background 0.15s;
      }
      button:hover { background: rgba(255,255,255,0.15); }
      .quit-btn { border-color: #ff6b6b; color: #ff6b6b; }
      .quit-btn:hover { background: rgba(255,107,107,0.15); }
    </style>
    <h1>${escapeHtml(title)}</h1>
    <div class="error-message">${escapeHtml(err.message)}</div>
    <div class="error-type">${escapeHtml(ctx.errorType)} · ${escapeHtml(ctx.appVersion)} · ${escapeHtml(ctx.platform)}</div>
    <div class="stack">${escapeHtml(err.stack || '(no stack trace)')}</div>
    <div class="buttons">${buttons.join('\n')}</div>
    ${countdownHTML}
    <script>${scriptLines.join('\n')}</script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
