// E2E scenario: headless mode — error goes to stderr as JSON, process exits
const { app } = require('electron');
const path = require('path');
const { SplashGuard } = require('../../dist/splash-guard');

app.whenReady().then(async () => {
  const guard = new SplashGuard({
    splash: {
      content: path.join(__dirname, 'logo.svg'),
      width: 300,
      height: 200,
    },
    main: {
      loadFile: path.join(__dirname, 'success.html'),
      readySignal: 'never-sent',
      timeoutMs: 1000,
    },
    headless: {
      detect: () => true, // force headless
    },
  });

  await guard.start();
});
