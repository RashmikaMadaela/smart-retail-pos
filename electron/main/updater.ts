import { autoUpdater } from "electron-updater";
import { dialog, BrowserWindow } from "electron";
import log from "electron-log";

// Use electron-log so update activity is written to the app's log file
autoUpdater.logger = log;
(autoUpdater.logger as typeof log).transports.file.level = "info";

// Do NOT auto-install on quit — we will prompt the user first
autoUpdater.autoInstallOnAppQuit = false;

// For public GitHub repos no token is required
autoUpdater.autoDownload = false;

export function initAutoUpdater(mainWindow: BrowserWindow): void {
  // ── Check for update once on startup (silently) ────────────────────────────
  autoUpdater.checkForUpdates().catch((err) => {
    log.warn("Update check failed:", err?.message ?? err);
  });

  // ── Update available → ask the user ────────────────────────────────────────
  autoUpdater.on("update-available", (info) => {
    dialog
      .showMessageBox(mainWindow, {
        type: "info",
        title: "Update Available",
        message: `FloreoPOS ${info.version} is available.`,
        detail:
          "A new version has been released. Would you like to download it now? The app will restart automatically after the download.",
        buttons: ["Download Now", "Later"],
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.downloadUpdate().catch((err) => {
            log.error("Download failed:", err?.message ?? err);
            dialog.showErrorBox(
              "Download Failed",
              "Could not download the update. Please check your internet connection and try again."
            );
          });
        }
      });
  });

  // ── No update → do nothing (silent) ────────────────────────────────────────
  autoUpdater.on("update-not-available", () => {
    log.info("App is up to date.");
  });

  // ── Download progress → log only (native progress bar is shown by OS) ──────
  autoUpdater.on("download-progress", (progress) => {
    const percent = Math.round(progress.percent);
    log.info(`Downloading update: ${percent}% (${Math.round(progress.bytesPerSecond / 1024)} KB/s)`);
    mainWindow.setProgressBar(progress.percent / 100);
  });

  // ── Downloaded → ask to restart ────────────────────────────────────────────
  autoUpdater.on("update-downloaded", (info) => {
    mainWindow.setProgressBar(-1); // clear progress bar
    dialog
      .showMessageBox(mainWindow, {
        type: "info",
        title: "Update Ready",
        message: `FloreoPOS ${info.version} has been downloaded.`,
        detail: "Restart the application now to apply the update.",
        buttons: ["Restart Now", "Later"],
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.quitAndInstall(false, true);
        }
      });
  });

  // ── Error ───────────────────────────────────────────────────────────────────
  autoUpdater.on("error", (err) => {
    log.error("AutoUpdater error:", err?.message ?? err);
    mainWindow.setProgressBar(-1);
  });
}

/**
 * Manually trigger an update check (e.g. from a "Check for updates" menu item).
 * Shows a dialog if already up to date.
 */
export function checkForUpdatesManually(mainWindow: BrowserWindow): void {
  autoUpdater
    .checkForUpdates()
    .then((result) => {
      if (!result || !result.updateInfo) {
        dialog.showMessageBox(mainWindow, {
          type: "info",
          title: "No Updates",
          message: "FloreoPOS is up to date.",
          buttons: ["OK"],
        });
      }
    })
    .catch((err) => {
      log.warn("Manual update check failed:", err?.message ?? err);
      dialog.showErrorBox(
        "Update Check Failed",
        "Could not reach the update server. Please check your internet connection."
      );
    });
}
