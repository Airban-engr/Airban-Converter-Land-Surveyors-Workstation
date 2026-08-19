# Airban Converter v0.37.0-beta.1

This beta simplifies the Parcel Workstation around the legacy Eagle Eye computation idea: import parcel coordinates, compute the parcel, and export Beacon Index, Bearing & Distance, Plan Data, Area, report, workbook, KML, DXF, and manifest evidence.

## Added

- Parcel computation basis strip showing input rows, excluded reference rows, and the active row rule.
- Visible Reference rows workflow for CORS/reference/check rows commonly found at the first and last rows of field CSV files.
- Beta guide and deployment checklist focused on parcel coordinates, History of Survey, area/perimeter, and export validation.

## Changed

- Removed the visible Observation Import, Bearing / Distance Reduction, and Angular Traverse Reduction panels from the workstation surface.
- Kept parcel coordinates as the main workstation entry point, with the existing converter tools unchanged.
- Kept dormant legacy import/reduction code internal for compatibility with older project files and future rework.

## Verification

- Parcel area, perimeter, bearing/distance, report, workbook, KML, DXF, GeoJSON, and QC all use the enclosed parcel beacons after reference rows are excluded.
- The CORS sample `samples/parcel-with-reference-cors.csv` remains available for beta testing.
