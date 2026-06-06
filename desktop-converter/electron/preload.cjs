const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('genesisConverter', {
  pickZip: () => ipcRenderer.invoke('pick-genesis-zip'),
  convertZip: (zipPath) => ipcRenderer.invoke('convert-genesis-zip', zipPath),
  saveBundle: (sourcePath, bundle) => ipcRenderer.invoke('save-genesis-bundle', { sourcePath, bundle }),
});
