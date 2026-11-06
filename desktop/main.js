const { app, BrowserWindow, shell, session, desktopCapturer, ipcMain, dialog, Menu } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

const config = JSON.parse(fs.readFileSync(path.join(__dirname, "app-config.json"), "utf8"));
const appUrl = new URL(config.appUrl);
const authDomain = config.firebaseAuthDomain || "vox-chat-979fd.firebaseapp.com";
const defaults = { hardwareAcceleration: true, lowLatency: false, disableAnimations: false, microphoneEnabled: true, cameraEnabled: true };
const settingsFile = path.join(app.getPath("userData"), "settings.json");
function readSettings() {
  try { return { ...defaults, ...JSON.parse(fs.readFileSync(settingsFile, "utf8")) }; }
  catch { return { ...defaults }; }
}
let settings = readSettings();

// Electron requires this before app.whenReady() and before creating any BrowserWindow.
if (!settings.hardwareAcceleration) app.disableHardwareAcceleration();
if (settings.lowLatency) {
  app.commandLine.appendSwitch("disable-renderer-backgrounding");
  app.commandLine.appendSwitch("disable-background-timer-throttling");
}
function saveSettings(patch) {
  const safe = {};
  for (const key of Object.keys(defaults)) if (typeof patch?.[key] === "boolean") safe[key] = patch[key];
  settings = { ...settings, ...safe };
  fs.mkdirSync(path.dirname(settingsFile), { recursive: true });
  fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2), "utf8");
  return settings;
}
function isTrusted(url) {
  try { return new URL(url).origin === appUrl.origin && new URL(url).protocol === "https:"; }
  catch { return false; }
}
function isFirebaseAuth(url) {
  try { const u = new URL(url); return u.protocol === "https:" && u.hostname === authDomain; }
  catch { return false; }
}
let mainWindow;
let settingsWindow;
function openSettings() {
  if (settingsWindow && !settingsWindow.isDestroyed()) return settingsWindow.focus();
  settingsWindow = new BrowserWindow({
    width: 520, height: 700, minWidth: 450, minHeight: 600, parent: mainWindow,
    title: "VOX Settings", autoHideMenuBar: true, backgroundColor: "#0a0e1a",
    webPreferences: { preload: path.join(__dirname, "preload.js"), nodeIntegration: false, contextIsolation: true, sandbox: true }
  });
  settingsWindow.loadFile(path.join(__dirname, "settings.html"));
  settingsWindow.on("closed", () => { settingsWindow = null; });
}
function createMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: "VOX", submenu: [
      { label: "Settings…", accelerator: "Ctrl+,", click: openSettings },
      { type: "separator" }, { role: "reload" }, { role: "toggleDevTools" }, { type: "separator" }, { role: "quit" }
    ] },
    { label: "View", submenu: [{ role: "zoomIn" }, { role: "zoomOut" }, { role: "resetZoom" }, { type: "separator" }, { role: "togglefullscreen" }] }
  ]));
}
async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 820, minWidth: 860, minHeight: 560, show: false,
    title: "VOX", backgroundColor: "#0a0e1a", autoHideMenuBar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, backgroundThrottling: !settings.lowLatency }
  });
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.webContents.on("dom-ready", async () => {
    if (settings.lowLatency || settings.disableAnimations) {
      try { await mainWindow.webContents.insertCSS("*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}" + (settings.lowLatency ? "*,*::before,*::after{backdrop-filter:none!important;box-shadow:none!important}" : "")); }
      catch (error) { console.warn("VOX reduced-effects style failed", error); }
    }
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isFirebaseAuth(url)) return { action: "allow", overrideBrowserWindowOptions: { width: 520, height: 720, autoHideMenuBar: true, webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true } } };
    shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (isTrusted(url) || isFirebaseAuth(url)) return;
    event.preventDefault();
    shell.openExternal(url);
  });
  await mainWindow.loadURL(appUrl.href);
  mainWindow.on("closed", () => { mainWindow = null; });
}
ipcMain.handle("vox:settings:get", () => settings);
ipcMain.handle("vox:settings:update", (_event, patch) => {
  const before = settings;
  const next = saveSettings(patch);
  const hardwareChanged = before.hardwareAcceleration !== next.hardwareAcceleration;
  const latencyChanged = before.lowLatency !== next.lowLatency;
  if (settingsWindow && !settingsWindow.isDestroyed()) settingsWindow.webContents.send("vox:settings:sync", next);
  return { settings: next, restartRequired: hardwareChanged || latencyChanged };
});
ipcMain.handle("vox:restart", () => { app.relaunch(); app.exit(0); });

app.whenReady().then(async () => {
  createMenu();
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback, details) => {
    if (permission === "media") {
      const types = Array.isArray(details?.mediaTypes) ? details.mediaTypes : [];
      callback((!types.includes("audio") || settings.microphoneEnabled) && (!types.includes("video") || settings.cameraEnabled));
      return;
    }
    callback(permission === "notifications");
  });
  session.defaultSession.setDisplayMediaRequestHandler(async (_request, callback) => {
    try {
      const sources = await desktopCapturer.getSources({ types: ["screen", "window"], fetchWindowIcons: false });
      if (!sources.length) return callback({});
      const labels = sources.map((source) => source.name.slice(0, 80));
      const choice = await dialog.showMessageBox(mainWindow, { type: "question", title: "Share your screen", message: "Choose what VOX can share", buttons: [...labels, "Cancel"], cancelId: labels.length });
      const selected = sources[choice.response];
      callback(selected ? { video: selected } : {});
    } catch (error) { console.error("Screen share source selection failed", error); callback({}); }
  });
  await createMainWindow();
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createMainWindow(); });
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
