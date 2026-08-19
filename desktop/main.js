const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("path");

const APP_ROOT = path.join(__dirname, "..");
const APP_VERSION = "0.41.1-beta.1";

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1320,
    height: 880,
    minWidth: 1100,
    minHeight: 720,
    title: "Airban Converter",
    backgroundColor: "#edf2f0",
    icon: path.join(APP_ROOT, "src", "assets", "icons", "airban-icon-512.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.loadFile(path.join(APP_ROOT, "index.html"));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });

  return mainWindow;
}

function createMenu() {
  const template = [
    {
      label: "File",
      submenu: [
        { role: "reload" },
        { type: "separator" },
        { role: "quit" }
      ]
    },
    {
      label: "View",
      submenu: [
        { role: "zoomIn" },
        { role: "zoomOut" },
        { role: "resetZoom" },
        { type: "separator" },
        { role: "togglefullscreen" }
      ]
    },
    {
      label: "Help",
      submenu: [
        {
          label: `About Airban Converter ${APP_VERSION}`,
          enabled: false
        },
        {
          label: "Open OpenStreetMap",
          click: () => shell.openExternal("https://www.openstreetmap.org")
        }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.setAppUserModelId("com.airban.converter");

app.whenReady().then(() => {
  createMenu();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
