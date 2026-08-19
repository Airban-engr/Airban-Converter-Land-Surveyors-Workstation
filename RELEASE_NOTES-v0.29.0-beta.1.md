# Airban Converter v0.29.0-beta.1

## Added

- Optional Beacon Index metadata from parcel coordinate CSV columns:
  - `computation_sheet_no`
  - `description_no`
  - `page`
  - `beacon_remarks`
- Alias support for related headers such as `comptn_sheet_no`, `sheet_no`, `description_number`, `pillar_no`, `page_no`, and `beacon_note`.
- Beacon Index metadata now appears in:
  - Beacon Index preview
  - Active Beacon Index CSV export
  - Survey workbook
  - Branded survey report
  - Survey Package Manifest
  - Parcel GeoJSON
  - Parcel KML
  - Parcel DXF beacon labels

## Updated

- The built-in parcel sample now includes Beacon Index metadata.
- The Survey Package Manifest now includes a Beacon Index Review section.

## Notes

- Existing parcel CSV files with only `id,easting,northing` still work.
- Beacon Index metadata is optional and does not affect coordinate, bearing, distance, or area calculations.
