// E2E scenario: error with auto-dismiss after 2s
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
    errors: {
      title: 'Auto Dismiss Test',
      dismiss: { mode: 'auto', afterMs: 2000 },
    },
  });

  await guard.start();
});
