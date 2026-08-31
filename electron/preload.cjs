const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("renascer", {
  app: {
    info: () => ipcRenderer.invoke("app:info"),
  },
  bridge: {
    status: () => ipcRenderer.invoke("bridge:status"),
    hide: () => ipcRenderer.invoke("bridge:hide"),
    onActivated: (callback) => {
      const handler = () => callback();
      ipcRenderer.on("bridge:activated", handler);
      return () => ipcRenderer.removeListener("bridge:activated", handler);
    },
  },
});
