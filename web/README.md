# Airban Converter Web App

The current web app is a static PWA. Version `0.41.1-beta.1` is suitable for internal beta deployment before the backend is introduced.

## First Deployment Target

Use a static host:

- Netlify
- Vercel
- GitHub Pages
- Cloudflare Pages

No build command is required for the current version.

## Deploy Folder

Deploy this folder:

```text
outputs/ghana-coordinate-platform
```

The entry file is:

```text
index.html
```

## Web App Features Now

- Internal beta label
- PWA manifest
- Install prompt support where the browser allows it
- Service worker app-shell caching
- Airban Converter branding
- CSV import/export
- WGS84 UTM zone 30N and 31N support
- Single-point WGS84 UTM zone selector for auto, zone 30N, or zone 31N output
- WGS84 UTM output display in metre or international foot
- GeoJSON point export
- Parcel KML and KMZ export for Google Earth and mobile map review
- Parcel geometry GeoJSON export with polygon, boundary lines, and beacon points
- Parcel DXF export for CAD drafting handoff
- Survey Package Manifest export for package handoff and review
- Simplified project detail fields for locality, district, client, regional number, reference CORS, survey date, and prepared by
- Repeated closing-row handling for parcel coordinate imports and export metadata
- Parcel course remarks from coordinate CSV columns such as `remarks`, `boundary`, or `adjoining`
- Beacon Index metadata from parcel CSV columns such as `computation_sheet_no`, `description_no`, `page`, and `beacon_remarks`
- Single-result copy action
- Sample CSV downloads
- Conversion review panel
- Map preview
- Point ID labels
- Parcel Workstation with bearing/distance, area, History of Survey, and parcel map preview
- History of Survey builder with purpose, computed-area defaults, optional reported area overrides, custom wording, preview, and copy support
- History of Survey Word-compatible `.doc` export
- Parcel provenance tracking from manual edits, parcel CSV uploads, and samples
- Reference CORS row handling for parcel CSV files where first and last rows are control/reference points
- Simplified parcel-first workstation layout inspired by the legacy Eagle Eye computation flow
- Beacon Index, Bearing & Distance, Plan Data, and Area Computation previews
- Formula-backed Excel-compatible Computation Sheet export with Beacon Index, Bearing and Distance from Coordinates, and Plan Data sheets
- Excel-compatible survey workbook export with the same three clean formal sheets
- Branded print-ready survey report export with parcel sketch, History of Survey, Beacon Index, Bearing and Distance from Coordinates, and Plan Data
- Desktop layout with the converter workspace above the full-width Parcel Workstation
- Shared codebase with Electron desktop scaffold

## Important Current Limitation

The app now bundles `proj4js` and Leaflet locally. OpenStreetMap tiles still load from the internet, so detailed basemap imagery requires connectivity. Coordinate conversion and the app shell are much closer to offline-ready.

## Recommended Web Release Sequence

1. Deploy the static PWA to a private or low-profile HTTPS beta URL.
2. Test on Chrome, Edge, and mobile browser.
3. Collect feedback using `FEEDBACK_TEMPLATE.md`.
4. Add backend API conversion with FastAPI and `pyproj`.
5. Add user accounts, saved projects, and Excel support only after the public workflow is validated.
6. Add offline map tiles only if users need full map review without internet.

## Suggested Public URL

```text
https://converter.airbanengineering.com
```

or:

```text
https://airbanconverter.com
```
