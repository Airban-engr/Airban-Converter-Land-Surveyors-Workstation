# Airban Converter v0.22.0-beta.1

## Focus

Parcel DXF export for CAD drafting workflows.

## Added

- New DXF export button in the Parcel Workstation.
- DXF output uses simple ASCII CAD entities for broad compatibility.
- CAD layers include:
  - `PARCEL_BOUNDARY`
  - `BOUNDARY_COURSES`
  - `BEACONS`
  - `BEACON_LABELS`
  - `COURSE_LABELS`
  - `PARCEL_NOTES`
- DXF export includes a closed parcel boundary polyline, boundary course lines, beacon circles, beacon labels, bearing/distance course labels, and parcel note text.
- Parcel notes include project name, locality, client, parcel source, area, perimeter, version, and export timestamp.

## Why It Matters

Survey workstation outputs often need to move into CAD for plan drafting and review. This release gives computed parcel data a CAD handoff path while preserving the tabular workbook/report and GIS GeoJSON workflows.

## Testing Notes

- Compute the sample parcel.
- Click DXF in the Parcel Workstation action row.
- Open the downloaded `.dxf` in AutoCAD, Civil 3D, QGIS, LibreCAD, or another DXF viewer.
- Confirm the parcel boundary, beacon labels, bearing/distance labels, and parcel notes appear on separate layers.
