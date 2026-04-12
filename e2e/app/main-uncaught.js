// E2E scenario: uncaught exception in main process → error view
const { app } = require('electron');
const path = require('path');
const { SplashGuard } = require('../../dist/splash-guard');

app.whenReady().then(async () => {
  const guard = new SplashGuard({
    splash: {
      content: path.join(__dirname, 'logo.svg'),
      width: 300,
      height: 200,
      showStatus: true,
    },
    main: {
      loadFile: path.join(__dirname, 'success.html'),
      timeoutMs: 10000,
      browserWindowOptions: { width: 600, height: 400 },
    },
    headless: { detect: () => false }, // force GUI even on CI
    errors: {
      title: 'Uncaught Exception',
      copyToClipboard: true,
      dismiss: 'user',
    },
  });

  await guard.start();

  // Throw after a short delay to simulate a main-process crash
  setTimeout(() => {
    throw new Error('Main process kaboom');
  }, 500);
});
