# Airban Converter v0.4.6-beta.1

Release stage: Internal beta

## Mobile URL Fix

- Changed the linked manifest to `manifest.json` while keeping `manifest.webmanifest` available.
- Made the PWA `id` and `start_url` relative so the app works better when deployed under different folder paths.
- Added a visible warning for users who open `index.html` from phone Files, attachment previews, zip previews, or `file://` links.
- Expanded install guidance for Android Chrome and iPhone/iPad Safari.

## Install Note

The install icon only appears when the app is served from a valid HTTPS URL and the browser considers it installable. iOS Safari does not show a browser install icon; use Share > Add to Home Screen.
