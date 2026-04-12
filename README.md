# electron-splash-guard

Splash screen + guarded bootstrap + crash UI for Electron apps.

Shows a splash screen while your app loads, catches failures (load errors, timeouts, uncaught exceptions, renderer crashes), and presents a proper error view instead of a raw JavaScript alert. Headless/CI-safe.

## Install

```bash
npm install electron-splash-guard
```

Requires Electron >= 30.

## Quick start

```js
const { app } = require('electron');
const { createSplashGuard } = require('electron-splash-guard');

app.whenReady().then(async () => {
  const guard = createSplashGuard({
    splash: {
      content: 'assets/logo.png', // image, SVG, or HTML file
      width: 480,
      height: 280,
      showStatus: true,
      minDisplayMs: 600,
    },
    main: {
      loadFile: 'index.html',
      readySignal: 'app-ready',  // IPC channel your app sends when ready
      timeoutMs: 15000,
      browserWindowOptions: { width: 1200, height: 800 },
    },
    errors: {
      title: 'Something went wrong',
      copyToClipboard: true,
      githubIssue: { user: 'yourorg', repo: 'yourapp', labels: ['crash'] },
      dismiss: 'user', // 'user' | 'auto' | { mode: 'auto', afterMs: 5000 }
    },
  });

  guard.status('Starting up...');
  await guard.start();
});
```

In your renderer, signal readiness:

```js
const { ipcRenderer } = require('electron');
ipcRenderer.send('app-ready');
```

## API

### `createSplashGuard(config)` / `new SplashGuard(config)`

Creates a guard instance. Call `guard.start()` after `app.whenReady()`.

### `guard.status(text, { progress? })`

Update the splash status line. `progress` is a number from 0 to 1.

```js
guard.status('Connecting to database...', { progress: 0.4 });
```

### `guard.appReady()`

Manually signal that the app is ready (alternative to `readySignal` IPC).

### `guard.destroy()`

Clean up IPC handlers and the window.

## Configuration

### `splash`

| Option | Type | Default | Description |
|---|---|---|---|
| `content` | `string` | *required* | Path to image (png/jpg/svg), HTML file, or inline SVG/HTML fragment |
| `width` | `number` | `480` | Splash window width |
| `height` | `number` | `300` | Splash window height |
| `background` | `string` | `'#1a1a2e'` | CSS background color |
| `showStatus` | `boolean` | `true` | Show status text + progress bar |
| `minDisplayMs` | `number` | `0` | Minimum splash display time to avoid flash |

### `main`

| Option | Type | Default | Description |
|---|---|---|---|
| `loadFile` | `string` | - | Path to main app HTML (mutually exclusive with `loadURL`) |
| `loadURL` | `string` | - | URL to load (mutually exclusive with `loadFile`) |
| `readySignal` | `string` | - | IPC channel name the app sends when truly ready |
| `timeoutMs` | `number` | - | Max ms to wait before treating as failure |
| `browserWindowOptions` | `object` | `{}` | Electron `BrowserWindowConstructorOptions` |

### `errors`

| Option | Type | Default | Description |
|---|---|---|---|
| `title` | `string` | `'Something went wrong'` | Error view heading |
| `logger` | `function` | `console.error` | `(err, ctx) => void` — custom error logger |
| `logPath` | `string` | - | Path to log file; adds a "View Log" button |
| `copyToClipboard` | `boolean` | `true` | Show "Copy Details" button |
| `githubIssue` | `object` | - | `{ user, repo, labels?, template? }` — adds "Report on GitHub" button |
| `dismiss` | `DismissPolicy` | `'user'` | `'user'` (manual close), `'auto'` (immediate quit), or `{ mode: 'auto', afterMs }` |

### `headless`

| Option | Type | Default | Description |
|---|---|---|---|
| `detect` | `() => boolean` | auto | Custom headless detection (default checks `CI`, `DISPLAY`, `--headless`) |
| `onError` | `function` | JSON to stderr + exit(1) | `(err, ctx) => void` — headless error handler |

## Error types caught

- **`load-failure`** — `loadFile`/`loadURL` promise rejection
- **`timeout`** — app didn't become ready within `timeoutMs`
- **`uncaught-exception`** — `process.on('uncaughtException')` and `unhandledRejection`
- **`renderer-crash`** — `app.on('render-process-gone')`

## Architecture

Single `BrowserWindow`, three page states:

```
splash.html  ──success──>  app (loadFile/loadURL)
     │
     └──failure──>  error page (temp HTML file, loaded in same window)
                    [Copy Details] [View Log] [Report on GitHub] [Quit]
```

No second renderer process. No window-swap flicker. Error page loads even if the app page is broken.

## Tests

```bash
npm test          # 51 unit tests (vitest)
npm run test:e2e  # 11 e2e tests (Playwright + real Electron)
```

## License

MIT
