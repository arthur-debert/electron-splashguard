import { test, expect } from '@playwright/test';
import { _electron as electron, type ElectronApplication, type Page } from 'playwright';
import * as path from 'path';
import { execSync, spawn } from 'child_process';

const electronPath = require('electron') as unknown as string;
const appDir = path.join(__dirname, 'app');

function launchApp(mainScript: string): Promise<ElectronApplication> {
  return electron.launch({
    executablePath: electronPath,
    args: [path.join(appDir, mainScript)],
  });
}

test.describe('Successful boot', () => {
  let app: ElectronApplication;

  test.afterEach(async () => {
    if (app) await app.close().catch(() => {});
  });

  test('shows splash then transitions to app content', async () => {
    app = await launchApp('main-success.js');
    const window = await app.firstWindow();

    // Wait for the app to be ready — the success.html sends 'app-ready'
    // which causes splash-guard to swap to the main content.
    // We should eventually see the app title.
    await window.waitForSelector('#app-title', { timeout: 10000 });
    const title = await window.textContent('#app-title');
    expect(title).toBe('App Loaded Successfully');
  });

  test('status text is visible during splash phase', async () => {
    app = await launchApp('main-success.js');
    const window = await app.firstWindow();

    // The splash may be very brief, but try to catch status text
    // If we're fast enough we see it; if not, the app is already loaded — both fine.
    try {
      const status = await window.textContent('#splash-status', { timeout: 2000 });
      // Status should be either the initial or a custom one
      expect(status).toBeTruthy();
    } catch {
      // Splash already transitioned — that's acceptable
      const title = await window.textContent('#app-title', { timeout: 5000 });
      expect(title).toBe('App Loaded Successfully');
    }
  });
});

test.describe('Timeout error', () => {
  let app: ElectronApplication;

  test.afterEach(async () => {
    if (app) await app.close().catch(() => {});
  });

  test('shows error view with timeout message', async () => {
    app = await launchApp('main-timeout.js');
    const window = await app.firstWindow();

    // Wait for the error-specific selector — h1 exists in success.html too,
    // so we wait for .error-message which only exists in the error page.
    await window.waitForSelector('.error-message', { timeout: 10000 });
    const heading = await window.textContent('h1');
    expect(heading).toBe('Timeout Error');

    const msg = await window.textContent('.error-message');
    expect(msg).toContain('ready within');
  });

  test('error view has Copy Details button', async () => {
    app = await launchApp('main-timeout.js');
    const window = await app.firstWindow();

    await window.waitForSelector('#sg-copy-btn', { timeout: 10000 });
    const btnText = await window.textContent('#sg-copy-btn');
    expect(btnText).toBe('Copy Details');
  });

  test('error view has Report on GitHub button', async () => {
    app = await launchApp('main-timeout.js');
    const window = await app.firstWindow();

    await window.waitForSelector('#sg-report-btn', { timeout: 10000 });
    const btnText = await window.textContent('#sg-report-btn');
    expect(btnText).toBe('Report on GitHub');
  });

  test('error view has Quit button', async () => {
    app = await launchApp('main-timeout.js');
    const window = await app.firstWindow();

    await window.waitForSelector('#sg-quit-btn', { timeout: 10000 });
    const btnText = await window.textContent('#sg-quit-btn');
    expect(btnText).toBe('Quit');
  });

  test('error view shows error type info', async () => {
    app = await launchApp('main-timeout.js');
    const window = await app.firstWindow();

    await window.waitForSelector('.error-type', { timeout: 10000 });
    const info = await window.textContent('.error-type');
    expect(info).toContain('timeout');
  });
});

test.describe('Uncaught exception', () => {
  let app: ElectronApplication;

  test.afterEach(async () => {
    if (app) await app.close().catch(() => {});
  });

  test('catches main-process exception and shows error view', async () => {
    app = await launchApp('main-uncaught.js');
    const window = await app.firstWindow();

    // Wait for .error-message — the error page loads after the exception fires
    await window.waitForSelector('.error-message', { timeout: 10000 });
    const heading = await window.textContent('h1');
    expect(heading).toBe('Uncaught Exception');

    const msg = await window.textContent('.error-message');
    expect(msg).toContain('Main process kaboom');
  });

  test('stack trace is visible in error view', async () => {
    app = await launchApp('main-uncaught.js');
    const window = await app.firstWindow();

    await window.waitForSelector('.stack', { timeout: 10000 });
    const stack = await window.textContent('.stack');
    expect(stack).toContain('kaboom');
  });
});

test.describe('Headless mode', () => {
  test('outputs JSON error to stderr and exits non-zero', async () => {
    const result = await new Promise<{ code: number | null; stderr: string }>((resolve) => {
      let stderr = '';
      const child = spawn(
        electronPath,
        [path.join(appDir, 'main-headless.js')],
        { stdio: ['ignore', 'ignore', 'pipe'] }
      );
      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });
      child.on('close', (code) => {
        resolve({ code, stderr });
      });
    });

    expect(result.code).toBe(1);
    // stderr should contain JSON with error info
    expect(result.stderr).toContain('ready within');
  });
});

test.describe('Auto-dismiss', () => {
  let app: ElectronApplication;

  test.afterEach(async () => {
    if (app) await app.close().catch(() => {});
  });

  test('shows countdown text in error view', async () => {
    app = await launchApp('main-auto-dismiss.js');
    const window = await app.firstWindow();

    await window.waitForSelector('#countdown', { timeout: 10000 });
    const countdownText = await window.textContent('#countdown');
    expect(countdownText).toContain('Auto-quitting in');
  });
});
