const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('foxy', {
  isDesktop: true,
  getDisplays: () => ipcRenderer.invoke('foxy:get-displays'),
  showScare: (payload) => ipcRenderer.invoke('foxy:show-scare', payload),
  closeScare: () => ipcRenderer.invoke('foxy:close-scare'),
  consumeScarePayload: () => ipcRenderer.invoke('foxy:consume-scare-payload'),
  finishScare: () => ipcRenderer.send('foxy:scare-renderer-finished'),
  onScareFinished: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('foxy:scare-finished', listener);
    return () => ipcRenderer.removeListener('foxy:scare-finished', listener);
  },
});
