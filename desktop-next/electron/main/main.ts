import { app, BrowserWindow } from "electron";
import path from "node:path";
import { registerIpcHandlers } from "./ipc";
import { ensureSuperAdminUser } from "../../backend/services/authService";

function resolveDbPath() {
  if (process.env.POS_DB_PATH) {
    return process.env.POS_DB_PATH;
  }
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "database", "pos.db");
  }
  return path.resolve(process.cwd(), "../database/pos.db");
}

function resolvePrintRootPath() {
  if (process.env.POS_PRINT_DIR) {
    return process.env.POS_PRINT_DIR;
  }
  if (app.isPackaged) {
    return path.join(app.getPath("documents"), "SmartRetailPOSNext", "printouts");
  }
  return path.resolve(process.cwd(), "../printouts");
}

function resolveInventoryExportRootPath() {
  if (process.env.POS_INVENTORY_EXPORT_DIR) {
    return process.env.POS_INVENTORY_EXPORT_DIR;
  }
  if (app.isPackaged) {
    return path.join(app.getPath("documents"), "SmartRetailPOSNext", "inventory_exports");
  }
  return path.resolve(process.cwd(), "../inventory_exports");
}

function resolvePreloadPath() {
  if (process.env.VITE_DEV_SERVER_URL) {
    return path.resolve(process.cwd(), "dist-electron", "preload.cjs");
  }
  if (app.isPackaged) {
    return path.join(app.getAppPath(), "dist-electron", "preload.cjs");
  }
  return path.resolve(process.cwd(), "dist-electron", "preload.cjs");
}

function resolveRendererIndexPath() {
  if (app.isPackaged) {
    return path.join(app.getAppPath(), "dist", "index.html");
  }
  return path.resolve(process.cwd(), "dist", "index.html");
}

function resolveWindowIconPath() {
  if (app.isPackaged) {
    return path.join(app.getAppPath(), "build", "icon.png");
  }
  return path.resolve(process.cwd(), "build", "icon.png");
}

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1160,
    minHeight: 760,
    title: "Smart Retail POS Next",
    icon: resolveWindowIconPath(),
    webPreferences: {
      preload: resolvePreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const devServer = process.env.VITE_DEV_SERVER_URL;
  if (devServer) {
    win.loadURL(devServer);
    if (process.env.POS_OPEN_DEVTOOLS === "1") {
      win.webContents.openDevTools({ mode: "detach" });
    }
    return;
  }

  const rendererIndex = resolveRendererIndexPath();
  win.loadFile(rendererIndex);
}

app.whenReady().then(() => {
  process.env.POS_DB_PATH = resolveDbPath();
  process.env.POS_PRINT_DIR = resolvePrintRootPath();
  process.env.POS_INVENTORY_EXPORT_DIR = resolveInventoryExportRootPath();
  ensureSuperAdminUser();
  registerIpcHandlers();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
