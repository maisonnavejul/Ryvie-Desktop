const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

// Désactiver l'accélération GPU pour éviter les erreurs sur certains systèmes
app.disableHardwareAcceleration();

const CONFIG_FILE = path.join(app.getPath('userData'), 'ryvie-config.json');
const LOCAL_API_URL = 'http://ryvie.local:3002/api/settings/ryvie-domains';
const LOCAL_APP_URL = 'http://ryvie.local';

// Flags de plateforme
const IS_WINDOWS = process.platform === 'win32';
const IS_MAC = process.platform === 'darwin';
const IS_LINUX = process.platform === 'linux';

// Chemin binaire NetBird selon la plateforme (Windows réellement utilisé, autres à compléter si besoin)
const NETBIRD_PATH = IS_WINDOWS
  ? 'C:\\Program Files\\Netbird\\netbird.exe'
  : IS_MAC
    ? '/usr/local/bin/netbird'
    : '/usr/bin/netbird';

// URL installeur NetBird selon la plateforme
const NETBIRD_INSTALLER_URL = IS_WINDOWS
  ? 'https://pkgs.netbird.io/windows/msi/x64'
  : 'https://pkgs.netbird.io/install.sh';

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
    height: 400,
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
    // Fermer le splash et afficher la fenêtre principale immédiatement
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
    }
    splashWindow = null;
    if (mainWindow) {
      mainWindow.show();
    }
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
    // Supprimer le raccourci NetBird au démarrage si présent
    removeNetbirdShortcut();
    
    createSplash();
    
    // Créer la fenêtre principale après un délai (pour laisser le splash s'afficher)
    setTimeout(() => {
      createMain();
    }, 1500);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createSplash();
        setTimeout(() => {
          createMain();
        }, 1500);
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ========================================
// NETBIRD FUNCTIONS
// ========================================

// Supprime le raccourci NetBird du bureau s'il existe
function removeNetbirdShortcut() {
  if (!IS_WINDOWS) return;
  
  const possiblePaths = [
    path.join(process.env.USERPROFILE, 'Desktop', 'NetBird.lnk'),
    path.join(process.env.USERPROFILE, 'OneDrive', 'Desktop', 'NetBird.lnk'),
    path.join(process.env.PUBLIC, 'Desktop', 'NetBird.lnk')
  ];
  
  possiblePaths.forEach(desktopPath => {
    if (fs.existsSync(desktopPath)) {
      try {
        fs.unlinkSync(desktopPath);
        console.log('[Ryvie][Main] Raccourci bureau NetBird supprime:', desktopPath);
      } catch (err) {
        console.warn('[Ryvie][Main] Impossible de supprimer le raccourci bureau:', err.message);
      }
    }
  });
}

// Verifie si NetBird est installe
function isNetbirdInstalled() {
  if (!IS_WINDOWS && !IS_MAC && !IS_LINUX) {
    console.warn('[Ryvie][Main] Plateforme non supportee pour NetBird:', process.platform);
    return false;
  }

  return fs.existsSync(NETBIRD_PATH);
}

// Installe NetBird selon le système d'exploitation
function installNetbird() {
  return new Promise((resolve) => {
    if (!IS_WINDOWS && !IS_MAC && !IS_LINUX) {
      console.warn('[Ryvie][Main] Plateforme non supportee pour installation NetBird:', process.platform);
      resolve({ success: false, error: 'Plateforme non supportee pour installation NetBird.' });
      return;
    }

    if (IS_WINDOWS) {
      // Installation Windows via MSI
      console.log('[Ryvie][Main] Installation de NetBird (Windows)...');
      const tempPath = path.join(process.env.TEMP, 'netbird-installer.msi');
      
      // Telecharger l'installeur MSI
      const downloadCmd = `curl -L "${NETBIRD_INSTALLER_URL}" -o "${tempPath}"`;
      
      exec(downloadCmd, { timeout: 60000, windowsHide: true }, (downloadError) => {
        if (downloadError) {
          console.error('[Ryvie][Main] Erreur telechargement NetBird:', downloadError.message);
          resolve({ success: false, error: 'Erreur telechargement' });
          return;
        }
        
        console.log('[Ryvie][Main] Telechargement MSI termine, lancement installation classique...');
        
        // Installer via msiexec avec interface standard (non silencieuse)
        // INSTALLDESKTOPSHORTCUT=0 désactive le raccourci bureau
        const installCmd = `msiexec /i "${tempPath}" /norestart INSTALLDESKTOPSHORTCUT=0`;
        
        exec(installCmd, { timeout: 120000, windowsHide: false }, (installError) => {
          if (installError) {
            console.error('[Ryvie][Main] Erreur installation NetBird:', installError.message);
            resolve({ success: false, error: 'Erreur installation' });
            return;
          }
          
          console.log('[Ryvie][Main] NetBird installe avec succes');
          
          // Attendre que l'installation se finalise avant de supprimer le raccourci
          setTimeout(() => {
            removeNetbirdShortcut();
            resolve({ success: true });
          }, 5000);
        });
      });
    } else {
      // Installation Linux/macOS via script officiel
      console.log(`[Ryvie][Main] Installation de NetBird (${IS_MAC ? 'macOS' : 'Linux'})...`);
      
      // Utiliser le script d'installation officiel
      const installCmd = `curl -fsSL ${NETBIRD_INSTALLER_URL} | sh`;
      
      exec(installCmd, { timeout: 120000 }, (installError, stdout, stderr) => {
        if (installError) {
          console.error('[Ryvie][Main] Erreur installation NetBird:', installError.message);
          if (stderr) console.error('[Ryvie][Main] Stderr:', stderr);
          resolve({ success: false, error: 'Erreur installation' });
          return;
        }
        
        console.log('[Ryvie][Main] NetBird installe avec succes');
        if (stdout) console.log('[Ryvie][Main] Stdout:', stdout.substring(0, 200));
        
        // Attendre un peu que l'installation se finalise
        setTimeout(() => {
          resolve({ success: true });
        }, 3000);
      });
    }
  });
}

// Deconnecte NetBird
function netbirdLogout() {
  return new Promise((resolve) => {
    if (!IS_WINDOWS && !IS_MAC && !IS_LINUX) {
      console.warn('[Ryvie][Main] Plateforme non supportee pour NetBird logout:', process.platform);
      resolve({ success: true });
      return;
    }

    if (!isNetbirdInstalled()) {
      console.log('[Ryvie][Main] NetBird non installe, skip logout');
      resolve({ success: true });
      return;
    }
    
    console.log('[Ryvie][Main] Deconnexion NetBird...');
    const logoutCmd = `"${NETBIRD_PATH}" logout`;
    
    exec(logoutCmd, { timeout: 10000, windowsHide: true }, (error) => {
      if (error) {
        console.warn('[Ryvie][Main] Erreur logout NetBird (peut-etre deja deconnecte):', error.message);
      } else {
        console.log('[Ryvie][Main] NetBird deconnecte');
      }
      // On considere toujours le logout comme reussi
      resolve({ success: true });
    });
  });
}

// Connecte NetBird avec la setup key
function netbirdConnect(setupKey) {
  return new Promise((resolve) => {
    if (!IS_WINDOWS && !IS_MAC && !IS_LINUX) {
      console.warn('[Ryvie][Main] Plateforme non supportee pour NetBird connect:', process.platform);
      resolve({ success: false, error: 'Plateforme non supportee pour NetBird.' });
      return;
    }

    if (!isNetbirdInstalled()) {
      console.error('[Ryvie][Main] NetBird non installe');
      resolve({ success: false, error: 'NetBird non installe' });
      return;
    }
    
    console.log('[Ryvie][Main] Connexion NetBird...');
    const connectCmd = `"${NETBIRD_PATH}" up --management-url https://netbird.ryvie.fr --setup-key ${setupKey}`;
    
    exec(connectCmd, { timeout: 30000, windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        console.error('[Ryvie][Main] Erreur connexion NetBird:', error.message);
        if (stderr) console.error('[Ryvie][Main] Stderr:', stderr);
        resolve({ success: false, error: 'Erreur connexion' });
        return;
      }
      
      console.log('[Ryvie][Main] NetBird connecte avec succes');
      if (stdout) console.log('[Ryvie][Main] Stdout:', stdout.substring(0, 200));
      resolve({ success: true });
    });
  });
}

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
  console.log('[Ryvie][Main] Test connexion locale:', LOCAL_API_URL);
  
  return new Promise((resolve) => {
    // Utiliser curl PowerShell qui résout correctement ryvie.local via mDNS
    const curlCommand = `curl -s -m 5 "${LOCAL_API_URL}"`;
    
    exec(curlCommand, { timeout: 6000, windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        console.warn('[Ryvie][Main] Erreur curl:', error.code || error.message);
        resolve({ success: false });
        return;
      }

      if (stderr) {
        console.warn('[Ryvie][Main] Stderr curl:', stderr.substring(0, 100));
      }

      try {
        const data = JSON.parse(stdout);
        console.log('[Ryvie][Main] Donnees recues:', {
          success: data.success,
          ryvieId: data.ryvieId,
          hasDomains: !!data.domains
        });
        
        if (data && data.success && data.domains) {
          console.log('[Ryvie][Main] Connexion LOCALE reussie');
          resolve({
            success: true,
            data: {
              id: data.id,
              ryvieId: data.ryvieId,
              domains: data.domains,
              tunnelHost: data.tunnelHost,
              setupKey: data.setupKey
            }
          });
        } else {
          console.warn('[Ryvie][Main] Donnees invalides (pas de success/domains)');
          resolve({ success: false });
        }
      } catch (parseError) {
        console.error('[Ryvie][Main] Erreur parsing JSON:', parseError.message);
        console.error('[Ryvie][Main] Stdout recu:', stdout.substring(0, 200));
        resolve({ success: false });
      }
    });
  });
});

ipcMain.handle('open-url', async (event, url) => {
  try {
    console.log('[Ryvie][Main] Ouverture navigateur:', url);
    await shell.openExternal(url);
    return true;
  } catch (error) {
    console.error('[Ryvie][Main] Erreur ouverture URL:', error);
    return false;
  }
});

// IPC NETBIRD
ipcMain.handle('setup-netbird', async (event, setupKey) => {
  try {
    console.log('[Ryvie][Main] Setup NetBird demande');
    
    // Verifier si NetBird est installe
    if (!isNetbirdInstalled()) {
      console.log('[Ryvie][Main] NetBird non installe, installation en cours...');
      const installResult = await installNetbird();
      if (!installResult.success) {
        return { success: false, error: 'Installation NetBird echouee' };
      }
    }
    
    // Logout au cas ou
    await netbirdLogout();
    
    // Connexion avec la setup key
    const connectResult = await netbirdConnect(setupKey);
    return connectResult;
  } catch (error) {
    console.error('[Ryvie][Main] Erreur setup NetBird:', error);
    return { success: false, error: error.message };
  }
});
