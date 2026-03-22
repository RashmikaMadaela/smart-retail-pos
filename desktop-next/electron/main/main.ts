import { app, BrowserWindow } from "electron";
import fs from "node:fs";
import path from "node:path";
import { registerIpcHandlers } from "./ipc";
import { ensureSuperAdminUser } from "../../backend/services/authService";

function resolveDevRoots() {
  const cwd = process.cwd();

  if (fs.existsSync(path.join(cwd, "desktop-next", "package.json"))) {
    return {
      repoRoot: cwd,
      desktopRoot: path.join(cwd, "desktop-next"),
    };
  }

  if (fs.existsSync(path.join(cwd, "package.json")) && fs.existsSync(path.join(cwd, "electron"))) {
    return {
      repoRoot: path.resolve(cwd, ".."),
      desktopRoot: cwd,
    };
  }

  return {
    repoRoot: path.resolve(cwd, ".."),
    desktopRoot: cwd,
  };
}

function resolveDbPath() {
  if (process.env.POS_DB_PATH) {
    return process.env.POS_DB_PATH;
  }
  if (app.isPackaged) {
    return path.join(app.getPath("documents"), "SmartRetailPOSNext", "database", "pos.db");
  }
  const { repoRoot } = resolveDevRoots();
  return path.join(repoRoot, "database", "pos.db");
}

function resolvePrintRootPath() {
  if (process.env.POS_PRINT_DIR) {
    return process.env.POS_PRINT_DIR;
  }
  if (app.isPackaged) {
    return path.join(app.getPath("documents"), "SmartRetailPOSNext", "printouts");
  }
  const { repoRoot } = resolveDevRoots();
  return path.join(repoRoot, "printouts");
}

function resolveInventoryExportRootPath() {
  if (process.env.POS_INVENTORY_EXPORT_DIR) {
    return process.env.POS_INVENTORY_EXPORT_DIR;
  }
  if (app.isPackaged) {
    return path.join(app.getPath("documents"), "SmartRetailPOSNext", "inventory_exports");
  }
  const { repoRoot } = resolveDevRoots();
  return path.join(repoRoot, "inventory_exports");
}

function resolvePreloadPath() {
  const { desktopRoot } = resolveDevRoots();
  if (process.env.VITE_DEV_SERVER_URL) {
    return path.join(desktopRoot, "dist-electron", "preload.cjs");
  }
  if (app.isPackaged) {
    return path.join(app.getAppPath(), "dist-electron", "preload.cjs");
  }
  return path.join(desktopRoot, "dist-electron", "preload.cjs");
}

function resolveRendererIndexPath() {
  const { desktopRoot } = resolveDevRoots();
  if (app.isPackaged) {
    return path.join(app.getAppPath(), "dist", "index.html");
  }
  return path.join(desktopRoot, "dist", "index.html");
}

function resolveWindowIconPath() {
  const { desktopRoot } = resolveDevRoots();
  if (process.platform === "win32") {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, "app.asar", "build", "icon.ico");
    }
    return path.join(desktopRoot, "build", "icon.ico");
  }

  if (app.isPackaged) {
    return path.join(app.getAppPath(), "build", "icon.png");
  }
  return path.join(desktopRoot, "build", "icon.png");
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
