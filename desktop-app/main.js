const { app, BrowserWindow, Menu, session, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// The desktop app is a branded shell around the live dashboard — it never bundles the
// web app's own code. Whatever runs on the server is what every install shows, so a
// server-side fix or feature reaches every desktop user without them installing anything.
const TARGET_URL = 'https://dashbaordwhitesky-7fw2.onrender.com/';

const configPath = path.join(app.getPath('userData'), 'config.json');
function loadConfig() {
  try { return JSON.parse(fs.readFileSync(configPath, 'utf8')); }
  catch { return { autoLoadLatest: true }; }
}
function saveConfig(cfg) {
  fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2));
}

let mainWindow;

function buildMenu() {
  const cfg = loadConfig();
  const template = [
    {
      label: 'App',
      submenu: [
        {
          label: 'Check for Updates',
          accelerator: 'CmdOrCtrl+R',
          click: () => checkForUpdates()
        },
        {
          label: 'Always load the latest version on start',
          type: 'checkbox',
          checked: cfg.autoLoadLatest !== false,
          click: (item) => {
            const c = loadConfig();
            c.autoLoadLatest = item.checked;
            saveConfig(c);
          }
        },
        { type: 'separator' },
        { role: 'quit', label: 'Quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggledevtools', visible: false },
        { role: 'resetzoom' },
        { role: 'zoomin' },
        { role: 'zoomout' },
        { role: 'togglefullscreen' }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function checkForUpdates() {
  if (!mainWindow) return;
  mainWindow.webContents.session.clearCache().then(() => {
    mainWindow.webContents.reloadIgnoringCache();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1000,
    minHeight: 640,
    title: 'M&S Cyber Systems',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    backgroundColor: '#EEF2F8',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const cfg = loadConfig();
  const load = () => mainWindow.loadURL(TARGET_URL);

  if (cfg.autoLoadLatest !== false) {
    session.defaultSession.clearCache().then(load);
  } else {
    load();
  }

  // If the dashboard server is unreachable, show a small branded retry screen instead
  // of Electron's default "can't reach this page" error page.
  mainWindow.webContents.on('did-fail-load', (_e, errorCode, errorDescription) => {
    if (errorCode === -3) return; // aborted navigation (e.g. reload racing a previous load) — not a real failure
    const retryHtml = `
      <!DOCTYPE html><html><head><meta charset="UTF-8"><style>
        body{margin:0;font-family:Segoe UI,Arial,sans-serif;background:#0a3258;color:#fff;height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:14px}
        button{padding:10px 22px;background:#1A6FB5;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer}
        button:hover{background:#4da6ff}
        p{color:rgba(255,255,255,.6);font-size:13px}
      </style></head><body>
        <div style="font-size:18px;font-weight:700">Can't reach the dashboard</div>
        <p>Check your internet connection, then try again. (${errorDescription})</p>
        <button onclick="location.reload()">Retry</button>
      </body></html>`;
    mainWindow.loadURL('data:text/html,' + encodeURIComponent(retryHtml));
  });

  // Keep the app's own name in the title bar — don't let it follow whatever
  // <title> the currently loaded page happens to set (e.g. "WhiteSky Travel — Invoicing").
  mainWindow.on('page-title-updated', (event) => event.preventDefault());

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
