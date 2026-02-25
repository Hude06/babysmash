const path = require("node:path");
const { app, BrowserWindow, globalShortcut, ipcMain } = require("electron");

let mainWindow;

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

app.on("second-instance", () => {
  if (mainWindow) {
    mainWindow.focus();
  }
});

app.whenReady().then(() => {
  mainWindow = createMainWindow();

  globalShortcut.register("CommandOrControl+Shift+Alt+O", () => {
    mainWindow?.webContents.send("babysmash:open-options");
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  globalShortcut.unregisterAll();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("babysmash:toggle-fullscreen", (_, enabled) => {
  if (mainWindow) {
    mainWindow.setFullScreen(Boolean(enabled));
  }
});

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: "#dff5eb",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js")
    }
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    win.loadURL(devUrl);
  } else {
    const entry = path.join(__dirname, "..", "web-dist", "index.html");
    win.loadFile(entry);
  }

  win.maximize();
  win.setFullScreen(true);
  return win;
}
