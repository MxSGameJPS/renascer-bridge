const { app, BrowserWindow, globalShortcut, ipcMain } = require("electron");
const path = require("node:path");

const DEFAULT_SHORTCUT = "F8";
const shortcut = String(process.env.RENASCER_BRIDGE_SHORTCUT || DEFAULT_SHORTCUT).trim() || DEFAULT_SHORTCUT;

let bridgeWindow = null;
let shortcutRegistered = false;

function createBridgeWindow() {
  bridgeWindow = new BrowserWindow({
    width: 520,
    height: 360,
    minWidth: 520,
    minHeight: 360,
    maxWidth: 520,
    maxHeight: 360,
    show: false,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    backgroundColor: "#f7f4ed",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    bridgeWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    bridgeWindow.loadFile(path.join(__dirname, "..", "dist", "renderer", "index.html"));
  }

  bridgeWindow.on("closed", () => {
    bridgeWindow = null;
  });
}

function showBridge() {
  if (!bridgeWindow || bridgeWindow.isDestroyed()) createBridgeWindow();
  bridgeWindow.center();
  bridgeWindow.show();
  bridgeWindow.focus();
  bridgeWindow.webContents.send("bridge:activated");
}

function hideBridge() {
  if (!bridgeWindow || bridgeWindow.isDestroyed()) return;
  bridgeWindow.hide();
}

function registerShortcut() {
  shortcutRegistered = globalShortcut.register(shortcut, showBridge);
  return shortcutRegistered;
}

function registerIpcHandlers() {
  ipcMain.handle("app:info", () => ({
    version: app.getVersion(),
    platform: process.platform,
  }));

  ipcMain.handle("bridge:status", () => ({
    shortcut,
    shortcutRegistered,
  }));

  ipcMain.handle("bridge:hide", () => {
    hideBridge();
    return true;
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createBridgeWindow();
  registerShortcut();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createBridgeWindow();
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
