// E2E scenario: app never signals ready → timeout → error view
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
      // Load success.html but use a readySignal that is never sent
      loadFile: path.join(__dirname, 'success.html'),
      readySignal: 'never-sent-signal',
      timeoutMs: 1500,
      browserWindowOptions: { width: 600, height: 400 },
    },
    errors: {
      title: 'Timeout Error',
      copyToClipboard: true,
      githubIssue: { user: 'test', repo: 'app', labels: ['crash'] },
      dismiss: 'user',
    },
  });

  guard.status('Waiting for ready signal…');
  await guard.start();
});
