// E2E scenario: successful boot with readySignal
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
      minDisplayMs: 200,
    },
    main: {
      loadFile: path.join(__dirname, 'success.html'),
      readySignal: 'app-ready',
      timeoutMs: 10000,
      browserWindowOptions: { width: 600, height: 400 },
    },
  });

  guard.status('Starting up…');
  await guard.start();
});
