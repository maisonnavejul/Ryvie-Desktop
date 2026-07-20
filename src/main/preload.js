const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  testLocalConnection: () => ipcRenderer.invoke('test-local-connection'),
  testMachineId: () => ipcRenderer.invoke('test-machine-id'),
  authenticate: (credentials) => ipcRenderer.invoke('authenticate', credentials),
  getDomains: (token) => ipcRenderer.invoke('get-domains', token),
  openUrl: (url) => ipcRenderer.invoke('open-url', url),
  setupNetbird: (setupKey, tunnelHost) => ipcRenderer.invoke('setup-netbird', setupKey, tunnelHost),
  netbirdStatus: () => ipcRenderer.invoke('netbird-status'),
  disconnect: () => ipcRenderer.invoke('disconnect'),
  navigateTo: (page) => ipcRenderer.invoke('navigate-to', page),
  onNetbirdStatus: (callback) => ipcRenderer.on('netbird-status-update', (event, status) => callback(status)),
  startUpdate: () => ipcRenderer.invoke('start-update'),
  skipUpdate: () => ipcRenderer.invoke('skip-update'),
  
  // API de mise à jour
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (event, info) => callback(info)),
  onDownloadProgress: (callback) => ipcRenderer.on('download-progress', (event, progress) => callback(progress)),
  onUpdateDownloaded: (callback) => ipcRenderer.on('update-downloaded', (event, info) => callback(info)),
  onUpdateError: (callback) => ipcRenderer.on('update-error', (event, error) => callback(error)),
  onUpdateStatus: (callback) => ipcRenderer.on('update-status', (event, status) => callback(status)),
  
  // API langue (i18n)
  getLanguage: () => ipcRenderer.invoke('get-language'),
  setLanguage: (language) => ipcRenderer.invoke('set-language', language),

  // API first-time setup
  checkFirstTime: () => ipcRenderer.invoke('check-first-time'),
  createFirstUser: (userData) => ipcRenderer.invoke('create-first-user', userData),
  
  // API multi-utilisateurs
  getAllUsers: () => ipcRenderer.invoke('get-all-users'),
  saveUserConfig: (userConfig, setCurrent) => ipcRenderer.invoke('save-user-config', userConfig, setCurrent),
  switchUser: (userKey) => ipcRenderer.invoke('switch-user', userKey),
  getCurrentUser: () => ipcRenderer.invoke('get-current-user'),
  removeUser: (userKey) => ipcRenderer.invoke('remove-user', userKey),
  renameUser: (userKey, newName) => ipcRenderer.invoke('rename-user', userKey, newName)
});
