# Airban Converter Web Deployment Checklist

Version: `0.41.1-beta.1`

## Recommended Beta Path

Deploy as a static web app first, then share the HTTPS URL with a small internal test group.

## Best Hosting Options

- Netlify: easiest drag-and-drop upload of the packaged folder or zip
- Vercel: good for git-based deployment
- Cloudflare Pages: good free static hosting
- GitHub Pages: good if the project is stored in GitHub

## Deploy Folder

Deploy the contents of:

```text
outputs/ghana-coordinate-platform
```

The entry file is:

```text
index.html
```

## Before Sharing

1. Confirm the hosted URL uses HTTPS.
2. Open the app in Chrome or Edge.
3. Run the sample Grid conversion.
4. Upload `samples/ghana-grid-header.csv`.
5. Upload `samples/utm-zone-30n-points.csv`.
6. Confirm one-point UTM output switches between auto, zone 30N, and zone 31N.
7. Confirm all points plot with IDs.
8. Download CSV and GeoJSON outputs.
9. Run the Parcel Workstation sample and confirm area, bearing/distance, Source card, preferred parcel unit, reference CORS row handling, repeated closing-row handling, History of Survey preview, Word export, reported area overrides, custom History wording, Beacon Index, Bearing & Distance, Plan Data, Area Computation, formula-backed Computation Sheet export, workbook export, branded report export, Survey Package Manifest export, map polygon output, parcel KML/KMZ export, parcel GeoJSON export, and parcel DXF export.
10. Test `samples/parcel-with-reference-cors.csv` and confirm reference/check rows are excluded from parcel area and perimeter.
11. Open the workbook, branded report, and manifest and confirm the clean Beacon Index, Bearing and Distance from Coordinates, and Plan Data outputs include reference departure/closure rows.
12. Confirm the app layout places Coordinate Tools, Output, Batch CSV, and Map Preview in the upper converter workspace, with Parcel Workstation below and no map overlap while scrolling.
13. Confirm desktop scaffold files are included in the release package.
14. Install the PWA from the browser.
15. Send testers the hosted URL, `BETA_TEST_GUIDE.md`, and `FEEDBACK_TEMPLATE.md`.

## Suggested Sharing Message

```text
Hello, I am testing Airban Converter, a Ghana coordinate conversion web app.

Please test Grid to WGS84, WGS84 to Grid, DMS parsing, CSV upload/download, and the map preview using known coordinates where possible.

This is an internal beta, so please do not use it yet for final legal or cadastral deliverables.
```

## After Feedback

1. Fix blocking issues.
2. Validate against more known Ghana control points.
3. Add backend `pyproj` validation.
4. Prepare the desktop installer path.
