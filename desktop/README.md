# Airban Converter Desktop App Path

Airban Converter now has an Electron desktop scaffold. It keeps the same web app source and wraps it in a desktop shell for the future Windows installer.

## Current Scaffold

Desktop files now included:

```text
package.json
desktop/main.js
desktop/preload.js
desktop/build-windows.ps1
src/assets/icons/airban-icon.ico
```

The main Electron entry is:

```text
desktop/main.js
```

It loads:

```text
index.html
```

from the app root, so the desktop and web builds share one interface and one computation codebase.

## Run In Desktop Mode

From `outputs/ghana-coordinate-platform`:

```powershell
npm install
npm run desktop
```

## Build Windows Installer

From `outputs/ghana-coordinate-platform`:

```powershell
npm run dist:win
```

or:

```powershell
desktop/build-windows.ps1
```

Possible output:

- `Airban Converter Setup.exe`
- Desktop shortcut
- Start menu entry
- Local app data managed by Electron/Chromium

## Desktop Security Defaults

The Electron shell uses:

- `contextIsolation: true`
- `nodeIntegration: false`
- a small preload bridge with app metadata only
- external HTTP/HTTPS links opened in the system browser

## Project Files

The app already supports portable `.airban-project.json` files and same-device browser drafts. In Electron, these still use the browser-compatible file/download and local storage behavior first. Native desktop dialogs can be added later if needed.

## Offline Conversion Engine

For true standalone use, do not depend on CDN scripts.

Bundle locally:

- `proj4js`
- Leaflet
- Leaflet runtime styles already embedded in `src/styles/app.css`
- Airban logo and app assets

For higher trust and survey-grade validation, move coordinate conversion into the backend approach using `pyproj` / PROJ and package it as a local sidecar service.

## Installer

Use an installer builder:

- Electron Builder with NSIS for Windows
- Code signing later, when distributing publicly
- Versioned releases such as `Airban Converter 1.0.0`

## Product Name

Use:

```text
Airban Converter
```

Optional tagline:

```text
Coordinate conversion for Ghana survey workflows.
```

## Installer Checklist

- App icon derived from the Airban Engineering logo
- Offline projection library
- Offline UI assets
- CSV import/export
- Map preview with online tiles first
- Offline fallback map view
- Version number in About dialog
- Accuracy disclaimer
- Sample data

## Offline Map Note

The current map uses OpenStreetMap tiles, so it needs internet for full basemap detail. Even as a desktop app, the coordinate conversion can work offline, but the detailed map background will need either internet or bundled offline tiles.
