# Airban Converter

This is the internal beta foundation for **Airban Converter**. It keeps the working browser experience, but splits the code into a maintainable app structure that can later be packaged as installable desktop software.

Current version: `0.41.1-beta.1`

## What It Does

- Ghana National Grid to WGS84
- WGS84 to Ghana National Grid
- Ghana National Grid to WGS84 UTM
- WGS84 UTM to Ghana National Grid
- Single-point WGS84 UTM zone selection: auto, zone 30N, or zone 31N
- WGS84 UTM results in metre or international foot
- DMS to decimal degrees
- CSV batch conversion
- Headered and no-header CSV support
- Unit selection: Gold Coast foot, metre, international foot
- Map preview for single points and full CSV batches
- Visible point IDs on the map
- Excel-safe CSV download
- Copy single-point results
- GeoJSON export for plotted points
- Conversion review status for Ghana-bound checks
- Parcel Workstation for project details, beacon lines, bearing/distance schedules, area, and History of Survey text
- Dedicated History of Survey builder with survey purpose, computed-area defaults, optional reported acreage/hectare overrides, custom wording, preview, and copy support
- History of Survey Word-compatible `.doc` export
- Parcel provenance tracking for manual edits, parcel CSV uploads, and samples
- Parcel polygon map preview from beacon coordinates
- Parcel KML export for Google Earth and mobile map review
- Parcel KMZ export with a packaged `doc.kml`
- Parcel GeoJSON export with closed polygon, boundary line features, beacon point features, and parcel source metadata
- Parcel DXF export with CAD layers for boundary, boundary courses, beacons, beacon labels, course labels, and parcel notes
- Survey Package Manifest export with project metadata, clean export checklist, reference-row handling, Beacon Index, Bearing and Distance, Plan Data, and History of Survey draft
- Project detail fields for locality, district, client, regional number, reference CORS, survey date, and prepared by
- Reference CORS row handling for parcel CSV files where the first and last rows are control/reference points outside the enclosed parcel
- Repeated closing-row handling for parcel coordinate lists where the final row repeats the first beacon
- Optional parcel course remarks from `remarks`, `boundary`, `adjoining`, or related CSV columns
- Optional Beacon Index metadata from parcel CSV columns such as `computation_sheet_no`, `description_no`, `page`, and `beacon_remarks`
- Beacon Index, Bearing & Distance, Plan Data, and Area Computation workstation previews
- Formula-backed Excel-compatible Computation Sheet export with the three clean formal sheets: Beacon Index, Bearing and Distance from Coordinates, and Plan Data
- Excel-compatible survey workbook export using the same three clean formal sheets
- Reference CORS rows are shown as departure and closure ties in the formal outputs while the enclosed parcel beacons alone drive the area/perimeter calculation
- Simplified Parcel Workstation surface centered on parcel coordinates, Beacon Index, Bearing & Distance, Plan Data, Area Computation, and History of Survey
- Desktop layout with converter tools, output, batch conversion, and map review in the upper workspace, and Parcel Workstation across the lower workspace
- Branded print-ready survey report export with parcel sketch, History of Survey, Beacon Index, Bearing and Distance from Coordinates, and Plan Data
- Electron desktop scaffold for future Windows installer builds
- Airban Engineering-inspired branding
- Desktop and mobile install metadata for PWA use
- Mobile file-open warning for testers who accidentally open `index.html`

## Internal Beta

Use this version with a small controlled tester group before wider professional release.

Beta files:

- `BETA_TEST_GUIDE.md`
- `FEEDBACK_TEMPLATE.md`
- `RELEASE_NOTES-v0.41.1-beta.1.md`
- `web/INSTALL_GUIDE.md`
- `web/DEPLOYMENT_CHECKLIST.md`

## Run It

Open `index.html` directly, or serve the folder with a small local server:

```powershell
python -m http.server 8765
```

Then open:

```text
http://127.0.0.1:8765/ghana-coordinate-platform/
```

The browser version now bundles local copies of `proj4js` and Leaflet. For a production deployment or offline desktop app, the next major hardening step is validating the frontend transformation against the backend scaffold in `backend/`.

## CSV Examples

Sample files are included in:

```text
samples/
```

No-header Ghana Grid CSV:

```csv
P01,833356.39,180404.48
P02,833317.35,180452.99
```

Headered Ghana Grid CSV:

```csv
id,eastings,northings
P01,833356.39,180404.48
P02,833317.35,180452.99
```

WGS84 CSV:

```csv
id,latitude,longitude
P01,5.16682625,-1.18300234
```

Parcel CSV with reference CORS rows:

```text
samples/parcel-with-reference-cors.csv
```

## Project Layout

```text
ghana-coordinate-platform/
  index.html
  desktop/
  samples/
  src/
    assets/
    styles/
    js/
  backend/
```

## Standalone Desktop App

The desktop scaffold and installer path are documented in:

```text
desktop/README.md
```

Current packaging route: Electron with Electron Builder, producing a Windows installer such as:

```text
Airban Converter Setup.exe
```

The desktop scaffold already bundles the current UI, local projection library, logo assets, sample files, and app code. The detailed map background can remain online at first, with an offline fallback map view.

## Web App Deployment

The first sharing target is a static PWA web app deployed to an HTTPS URL. Deployment notes are in:

```text
web/README.md
web/DEPLOYMENT_CHECKLIST.md
```

Included web app files:

- `manifest.webmanifest`
- `service-worker.js`
- `netlify.toml`
- `vercel.json`
- `samples/ghana-grid-header.csv`
- `samples/bearing-distance-observations.csv`
- `samples/angular-traverse-observations.csv`
- `samples/parcel-beacons.csv`
- `samples/topcon-coordinate-observations.csv`
- `samples/topcon-alias-coordinate-observations.csv`
- `samples/topcon-no-header-northing-easting.csv`
- `samples/wgs84-points.csv`
- `samples/utm-zone-30n-points.csv`

The current web app can be deployed without a build step. The browser libraries are bundled locally, and the next hardening step is to connect the frontend to the FastAPI backend for independent server-side validation.

## Production Path

1. Validate against more trusted Ghana coordinate samples.
2. Deploy the static PWA web app.
3. Replace browser-side projection with the FastAPI backend in `backend/`.
4. Package the current app as an installable desktop app.
5. Add Excel upload/download.
6. Add raw angle-set and observation adjustment workflows.
7. Deploy web and desktop versions from the same core code.

## Accuracy Note

Ghana National Grid is EPSG:2136, also named Accra / Ghana National Grid. Its native unit is Gold Coast foot. WGS84 / UTM zone 30N is EPSG:32630 and WGS84 / UTM zone 31N is EPSG:32631. UTM definitions are metre-based; feet output is a display/export conversion. For cadastral, legal, or high-precision survey work, confirm results against known control points and the transformation method required by the relevant authority.
