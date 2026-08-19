# Airban Converter v0.36.0-beta.1

Release stage: Internal beta

This beta adds reference CORS row handling for Parcel Workstation area and perimeter computations.

## Added

- Added a `Reference rows` control in Project Details.
- Added auto-detection for labelled CORS/reference/control rows at the first and last positions of parcel coordinate CSV files.
- Added a forced `Exclude first and last rows` option for files where reference rows are not labelled.
- Added an `Include every row` option for ordinary parcel-only coordinate lists.
- Added `samples/parcel-with-reference-cors.csv` for beta testing.
- Added reference-row evidence to Geometry Review, Quality Control, Computation Summary, Field Notes and Evidence, Computation Sheet review, workbook, branded report, Survey Package Manifest, GeoJSON, KML, and DXF exports.
- Updated Airban project files to preserve the selected reference-row handling mode.

## Why It Matters

Survey coordinate files often include reference/CORS/control rows before and after the parcel beacons. Those rows are useful field evidence, but they should not form part of the enclosed parcel polygon. This beta keeps the reference evidence while computing acreage, hectares, perimeter, map polygon, and parcel exports from the actual parcel beacons only.

## Suggested Beta Checks

- Load `samples/parcel-with-reference-cors.csv` with Reference rows set to auto-detect.
- Confirm the app reports two reference rows excluded.
- Confirm the computed beacons, perimeter, acreage, and hectares match the clean parcel sample.
- Switch Reference rows to `Exclude first and last rows` on an unlabelled reference-row file.
- Check workbook, branded report, manifest, KML, DXF, and GeoJSON exports for reference-row evidence.
