# Airban Converter v0.4.0-beta.1

Release stage: Internal beta

## Highlights

- Ghana National Grid to WGS84 geographic conversion
- WGS84 geographic to Ghana National Grid conversion
- WGS84 UTM zone 30N and 31N to Ghana National Grid conversion
- Ghana National Grid to WGS84 UTM conversion
- UTM coordinates shown in the Results panel
- CSV batch conversion for Grid, WGS84 geographic, and WGS84 UTM workflows
- Sample UTM CSV file included
- DMS to decimal degrees parser
- Map preview with all CSV points and visible point IDs
- CSV and GeoJSON export
- PWA install support

## UTM Notes

- WGS84 / UTM zone 30N is EPSG:32630 and covers 6W to 0W.
- WGS84 / UTM zone 31N is EPSG:32631 and covers 0E to 6E.
- The app can auto-select UTM zone from longitude for Grid/WGS84 geographic outputs.
- UTM input requires zone 30N or 31N.

## Beta Notes

- Use this release for controlled testing with known control points.
- Do not treat results as final for cadastral, legal, or high-precision survey deliverables until additional validation is complete.
- The next major hardening step is backend validation with `pyproj`.
