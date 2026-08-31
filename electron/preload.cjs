const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("renascer", {
  app: {
    info: () => ipcRenderer.invoke("app:info"),
  },
  bridge: {
    status: () => ipcRenderer.invoke("bridge:status"),
    config: () => ipcRenderer.invoke("bridge:config"),
    saveConfig: (input) => ipcRenderer.invoke("bridge:saveConfig", input),
    resolve: (code) => ipcRenderer.invoke("bridge:resolve", code),
    resize: (mode) => ipcRenderer.invoke("bridge:resize", mode),
    hide: () => ipcRenderer.invoke("bridge:hide"),
    onActivated: (callback) => {
      const handler = () => callback();
      ipcRenderer.on("bridge:activated", handler);
      return () => ipcRenderer.removeListener("bridge:activated", handler);
    },
  },
});
