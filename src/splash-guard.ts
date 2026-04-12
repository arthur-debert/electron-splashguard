import {
  app,
  BrowserWindow,
  clipboard,
  ipcMain,
  shell,
} from 'electron';
import * as path from 'path';
import * as os from 'os';
import type {
  SplashGuardConfig,
  ErrorContext,
  StatusUpdate,
} from './types';
import { validateConfig } from './config';
import { defaultHeadlessDetect } from './headless';
import { resolveDismissPolicy } from './dismiss';
import { resolveSplashHTML } from './splash-html';
import { buildErrorPageHTML } from './error-html';
import { formatErrorForClipboard } from './error-format';

export class SplashGuard {
  private config: SplashGuardConfig;
  private win: BrowserWindow | null = null;
  private splashShownAt = 0;
  private isHeadless: boolean;
  private hasFailed = false;
  private readyTimeout: ReturnType<typeof setTimeout> | null = null;
  private ipcCleanup: (() => void)[] = [];

  constructor(config: SplashGuardConfig) {
    validateConfig(config);
    this.config = config;
    const detect = config.headless?.detect ?? defaultHeadlessDetect;
    this.isHeadless = detect();
  }

  async start(): Promise<void> {
    if (!app.isReady()) {
      throw new Error('splash-guard: app must be ready before calling start()');
    }

    this.registerProcessHandlers();

    if (this.isHeadless) {
      await this.bootMainHeadless();
      return;
    }

    await this.showSplash();
    await this.bootMain();
  }

  /** Send a status update to the splash screen */
  status(text: string, opts?: { progress?: number }): void {
    const update: StatusUpdate = { text, progress: opts?.progress };
    if (this.win && !this.win.isDestroyed() && !this.hasFailed) {
      this.win.webContents.send('splash-guard:status', update);
    }
  }

  /** Manually signal that the app is ready (alternative to readySignal IPC) */
  appReady(): void {
    this.onAppReady();
  }

  /** Clean up resources */
  destroy(): void {
    this.clearTimeout();
    for (const cleanup of this.ipcCleanup) cleanup();
    this.ipcCleanup = [];
    if (this.win && !this.win.isDestroyed()) {
      this.win.destroy();
    }
    this.win = null;
  }

  private async showSplash(): Promise<void> {
    const { splash, main } = this.config;
    const winOpts = main.browserWindowOptions ?? {};

    this.win = new BrowserWindow({
      width: splash.width ?? 480,
      height: splash.height ?? 300,
      frame: false,
      resizable: false,
      transparent: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      backgroundColor: splash.background || '#1a1a2e',
      show: false,
      ...winOpts,
      webPreferences: {
        ...winOpts.webPreferences,
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    const tempDir = path.join(os.tmpdir(), 'electron-splash-guard');
    const splashPath = resolveSplashHTML(splash, tempDir);

    await this.win.loadFile(splashPath);
    this.win.show();
    this.splashShownAt = Date.now();
  }

  private async bootMain(): Promise<void> {
    const { main } = this.config;

    // Register IPC handlers for error view actions
    this.registerIPCHandlers();

    // If app uses a readySignal, listen for it
    if (main.readySignal) {
      const handler = () => this.onAppReady();
      ipcMain.once(main.readySignal, handler);
      this.ipcCleanup.push(() => ipcMain.removeListener(main.readySignal!, handler));
    }

    // Start timeout timer
    if (main.timeoutMs) {
      this.readyTimeout = setTimeout(() => {
        if (!this.hasFailed) {
          this.handleError(
            new Error(`App failed to become ready within ${main.timeoutMs}ms`),
            'timeout'
          );
        }
      }, main.timeoutMs);
    }

    try {
      if (main.loadFile) {
        await this.win!.loadFile(main.loadFile);
      } else {
        await this.win!.loadURL(main.loadURL!);
      }

      // If no readySignal, treat did-finish-load as ready
      if (!main.readySignal) {
        this.onAppReady();
      }
    } catch (err) {
      this.handleError(
        err instanceof Error ? err : new Error(String(err)),
        'load-failure'
      );
    }
  }

  private async bootMainHeadless(): Promise<void> {
    const { main } = this.config;

    this.win = new BrowserWindow({
      show: false,
      ...main.browserWindowOptions,
      webPreferences: {
        ...main.browserWindowOptions?.webPreferences,
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    if (main.readySignal) {
      const handler = () => this.clearTimeout();
      ipcMain.once(main.readySignal, handler);
      this.ipcCleanup.push(() => ipcMain.removeListener(main.readySignal!, handler));
    }

    if (main.timeoutMs) {
      this.readyTimeout = setTimeout(() => {
        this.handleError(
          new Error(`App failed to become ready within ${main.timeoutMs}ms`),
          'timeout'
        );
      }, main.timeoutMs);
    }

    try {
      if (main.loadFile) {
        await this.win.loadFile(main.loadFile);
      } else {
        await this.win.loadURL(main.loadURL!);
      }
      if (!main.readySignal) {
        this.clearTimeout();
      }
    } catch (err) {
      this.handleError(
        err instanceof Error ? err : new Error(String(err)),
        'load-failure'
      );
    }
  }

  private async onAppReady(): Promise<void> {
    if (this.hasFailed) return;
    this.clearTimeout();

    if (this.isHeadless) return;

    // Respect minDisplayMs
    const elapsed = Date.now() - this.splashShownAt;
    const minMs = this.config.splash.minDisplayMs ?? 0;
    if (elapsed < minMs) {
      await new Promise(resolve => setTimeout(resolve, minMs - elapsed));
    }

    if (this.win && !this.win.isDestroyed()) {
      this.win.setSkipTaskbar(false);
      this.win.setAlwaysOnTop(false);
      this.win.setResizable(true);

      // Restore intended dimensions
      const opts = this.config.main.browserWindowOptions ?? {};
      if (opts.width && opts.height) {
        this.win.setSize(opts.width, opts.height);
        this.win.center();
      }

      if (opts.frame !== false) {
        // Can't change frame dynamically, but the loaded page is now the app
      }
    }
  }

  private handleError(err: Error, type: ErrorContext['errorType']): void {
    if (this.hasFailed) return;
    this.hasFailed = true;
    this.clearTimeout();

    const ctx = this.buildErrorContext(type);
    const errorConfig = this.config.errors ?? {};

    // Log
    if (errorConfig.logger) {
      errorConfig.logger(err, ctx);
    } else {
      console.error(`[splash-guard] ${type}:`, err);
    }

    if (this.isHeadless) {
      const onError = this.config.headless?.onError
        ?? ((e: Error, c: ErrorContext) => {
          console.error(JSON.stringify({
            error: e.message,
            stack: e.stack,
            ...c,
          }));
          process.exit(1);
        });
      onError(err, ctx);
      return;
    }

    // Show error UI in the same window
    this.showErrorView(err, ctx, errorConfig);
  }

  private showErrorView(
    err: Error,
    ctx: ErrorContext,
    errorConfig: SplashGuardConfig['errors'] & {}
  ): void {
    if (!this.win || this.win.isDestroyed()) return;

    const dismiss = resolveDismissPolicy(errorConfig.dismiss);
    const html = buildErrorPageHTML(err, ctx, errorConfig, dismiss.afterMs);

    // Write error page to a temp file and navigate to it.
    // We can't use IPC to the current page — it may have navigated away from
    // the splash and lost the listener.
    const fs = require('fs');
    const tempDir = path.join(os.tmpdir(), 'electron-splash-guard');
    fs.mkdirSync(tempDir, { recursive: true });
    const errorPath = path.join(tempDir, 'splash-guard-error.html');
    fs.writeFileSync(errorPath, html, 'utf-8');

    this.win.loadFile(errorPath).catch(() => {});

    // Resize window for error view
    this.win.setSize(520, 420);
    this.win.center();
    this.win.setAlwaysOnTop(false);
    this.win.setResizable(true);
    this.win.setSkipTaskbar(false);

    if (dismiss.autoQuit && dismiss.afterMs === 0) {
      // Immediate auto-quit: give a moment for logging
      setTimeout(() => app.quit(), 100);
    }
  }

  private registerIPCHandlers(): void {
    const copyHandler = (_e: Electron.IpcMainEvent, text: string) => {
      clipboard.writeText(text);
    };
    const logHandler = () => {
      const logPath = this.config.errors?.logPath;
      if (logPath) shell.openPath(logPath);
    };
    const urlHandler = (_e: Electron.IpcMainEvent, url: string) => {
      shell.openExternal(url);
    };
    const quitHandler = () => {
      app.quit();
    };

    ipcMain.on('splash-guard:copy', copyHandler);
    ipcMain.on('splash-guard:open-log', logHandler);
    ipcMain.on('splash-guard:open-url', urlHandler);
    ipcMain.on('splash-guard:quit', quitHandler);

    this.ipcCleanup.push(
      () => ipcMain.removeListener('splash-guard:copy', copyHandler),
      () => ipcMain.removeListener('splash-guard:open-log', logHandler),
      () => ipcMain.removeListener('splash-guard:open-url', urlHandler),
      () => ipcMain.removeListener('splash-guard:quit', quitHandler),
    );
  }

  private registerProcessHandlers(): void {
    app.on('render-process-gone', (_event, _wc, details) => {
      this.handleError(
        new Error(`Renderer process gone: ${details.reason}`),
        'renderer-crash'
      );
    });

    process.on('uncaughtException', (err) => {
      this.handleError(err, 'uncaught-exception');
    });

    process.on('unhandledRejection', (reason) => {
      const err = reason instanceof Error ? reason : new Error(String(reason));
      this.handleError(err, 'uncaught-exception');
    });
  }

  private buildErrorContext(type: ErrorContext['errorType']): ErrorContext {
    return {
      appVersion: app.getVersion(),
      electronVersion: process.versions.electron,
      platform: process.platform,
      arch: process.arch,
      errorType: type,
      logPath: this.config.errors?.logPath,
    };
  }

  private clearTimeout(): void {
    if (this.readyTimeout) {
      clearTimeout(this.readyTimeout);
      this.readyTimeout = null;
    }
  }
}
