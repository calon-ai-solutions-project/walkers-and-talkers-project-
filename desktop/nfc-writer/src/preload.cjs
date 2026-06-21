const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("nfc", {
  onStatus: (cb) => ipcRenderer.on("status", (_e, data) => cb(data)),
  manualWrite: (args) => ipcRenderer.invoke("manual-write", args),
});
