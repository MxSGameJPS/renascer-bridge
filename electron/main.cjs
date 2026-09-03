const {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  safeStorage,
  Tray,
  Menu,
  nativeImage,
} = require("electron");
const path = require("node:path");
const { BridgeConfigStore } = require("./services/bridge-config.cjs");
const { BridgeApiClient } = require("./services/bridge-api-client.cjs");

const DEFAULT_SHORTCUT = "Control+Alt+R";
const shortcut = String(process.env.RENASCER_BRIDGE_SHORTCUT || DEFAULT_SHORTCUT).trim() || DEFAULT_SHORTCUT;
const TRAY_ICON_DATA_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAUUlEQVR4nGNUiHf5z0ABYKJEM1UMYMElcX/BbhS+YoIr8S5A14xLDKsBuBTikmMipICQIQMfC9Q1AFdU4VOD4QJ8hmCTw+oFbApxGcw49DMTAD6+GKX5LipgAAAAAElFTkSuQmCC";

const WINDOW_SIZES = Object.freeze({
  compact: { width: 520, height: 420 },
  config: { width: 580, height: 600 },
  expanded: { width: 760, height: 680 },
});

let bridgeWindow = null;
let bridgeTray = null;
let shortcutRegistered = false;
let configStore = null;
let apiClient = null;
let quitting = false;

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => showBridge());
}

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
    skipTaskbar: true,
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

  bridgeWindow.on("close", (event) => {
    if (quitting) return;
    event.preventDefault();
    hideBridge();
  });

  bridgeWindow.on("closed", () => {
    bridgeWindow = null;
  });
}

function showBridge() {
  if (!app.isReady()) return;
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

function createTray() {
  if (bridgeTray) return bridgeTray;
  const trayIcon = nativeImage.createFromDataURL(TRAY_ICON_DATA_URL);
  bridgeTray = new Tray(trayIcon);
  bridgeTray.setToolTip("Renascer Bridge");
  bridgeTray.setContextMenu(Menu.buildFromTemplate([
    {
      label: `Abrir Renascer Bridge (${shortcut})`,
      click: showBridge,
    },
    { type: "separator" },
    {
      label: "Sair",
      click: () => {
        quitting = true;
        app.quit();
      },
    },
  ]));
  bridgeTray.on("double-click", showBridge);
  return bridgeTray;
}

function enableWindowsStartup() {
  if (process.platform !== "win32" || !app.isPackaged) return;
  const executablePath = process.env.PORTABLE_EXECUTABLE_FILE || process.execPath;
  app.setLoginItemSettings({
    openAtLogin: true,
    path: executablePath,
    args: ["--background"],
  });
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
  createTray();
  registerShortcut();
  enableWindowsStartup();

  const launchedInBackground = process.argv.includes("--background");
  if (!launchedInBackground || !configStore.getStatus().configured) {
    showBridge();
  }

  app.on("activate", () => showBridge());
});

app.on("will-quit", () => {
  quitting = true;
  globalShortcut.unregisterAll();
  bridgeTray?.destroy();
  bridgeTray = null;
});

app.on("window-all-closed", () => {
  // No Windows o Bridge permanece residente na bandeja aguardando Ctrl + Alt + R.
});
