# Airban Converter v0.23.0-beta.1

## Focus

Parcel KML export for Google Earth and mobile map review.

## Added

- New KML export button in the Parcel Workstation.
- KML output includes:
  - one parcel boundary polygon
  - one boundary course `LineString` per parcel side
  - one beacon placemark per parcel beacon
  - project, parcel source, area, perimeter, grid unit, bearing, distance, and beacon coordinate metadata
- KML styles distinguish parcel polygon, boundary courses, and beacon placemarks.

## Why It Matters

Surveyors often need a lightweight visual handoff that can be opened in Google Earth or shared for quick map review. KML complements GeoJSON for GIS workflows and DXF for CAD drafting.

## Testing Notes

- Compute the sample parcel.
- Click KML in the Parcel Workstation action row.
- Open the downloaded `.kml` in Google Earth, QGIS, or another KML viewer.
- Confirm the parcel polygon, boundary courses, beacon labels, and area/source metadata are present.
