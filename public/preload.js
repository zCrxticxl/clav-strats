const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  captureRegion: (rect) => ipcRenderer.invoke('capture-region', rect),
});
