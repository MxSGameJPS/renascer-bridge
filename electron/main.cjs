const { app, BrowserWindow, globalShortcut, ipcMain, safeStorage } = require("electron");
const path = require("node:path");
const { BridgeConfigStore } = require("./services/bridge-config.cjs");
const { BridgeApiClient } = require("./services/bridge-api-client.cjs");

const DEFAULT_SHORTCUT = "F8";
const shortcut = String(process.env.RENASCER_BRIDGE_SHORTCUT || DEFAULT_SHORTCUT).trim() || DEFAULT_SHORTCUT;

const WINDOW_SIZES = Object.freeze({
  compact: { width: 520, height: 420 },
  config: { width: 580, height: 540 },
  expanded: { width: 760, height: 680 },
});

let bridgeWindow = null;
let shortcutRegistered = false;
let configStore = null;
let apiClient = null;

function resizeBridge(mode = "compact") {
  const size = WINDOW_SIZES[mode] || WINDOW_SIZES.compact;
  if (!bridgeWindow || bridgeWindow.isDestroyed()) return size;
  bridgeWindow.setSize(size.width, size.height, true);
  bridgeWindow.center();
  return size;
}

function createBridgeWindow() {
  bridgeWindow = new BrowserWindow({
    width: WINDOW_SIZES.compact.width,
    height: WINDOW_SIZES.compact.height,
    minWidth: WINDOW_SIZES.compact.width,
    minHeight: WINDOW_SIZES.compact.height,
    maxWidth: WINDOW_SIZES.expanded.width,
    maxHeight: WINDOW_SIZES.expanded.height,
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
      devTools: Boolean(process.env.VITE_DEV_SERVER_URL),
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
  resizeBridge("compact");
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

function serializeError(error) {
  return {
    message: error?.message || "Não foi possível concluir a operação.",
    code: error?.code || "BRIDGE_ERROR",
    status: Number(error?.status || 0),
    retryable: Boolean(error?.retryable),
  };
}

function registerIpcHandlers() {
  ipcMain.handle("app:info", () => ({
    version: app.getVersion(),
    platform: process.platform,
  }));

  ipcMain.handle("bridge:status", () => ({
    shortcut,
    shortcutRegistered,
    config: configStore.getStatus(),
  }));

  ipcMain.handle("bridge:config", () => configStore.getStatus());

  ipcMain.handle("bridge:saveConfig", (_event, input = {}) => {
    try {
      return { ok: true, data: configStore.save(input) };
    } catch (error) {
      return { ok: false, error: serializeError(error) };
    }
  });

  ipcMain.handle("bridge:resolve", async (_event, code) => {
    try {
      const data = await apiClient.resolveReference(code);
      resizeBridge("expanded");
      return { ok: true, data };
    } catch (error) {
      return { ok: false, error: serializeError(error) };
    }
  });

  ipcMain.handle("bridge:resize", (_event, mode) => resizeBridge(mode));

  ipcMain.handle("bridge:hide", () => {
    hideBridge();
    return true;
  });
}

app.whenReady().then(() => {
  configStore = new BridgeConfigStore({ app, safeStorage });
  apiClient = new BridgeApiClient(configStore);
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
