import type { SplashConfig } from './types';
import * as path from 'path';

function isHtmlFile(content: string): boolean {
  return content.endsWith('.html') || content.endsWith('.htm');
}

function isImageFile(content: string): boolean {
  return /\.(png|jpe?g|gif|svg|webp|ico|bmp)$/i.test(content);
}

/** Generate inline splash HTML or return the path to a user-provided HTML file */
export function resolveSplashHTML(config: SplashConfig, tempDir: string): string {
  if (isHtmlFile(config.content)) {
    return config.content;
  }

  const bg = config.background || '#1a1a2e';
  let imgTag = '';
  if (isImageFile(config.content)) {
    // Convert to file:// URL for the renderer
    const absPath = path.resolve(config.content);
    imgTag = `<img src="file://${absPath}" style="max-width:80%;max-height:60%;object-fit:contain;" />`;
  } else {
    // Treat as inline SVG or HTML fragment
    imgTag = config.content;
  }

  const statusSection = config.showStatus !== false
    ? `<div id="splash-status" style="
        margin-top:16px;
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
        font-size:13px;
        color:rgba(255,255,255,0.7);
        min-height:20px;
      ">Loading…</div>
      <div id="splash-progress-track" style="
        margin-top:8px;
        width:60%;
        height:3px;
        background:rgba(255,255,255,0.15);
        border-radius:2px;
        overflow:hidden;
        display:none;
      ">
        <div id="splash-progress-bar" style="
          width:0%;
          height:100%;
          background:rgba(255,255,255,0.6);
          transition:width 0.3s ease;
        "></div>
      </div>`
    : '';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src file: data:; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    body {
      background: ${bg};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      -webkit-app-region: drag;
    }
  </style>
</head>
<body>
  <div id="splash-content">${imgTag}</div>
  ${statusSection}
  <script>
    const { ipcRenderer } = require('electron');

    ipcRenderer.on('splash-guard:status', (_e, data) => {
      const statusEl = document.getElementById('splash-status');
      if (statusEl) statusEl.textContent = data.text;

      const track = document.getElementById('splash-progress-track');
      const bar = document.getElementById('splash-progress-bar');
      if (track && bar && typeof data.progress === 'number') {
        track.style.display = 'block';
        bar.style.width = (data.progress * 100) + '%';
      }
    });

    ipcRenderer.on('splash-guard:error', (_e, data) => {
      document.body.style.webkitAppRegion = 'no-drag';
      document.body.innerHTML = data.html;
    });
  </script>
</body>
</html>`;

  const fs = require('fs');
  const outPath = path.join(tempDir, 'splash-guard-splash.html');
  fs.mkdirSync(tempDir, { recursive: true });
  fs.writeFileSync(outPath, html, 'utf-8');
  return outPath;
}
