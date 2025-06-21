const { app, BrowserWindow, session } = require('electron');
const path = require('path');

// Suppress noisy network-service errors
app.commandLine.appendSwitch('disable-features', 'NetworkService');
app.commandLine.appendSwitch('log-net-log-level', '0');
app.commandLine.appendSwitch('log-file', path.join(app.getPath('userData'), 'electron.log'));
// Enable experimental Web Speech & Web Platform features
app.commandLine.appendSwitch('enable-experimental-web-platform-features');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    fullscreen: false,       // set to true for full-screen TV mode
    autoHideMenuBar: true,   // hide top menu bar
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      // allow audio capture
      microphone: true,
      // enable recognition features
      experimentalFeatures: true
    }
  });

  // Grant media permission (microphone) automatically
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true);
    } else {
      callback(false);
    }
  });

  win.loadFile('homepage.html');
  // win.webContents.openDevTools(); // for debugging
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
