const { app, BrowserWindow, ipcMain, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

// Désactiver l'accélération GPU pour éviter les erreurs sur certains systèmes
app.disableHardwareAcceleration();

const CONFIG_FILE = path.join(app.getPath('userData'), 'ryvie-config.json');
const LOCAL_MACHINE_ID_URL = 'http://ryvie.local:3002/api/machine-id';
const LOCAL_AUTH_URL = 'http://ryvie.local:3002/api/authenticate';
const LOCAL_DOMAINS_URL = 'http://ryvie.local:3002/api/settings/ryvie-domains';
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
let updateInProgress = false;
let updateInfo = null;
let updateUserChoiceMade = false;

// Configuration de l'auto-updater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

// Logs pour le débogage
autoUpdater.logger = require('electron-log');
autoUpdater.logger.transports.file.level = 'info';

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
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
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

  // Vérifier si une config existe pour déterminer quelle page charger
  let hasConfig = false;
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      const config = JSON.parse(data);
      hasConfig = config && (config.ryvieId || config.setupKey);
    }
  } catch (error) {
    console.error('[Ryvie][Main] Erreur lecture config:', error);
  }

  // Charger la page appropriée
  const pageToLoad = hasConfig ? 'index.html' : 'login.html';
  console.log('[Ryvie][Main] Chargement de la page:', pageToLoad);
  mainWindow.loadFile(path.join(__dirname, '../renderer/' + pageToLoad));
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
    
    // Vérifier les mises à jour AVANT d'ouvrir la fenêtre principale
    if (!app.isPackaged) {
      console.log('[Ryvie][Main] Mode développement, pas de vérification de mise à jour');
      setTimeout(() => {
        createMain();
      }, 1500);
    } else {
      console.log('[Ryvie][Main] Vérification des mises à jour au démarrage...');
      checkForUpdates();
    }

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
// AUTO-UPDATER FUNCTIONS
// ========================================

function checkForUpdates() {
  console.log('[Ryvie][Main] Vérification des mises à jour...');
  autoUpdater.checkForUpdates().catch(err => {
    console.error('[Ryvie][Main] Erreur lors de la vérification des mises à jour:', err);
  });
}

// IPC SPLASH UPDATE CHOICE
ipcMain.handle('start-update', async () => {
  try {
    updateUserChoiceMade = true;
    if (!updateInfo) {
      return { success: false, error: 'Aucune mise à jour détectée' };
    }
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.webContents.send('update-status', {
        status: 'downloading',
        message: `Téléchargement de la version ${updateInfo.version}...`,
        percent: 0
      });
    }
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (error) {
    console.error('[Ryvie][Main] Erreur start-update:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('skip-update', async () => {
  updateUserChoiceMade = true;
  // Ouvrir la fenêtre principale (pas de mise à jour maintenant)
  if (!mainWindow) {
    createMain();
  }
  return { success: true };
});

autoUpdater.on('checking-for-update', () => {
  console.log('[Ryvie][Main] Vérification des mises à jour en cours...');
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send('update-status', { status: 'checking', message: 'Vérification des mises à jour...' });
  }
});

autoUpdater.on('update-available', (info) => {
  console.log('[Ryvie][Main] Mise à jour disponible:', info.version);
  updateInProgress = true;
  updateInfo = info;
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send('update-status', { 
      status: 'available',
      message: `Mise à jour disponible : ${info.version}`,
      version: info.version
    });
  }
});

autoUpdater.on('update-not-available', (info) => {
  console.log('[Ryvie][Main] Aucune mise à jour disponible. Version actuelle:', info.version);
  // Pas de mise à jour, ouvrir la fenêtre principale normalement
  setTimeout(() => {
    createMain();
  }, 1000);
});

autoUpdater.on('error', (err) => {
  console.error('[Ryvie][Main] Erreur auto-updater:', err);
  updateInProgress = false;
  // En cas d'erreur, ouvrir quand même la fenêtre principale
  if (!mainWindow) {
    setTimeout(() => {
      createMain();
    }, 1000);
  }
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send('update-status', { status: 'error', message: 'Erreur lors de la mise à jour' });
  }
});

autoUpdater.on('download-progress', (progressObj) => {
  console.log(`[Ryvie][Main] Téléchargement: ${Math.round(progressObj.percent)}%`);
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send('update-status', {
      status: 'downloading',
      message: `Téléchargement en cours...`,
      percent: progressObj.percent
    });
  }
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('[Ryvie][Main] Mise à jour téléchargée:', info.version);
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send('update-status', {
      status: 'installing',
      message: 'Installation en cours...'
    });
  }
  // Installer et redémarrer automatiquement immédiatement
  setTimeout(() => {
    console.log('[Ryvie][Main] Installation et redémarrage...');
    // isSilent=true pour éviter l'affichage de l'installateur, isForceRunAfter=true pour relancer l'app
    autoUpdater.quitAndInstall(true, true);
  }, 1500);
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
    } else if (IS_MAC) {
      // Installation macOS avec popup graphique pour le mot de passe admin
      console.log('[Ryvie][Main] Installation de NetBird (macOS)...');
      
      // Utiliser osascript pour demander le mot de passe avec une popup graphique
      // puis exécuter le script d'installation avec sudo
      const installCmd = `osascript -e 'do shell script "curl -fsSL ${NETBIRD_INSTALLER_URL} | sh" with administrator privileges'`;
      
      exec(installCmd, { timeout: 120000 }, (installError, stdout, stderr) => {
        if (installError) {
          console.error('[Ryvie][Main] Erreur installation NetBird:', installError.message);
          if (stderr) console.error('[Ryvie][Main] Stderr:', stderr);
          resolve({ success: false, error: 'Installation annulée ou échouée' });
          return;
        }
        
        console.log('[Ryvie][Main] NetBird installé avec succès');
        if (stdout) console.log('[Ryvie][Main] Stdout:', stdout.substring(0, 200));
        
        // Attendre un peu que l'installation se finalise
        setTimeout(() => {
          resolve({ success: true });
        }, 3000);
      });
    } else {
      // Installation Linux via script officiel
      console.log('[Ryvie][Main] Installation de NetBird (Linux)...');
      
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

// Attend que les peers NetBird se connectent (avec timeout)
async function waitForNetbirdPeers(maxWaitSeconds = 15) {
  console.log('[Ryvie][Main] Attente de la connexion des peers NetBird...');
  const startTime = Date.now();
  const maxWaitMs = maxWaitSeconds * 1000;
  
  // Envoyer un événement initial "connexion en cours"
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('netbird-status-update', {
      status: 'connecting',
      message: 'Connexion en cours...',
      peersCount: 0
    });
  }
  
  while (Date.now() - startTime < maxWaitMs) {
    const status = await netbirdStatus();
    
    // Envoyer une mise à jour de statut au renderer
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('netbird-status-update', {
        status: 'connecting',
        message: 'Connexion en cours...',
        peersCount: status.peersCount || 0,
        connected: status.connected
      });
    }
    
    if (status.connected && status.peersCount > 0) {
      console.log(`[Ryvie][Main] ✅ Peers connectés: ${status.peersCount}`);
      
      // Envoyer un événement de succès
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('netbird-status-update', {
          status: 'connected',
          message: 'Connecté',
          peersCount: status.peersCount
        });
      }
      
      return { success: true, peersCount: status.peersCount };
    }
    
    // Attendre 1 seconde avant de réessayer
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.warn('[Ryvie][Main] ⚠️ Timeout: aucun peer connecté après', maxWaitSeconds, 'secondes');
  
  // Envoyer un événement d'échec
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('netbird-status-update', {
      status: 'timeout',
      message: 'Timeout',
      peersCount: 0
    });
  }
  
  return { success: false, error: 'Aucun peer connecté' };
}

// Verifie le statut de connexion NetBird
function netbirdStatus() {
  return new Promise((resolve) => {
    if (!IS_WINDOWS && !IS_MAC && !IS_LINUX) {
      resolve({ success: false, connected: false, error: 'Plateforme non supportee' });
      return;
    }

    if (!isNetbirdInstalled()) {
      resolve({ success: true, connected: false, installed: false });
      return;
    }
    
    const statusCmd = `"${NETBIRD_PATH}" status`;
    
    exec(statusCmd, { timeout: 5000, windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        // Si erreur, considérer comme déconnecté
        console.log('[Ryvie][Main] Erreur netbird status:', error.message);
        resolve({ success: true, connected: false, installed: true });
        return;
      }
      
      // Analyser la sortie pour déterminer si connecté
      // Vérifier Management et Signal
      const managementLine = stdout.split('\n').find(line => line.toLowerCase().includes('management:'));
      const signalLine = stdout.split('\n').find(line => line.toLowerCase().includes('signal:'));
      
      const managementConnected = managementLine && 
        !managementLine.toLowerCase().includes('disconnected') &&
        managementLine.toLowerCase().includes('connected');
      const signalConnected = signalLine && 
        !signalLine.toLowerCase().includes('disconnected') &&
        signalLine.toLowerCase().includes('connected');
      
      // Vérifier aussi s'il y a des peers connectés
      // Format: "Peers count: X/Y Connected" où X est le nombre de peers connectés
      const peersMatch = stdout.match(/peers count:\s*(\d+)\/\d+/i);
      const peersCount = peersMatch ? parseInt(peersMatch[1], 10) : 0;
      
      console.log('[Ryvie][Main] NetBird status - Management:', managementConnected, '- Signal:', signalConnected, '- Peers:', peersCount);
      
      // Considérer comme vraiment connecté seulement si Management ET Signal connectés ET au moins 1 peer
      const reallyConnected = managementConnected && signalConnected && peersCount > 0;
      
      resolve({ 
        success: true, 
        connected: reallyConnected,
        installed: true,
        peersCount: peersCount,
        output: stdout.substring(0, 300)
      });
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

// Test machine ID locale
ipcMain.handle('test-machine-id', async () => {
  console.log('[Ryvie][Main] Test machine ID:', LOCAL_MACHINE_ID_URL);
  
  return new Promise((resolve) => {
    const curlCommand = `curl -s -m 2 "${LOCAL_MACHINE_ID_URL}"`;
    
    exec(curlCommand, { timeout: 3000, windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        console.warn('[Ryvie][Main] Erreur curl machine ID:', error.code || error.message);
        resolve({ success: false });
        return;
      }

      try {
        const data = JSON.parse(stdout);
        console.log('[Ryvie][Main] Machine ID recu:', data.ryvieId);
        
        if (data && data.success && data.ryvieId) {
          resolve({
            success: true,
            ryvieId: data.ryvieId
          });
        } else {
          console.warn('[Ryvie][Main] Donnees machine ID invalides');
          resolve({ success: false });
        }
      } catch (parseError) {
        console.error('[Ryvie][Main] Erreur parsing JSON machine ID:', parseError.message);
        resolve({ success: false });
      }
    });
  });
});

// Authentification JWT
ipcMain.handle('authenticate', async (event, credentials) => {
  console.log('[Ryvie][Main] Authentification avec uid:', credentials.uid);
  
  return new Promise((resolve) => {
    const authData = JSON.stringify({
      uid: credentials.uid,
      password: credentials.password
    });
    
    // Échapper les guillemets pour PowerShell
    const escapedData = authData.replace(/"/g, '\\"');
    const curlCommand = `curl -s -m 5 -X POST "${LOCAL_AUTH_URL}" -H "Content-Type: application/json" -d "${escapedData}"`;
    
    console.log('[Ryvie][Main] Commande curl:', curlCommand);
    
    exec(curlCommand, { timeout: 6000, windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        console.error('[Ryvie][Main] Erreur authentification:', error.message);
        resolve({ success: false, error: 'Erreur de connexion' });
        return;
      }

      console.log('[Ryvie][Main] Reponse brute:', stdout.substring(0, 200));

      try {
        const data = JSON.parse(stdout);
        
        if (data && data.token) {
          console.log('[Ryvie][Main] Authentification reussie');
          resolve({
            success: true,
            token: data.token
          });
        } else {
          console.warn('[Ryvie][Main] Authentification echouee');
          resolve({ success: false, error: 'Identifiants incorrects' });
        }
      } catch (parseError) {
        console.error('[Ryvie][Main] Erreur parsing reponse auth:', parseError.message);
        console.error('[Ryvie][Main] Stdout complet:', stdout);
        resolve({ success: false, error: 'Erreur serveur' });
      }
    });
  });
});

// Recuperer les domaines avec JWT
ipcMain.handle('get-domains', async (event, token) => {
  console.log('[Ryvie][Main] Recuperation domaines avec JWT');
  
  return new Promise((resolve) => {
    const curlCommand = `curl -s -m 5 "${LOCAL_DOMAINS_URL}" -H "Authorization: Bearer ${token}"`;
    
    exec(curlCommand, { timeout: 6000, windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        console.error('[Ryvie][Main] Erreur recuperation domaines:', error.message);
        resolve({ success: false });
        return;
      }

      try {
        const data = JSON.parse(stdout);
        
        if (data && data.success && data.domains) {
          console.log('[Ryvie][Main] Domaines recuperes avec succes');
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
          console.warn('[Ryvie][Main] Donnees domaines invalides');
          resolve({ success: false });
        }
      } catch (parseError) {
        console.error('[Ryvie][Main] Erreur parsing domaines:', parseError.message);
        resolve({ success: false });
      }
    });
  });
});

// Test connexion locale via curl PowerShell (seul moyen de résoudre ryvie.local sur Windows)
ipcMain.handle('test-local-connection', async () => {
  console.log('[Ryvie][Main] Test connexion locale (deprecated):', LOCAL_DOMAINS_URL);
  
  return new Promise((resolve) => {
    // Utiliser curl PowerShell qui résout correctement ryvie.local via mDNS
    const curlCommand = `curl -s -m 5 "${LOCAL_DOMAINS_URL}"`;
    
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

// IPC AUTO-UPDATER
ipcMain.handle('download-update', async () => {
  try {
    console.log('[Ryvie][Main] Téléchargement de la mise à jour...');
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (error) {
    console.error('[Ryvie][Main] Erreur téléchargement mise à jour:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('install-update', async () => {
  try {
    console.log('[Ryvie][Main] Installation de la mise à jour...');
    autoUpdater.quitAndInstall(false, true);
    return { success: true };
  } catch (error) {
    console.error('[Ryvie][Main] Erreur installation mise à jour:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('check-for-updates', async () => {
  try {
    console.log('[Ryvie][Main] Vérification manuelle des mises à jour...');
    const result = await autoUpdater.checkForUpdates();
    return { success: true, updateInfo: result.updateInfo };
  } catch (error) {
    console.error('[Ryvie][Main] Erreur vérification mise à jour:', error);
    return { success: false, error: error.message };
  }
});

// IPC NETBIRD
ipcMain.handle('setup-netbird', async (event, setupKey, tunnelHost) => {
  try {
    console.log('[Ryvie][Main] Setup NetBird demande');
    console.log('[Ryvie][Main] setupKey:', setupKey ? 'présent' : 'absent');
    console.log('[Ryvie][Main] tunnelHost:', tunnelHost || 'non fourni');
    
    // Vérifier d'abord si NetBird est déjà connecté
    if (isNetbirdInstalled()) {
      const currentStatus = await netbirdStatus();
      console.log('[Ryvie][Main] Statut NetBird actuel:', currentStatus.connected ? 'connecté' : 'déconnecté');
      console.log('[Ryvie][Main] Peers count:', currentStatus.peersCount || 0);
      
      if (currentStatus.connected) {
        // NetBird déjà connecté, vérifier si le tunnel fonctionne
        if (tunnelHost) {
          const statusUrl = `http://${tunnelHost}:3002/status`;
          console.log('[Ryvie][Main] Verification tunnel:', statusUrl);
          
          // Envoyer un événement de vérification
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('netbird-status-update', {
              status: 'connecting',
              message: 'Connexion en cours...',
              peersCount: currentStatus.peersCount || 0
            });
          }
          
          const checkTunnel = () => {
            return new Promise((resolve) => {
              const curlCommand = `curl -s -m 3 "${statusUrl}"`;
              
              exec(curlCommand, { timeout: 4000, windowsHide: true }, (error, stdout, stderr) => {
                if (error) {
                  console.log('[Ryvie][Main] ❌ Tunnel non accessible:', error.message);
                  resolve({ accessible: false });
                  return;
                }
                
                try {
                  const data = JSON.parse(stdout);
                  if (data && data.message === 'Server is running') {
                    console.log('[Ryvie][Main] ✅ Tunnel déjà accessible, pas besoin de reconfigurer NetBird');
                    resolve({ accessible: true });
                  } else {
                    console.log('[Ryvie][Main] ❌ Réponse tunnel invalide');
                    resolve({ accessible: false });
                  }
                } catch (parseError) {
                  console.log('[Ryvie][Main] ❌ Erreur parsing status tunnel:', parseError.message);
                  resolve({ accessible: false });
                }
              });
            });
          };
          
          const tunnelCheck = await checkTunnel();
          if (tunnelCheck.accessible) {
            // Tunnel déjà fonctionnel, pas besoin de reconfigurer
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('netbird-status-update', {
                status: 'connected',
                message: 'Actif',
                peersCount: currentStatus.peersCount || 0
              });
            }
            return { success: true, alreadyConnected: true };
          } else {
            console.log('[Ryvie][Main] ⚠️ Tunnel non accessible malgré NetBird connecté, reconfiguration nécessaire');
          }
        } else {
          // Pas de tunnelHost fourni, mais NetBird est connecté
          // On ne peut pas vérifier le tunnel sans l'IP, donc on considère que c'est OK
          console.log('[Ryvie][Main] ⚠️ NetBird connecté mais tunnelHost non fourni, impossible de vérifier le tunnel');
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('netbird-status-update', {
              status: 'connected',
              message: 'Actif',
              peersCount: currentStatus.peersCount || 0
            });
          }
          return { success: true, alreadyConnected: true };
        }
      } else {
        console.log('[Ryvie][Main] ❌ NetBird non connecté ou aucun peer accessible');
      }
    }
    
    // Verifier si NetBird est installe
    if (!isNetbirdInstalled()) {
      console.log('[Ryvie][Main] NetBird non installe, installation en cours...');
      
      // Envoyer un événement d'installation
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('netbird-status-update', {
          status: 'connecting',
          message: 'Connexion en cours...',
          peersCount: 0
        });
      }
      
      const installResult = await installNetbird();
      if (!installResult.success) {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('netbird-status-update', {
            status: 'error',
            message: 'Erreur d\'installation',
            peersCount: 0
          });
        }
        return { success: false, error: 'Installation NetBird echouee' };
      }
    }
    
    // Logout au cas ou
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('netbird-status-update', {
        status: 'connecting',
        message: 'Connexion en cours...',
        peersCount: 0
      });
    }
    await netbirdLogout();
    
    // Connexion avec la setup key
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('netbird-status-update', {
        status: 'connecting',
        message: 'Connexion en cours...',
        peersCount: 0
      });
    }
    const connectResult = await netbirdConnect(setupKey);
    if (!connectResult.success) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('netbird-status-update', {
          status: 'error',
          message: 'Erreur de connexion',
          peersCount: 0
        });
      }
      return connectResult;
    }
    
    // Attendre que les peers se connectent
    const peersResult = await waitForNetbirdPeers(15);
    if (!peersResult.success) {
      console.warn('[Ryvie][Main] ⚠️ NetBird connecté mais aucun peer accessible');
      // On retourne quand même success car NetBird est connecté
      // mais on ajoute un warning
      return { success: true, warning: 'Aucun peer connecté' };
    }
    
    return { success: true, peersCount: peersResult.peersCount };
  } catch (error) {
    console.error('[Ryvie][Main] Erreur setup NetBird:', error);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('netbird-status-update', {
        status: 'error',
        message: 'Erreur',
        peersCount: 0
      });
    }
    return { success: false, error: error.message };
  }
});

// IPC NETBIRD STATUS
ipcMain.handle('netbird-status', async () => {
  try {
    const status = await netbirdStatus();
    return status;
  } catch (error) {
    console.error('[Ryvie][Main] Erreur statut NetBird:', error);
    return { success: false, connected: false, error: error.message };
  }
});

// IPC DISCONNECT
ipcMain.handle('disconnect', async () => {
  try {
    console.log('[Ryvie][Main] Deconnexion demandee');
    
    // Deconnecter NetBird
    await netbirdLogout();
    
    // Supprimer la configuration
    if (fs.existsSync(CONFIG_FILE)) {
      fs.unlinkSync(CONFIG_FILE);
      console.log('[Ryvie][Main] Configuration supprimee');
    }
    
    console.log('[Ryvie][Main] Deconnexion reussie');
    return { success: true };
  } catch (error) {
    console.error('[Ryvie][Main] Erreur deconnexion:', error);
    return { success: false, error: error.message };
  }
});
