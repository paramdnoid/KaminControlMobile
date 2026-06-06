const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('genesisConverter', {
  pickZip: () => ipcRenderer.invoke('pick-genesis-zip'),
  convertZip: (zipPath) => ipcRenderer.invoke('convert-genesis-zip', zipPath),
  saveExportFolder: (sourcePath, bundle) => ipcRenderer.invoke('save-genesis-export-folder', { sourcePath, bundle }),
  saveTransportZip: (sourcePath, bundle) => ipcRenderer.invoke('save-genesis-transport-zip', { sourcePath, bundle }),
});
