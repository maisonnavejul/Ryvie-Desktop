const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  testLocalConnection: () => ipcRenderer.invoke('test-local-connection'),
  openUrl: (url) => ipcRenderer.invoke('open-url', url),
  setupNetbird: (setupKey) => ipcRenderer.invoke('setup-netbird', setupKey)
});
