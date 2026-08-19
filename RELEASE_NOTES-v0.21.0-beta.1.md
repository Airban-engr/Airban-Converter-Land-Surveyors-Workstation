# Airban Converter v0.21.0-beta.1

## Focus

Parcel geometry GeoJSON export for GIS/map workflows.

## Added

- The existing GeoJSON button now exports parcel geometry when the current map preview is a computed parcel.
- Parcel GeoJSON includes:
  - one closed `Polygon` feature for the parcel boundary
  - one `LineString` feature per bearing/distance boundary course
  - one `Point` feature per beacon
- Parcel GeoJSON properties include project details, parcel source evidence, area, perimeter, grid unit, bearings, distances, and beacon coordinates.
- Regular conversion and CSV map previews still export point-based GeoJSON as before.

## Why It Matters

The workstation should not only calculate and report parcel data; it should also produce clean geometry that can move into GIS, web maps, and future desktop/mobile workflows. This release turns the computed parcel into a portable WGS84 GeoJSON artifact.

## Testing Notes

- Compute the sample parcel.
- Click GeoJSON after the parcel polygon appears on the map.
- Confirm the downloaded file contains a `Polygon`, four `LineString` features, and four beacon `Point` features.
- Confirm the polygon ring is closed and includes area/perimeter metadata.
