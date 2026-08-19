# Airban Converter v0.28.0-beta.1

## Added

- Optional parcel course remarks from coordinate CSV columns such as:
  - `remarks`
  - `remark`
  - `description`
  - `boundary`
  - `boundary_note`
  - `adjoining`
  - `adjoiner`
  - `course`
  - `course_remarks`
  - `side`
- Course remarks now flow into Plan Data, Calculation Audit, workbook export, branded report, Survey Package Manifest, GeoJSON, KML, and DXF.
- The built-in parcel sample now includes course remarks for beta testing.

## How It Works

The remark on each parcel coordinate row describes the course from that beacon to the next beacon.

Example:

```csv
id,easting,northing,remarks
P01,833356.39,180404.48,Adjoining access road
P02,833317.35,180452.99,Adjoining family land
```

Here, the P01 remark applies to the P01-P02 course.

## Notes

- Existing `id,easting,northing` parcel CSV files still work.
- Course remarks are optional and do not affect area, bearing, or distance calculations.
