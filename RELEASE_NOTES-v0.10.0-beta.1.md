# Airban Converter v0.10.0-beta.1

This beta adds the first real desktop app scaffold for the future installable **Land Surveyors Workstation**.

## Added

- Root `package.json` with Electron and Electron Builder scripts.
- Electron main process at `desktop/main.js`.
- Secure preload bridge at `desktop/preload.js`.
- Windows helper script at `desktop/build-windows.ps1`.
- Generated Windows `.ico` app icon at `src/assets/icons/airban-icon.ico`.
- Electron Builder NSIS configuration for a future Windows installer.
- Updated desktop documentation with run/build commands.

## Desktop Commands

From `outputs/ghana-coordinate-platform`:

```powershell
npm install
npm run desktop
npm run dist:win
```

## Notes For Testers

- This release adds the desktop build path; it does not include a prebuilt `.exe` installer yet.
- The desktop shell loads the same app source as the web/PWA version.
- Map tiles still require internet for detailed OpenStreetMap backgrounds.
