const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("babySmashDesktop", {
  onOpenOptions: (handler) => {
    const listener = () => handler();
    ipcRenderer.on("babysmash:open-options", listener);
    return () => ipcRenderer.off("babysmash:open-options", listener);
  },
  setFullscreen: (enabled) => ipcRenderer.invoke("babysmash:toggle-fullscreen", enabled)
});
