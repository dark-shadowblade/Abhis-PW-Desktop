const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('studyDownloads', {
  start: task => ipcRenderer.invoke('download:start', task),
  pause: id => ipcRenderer.invoke('download:pause', id),
  resume: id => ipcRenderer.invoke('download:resume', id),
  cancel: id => ipcRenderer.invoke('download:cancel', id),
  onProgress: callback => ipcRenderer.on('download:progress', (_event, data) => callback(data)),
  onDone: callback => ipcRenderer.on('download:done', (_event, data) => callback(data))
});
