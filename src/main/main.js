const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

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
    icon: path.join(__dirname, '../../build/icons/win/icon.ico'),
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
    icon: path.join(__dirname, '../../build/icons/win/icon.ico')
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

// Test connexion locale via curl PowerShell (seul moyen de résoudre ryvie.local sur Windows)
ipcMain.handle('test-local-connection', async () => {
  console.log('[Ryvie][Main] 🔍 Test connexion locale:', LOCAL_API_URL);
  
  return new Promise((resolve) => {
    // Utiliser curl PowerShell qui résout correctement ryvie.local via mDNS
    const curlCommand = `curl -s -m 5 "${LOCAL_API_URL}"`;
    
    exec(curlCommand, { timeout: 6000, windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        console.warn('[Ryvie][Main] ❌ Erreur curl:', error.code || error.message);
        resolve({ success: false });
        return;
      }

      if (stderr) {
        console.warn('[Ryvie][Main] ⚠️  Stderr curl:', stderr.substring(0, 100));
      }

      try {
        const data = JSON.parse(stdout);
        console.log('[Ryvie][Main] 📦 Données reçues:', {
          success: data.success,
          ryvieId: data.ryvieId,
          hasDomains: !!data.domains
        });
        
        if (data && data.success && data.domains) {
          console.log('[Ryvie][Main] ✅ Connexion LOCALE réussie');
          resolve({
            success: true,
            data: {
              id: data.id,
              ryvieId: data.ryvieId,
              domains: data.domains
            }
          });
        } else {
          console.warn('[Ryvie][Main] ⚠️  Données invalides (pas de success/domains)');
          resolve({ success: false });
        }
      } catch (parseError) {
        console.error('[Ryvie][Main] ❌ Erreur parsing JSON:', parseError.message);
        console.error('[Ryvie][Main] Stdout reçu:', stdout.substring(0, 200));
        resolve({ success: false });
      }
    });
  });
});

ipcMain.handle('open-url', async (event, url) => {
  try {
    console.log('[Ryvie][Main] 🌐 Ouverture navigateur:', url);
    await shell.openExternal(url);
    return true;
  } catch (error) {
    console.error('[Ryvie][Main] ❌ Erreur ouverture URL:', error);
    return false;
  }
});
