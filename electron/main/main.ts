import { app, BrowserWindow } from "electron";
import fs from "node:fs";
import path from "node:path";
import { registerIpcHandlers } from "./ipc";
import { ensureSuperAdminUser } from "../../backend/services/authService";

function resolveProjectRoot() {
  const cwd = process.cwd();
  const parent = path.resolve(cwd, "..");

  if (fs.existsSync(path.join(cwd, "package.json")) && fs.existsSync(path.join(cwd, "electron"))) {
    return cwd;
  }

  if (fs.existsSync(path.join(parent, "package.json")) && fs.existsSync(path.join(parent, "electron"))) {
    return parent;
  }

  return cwd;
}

function resolveDbPath() {
  if (process.env.POS_DB_PATH) {
    return process.env.POS_DB_PATH;
  }
  if (app.isPackaged) {
    return path.join(app.getPath("documents"), "SmartRetailPOSNext", "database", "pos.db");
  }
  const projectRoot = resolveProjectRoot();
  return path.join(projectRoot, "backend", "db", "pos.db");
}

function resolvePrintRootPath() {
  if (process.env.POS_PRINT_DIR) {
    return process.env.POS_PRINT_DIR;
  }
  if (app.isPackaged) {
    return path.join(app.getPath("documents"), "SmartRetailPOSNext", "printouts");
  }
  const projectRoot = resolveProjectRoot();
  return path.join(projectRoot, "printouts");
}

function resolveInventoryExportRootPath() {
  if (process.env.POS_INVENTORY_EXPORT_DIR) {
    return process.env.POS_INVENTORY_EXPORT_DIR;
  }
  if (app.isPackaged) {
    return path.join(app.getPath("documents"), "SmartRetailPOSNext", "inventory_exports");
  }
  const projectRoot = resolveProjectRoot();
  return path.join(projectRoot, "inventory_exports");
}

function resolvePreloadPath() {
  const projectRoot = resolveProjectRoot();
  if (process.env.VITE_DEV_SERVER_URL) {
    return path.join(projectRoot, "dist-electron", "preload.cjs");
  }
  if (app.isPackaged) {
    return path.join(app.getAppPath(), "dist-electron", "preload.cjs");
  }
  return path.join(projectRoot, "dist-electron", "preload.cjs");
}

function resolveRendererIndexPath() {
  const projectRoot = resolveProjectRoot();
  if (app.isPackaged) {
    return path.join(app.getAppPath(), "dist", "index.html");
  }
  return path.join(projectRoot, "dist", "index.html");
}

function resolveWindowIconPath() {
  const projectRoot = resolveProjectRoot();
  if (process.platform === "win32") {
    if (app.isPackaged) {
      const resourceIcon = path.join(process.resourcesPath, "build", "icon.ico");
      if (fs.existsSync(resourceIcon)) {
        return resourceIcon;
      }
      return path.join(app.getAppPath(), "build", "icon.ico");
    }
    return path.join(projectRoot, "build", "icon.ico");
  }

  if (app.isPackaged) {
    return path.join(app.getAppPath(), "build", "icon.png");
  }
  return path.join(projectRoot, "build", "icon.png");
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
  if (process.platform === "win32") {
    app.setAppUserModelId("com.floreopos.desktop");
  }

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
