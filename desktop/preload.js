const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("voxDesktop", {
  getSettings: () => ipcRenderer.invoke("vox:settings:get"),
  getGpuStatus: () => ipcRenderer.invoke("vox:gpu:status"),
  updateSettings: (patch) => ipcRenderer.invoke("vox:settings:update", patch),
  checkForUpdates: () => ipcRenderer.invoke("vox:updates:check"),
  getUpdateInfo: () => ipcRenderer.invoke("vox:updates:info"),
  openReleases: () => ipcRenderer.invoke("vox:updates:open-releases"),
  onUpdateStatus: (callback) => {
    if (typeof callback !== "function") return () => {};
    const listener = (_event, value) => callback(value);
    ipcRenderer.on("vox:updates:status", listener);
    return () => ipcRenderer.removeListener("vox:updates:status", listener);
  },
  restart: () => ipcRenderer.invoke("vox:restart"),
  onSettingsSync: (callback) => {
    if (typeof callback !== "function") return () => {};
    const listener = (_event, value) => callback(value);
    ipcRenderer.on("vox:settings:sync", listener);
    return () => ipcRenderer.removeListener("vox:settings:sync", listener);
  }
});
