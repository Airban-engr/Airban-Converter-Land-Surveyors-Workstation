# Airban Converter v0.27.0-beta.1

## Added

- Repeated closing-row handling for parcel coordinate lists.
- Parcel computation now excludes a final coordinate row when it repeats the first beacon coordinate.
- Result metadata now records input coordinate row count, computed beacon count, ignored closing row count, closing row ID, and source row.
- Quality Control now reports repeated closing-row handling separately from duplicate-beacon and zero-length-side checks.
- Computation Summary, Field Notes and Evidence, Survey Package Manifest, GeoJSON, KML, and DXF now include repeated closing-row metadata.

## Why It Matters

Many field and CAD coordinate lists close a parcel by repeating the first beacon at the end. This release treats that as a normal closure convention instead of turning it into a duplicate point or zero-length side.

## Notes

- Repeated closing-row handling only applies when the final coordinate matches the first coordinate.
- Duplicate points elsewhere in the parcel are still reported by Quality Control.
