const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    isElectron: true,
    platform: process.platform,
    openDataFolder: () => ipcRenderer.send('open-data-folder'),
    openResultsFolder: () => ipcRenderer.send('open-results-folder'),
    getVersion: () => ipcRenderer.invoke('get-app-version'),
});
