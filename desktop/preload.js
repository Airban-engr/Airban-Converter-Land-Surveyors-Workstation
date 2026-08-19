const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("airbanDesktop", {
  isDesktop: true,
  platform: process.platform,
  version: "0.41.1-beta.1"
});
