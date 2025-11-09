const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Désactiver l'accélération GPU pour éviter les erreurs sur certains systèmes
app.disableHardwareAcceleration();

const CONFIG_FILE = path.join(app.getPath('userData'), 'ryvie-config.json');
const LOCAL_API_URL = 'http://ryvie.local:3002/api/settings/ryvie-domains';
const LOCAL_APP_URL = 'http://ryvie.local:3000';

let mainWindow;
let splashWindow;

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 420,
    height: 300,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    show: false,
    icon: path.join(__dirname, '../../ryvielogo0.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  splashWindow.loadFile(path.join(__dirname, '../renderer/splash.html'));
  splashWindow.once('ready-to-show', () => splashWindow && splashWindow.show());
}

function createMain() {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 500,
    resizable: false,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../../ryvielogo0.png')
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  mainWindow.setMenuBarVisibility(false);

  mainWindow.once('ready-to-show', () => {
    // petite temporisation pour laisser l'animation du splash
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
      splashWindow = null;
      if (mainWindow) mainWindow.show();
    }, 800);
  });
}

// Empêcher plusieurs instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createSplash();
    createMain();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createSplash();
        createMain();
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC CONFIG
ipcMain.handle('load-config', async () => {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Erreur lors du chargement de la config:', error);
  }
  return null;
});

ipcMain.handle('save-config', async (event, config) => {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la config:', error);
    return false;
  }
});

// Test connexion locale
ipcMain.handle('test-local-connection', async () => {
  try {
    const response = await fetch(LOCAL_API_URL, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.success && data.domains) {
        return {
          success: true,
          data: {
            id: data.id,
            ryvieId: data.ryvieId,
            domains: data.domains
          }
        };
      }
    }
    return { success: false };
  } catch (error) {
    console.error('Erreur connexion locale:', error);
    return { success: false };
  }
});

ipcMain.handle('open-url', async (event, url) => {
  try {
    await shell.openExternal(url);
    return true;
  } catch (error) {
    console.error("Erreur lors de l'ouverture de l'URL:", error);
    return false;
  }
});
