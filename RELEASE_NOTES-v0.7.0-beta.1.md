# Airban Converter v0.7.0-beta.1

This beta adds the first observation-import path for **The Land Surveyors Workstation**.

## Added

- Observation Import section inside Parcel Workstation.
- Topcon-style coordinate export import from `.csv`, `.txt`, `.dat`, and `.asc` files.
- Header recognition for point ID, easting, northing, elevation, and code/description fields.
- Optional point/code filtering before parcel computation.
- Observation preview table with accepted and rejected rows.
- Imported observation map preview with point IDs.
- One-click transfer of accepted observation points into parcel computation.
- Sample observation coordinate export at `samples/topcon-coordinate-observations.csv`.

## Notes For Testers

- This release imports coordinate observation exports. Full raw angle/distance observation reduction and adjustment is still a later workstation milestone.
- For best results, export from Topcon Tools with clear headers for point, easting, northing, elevation, and code/description.
- Use the filter field to keep parcel beacons separate from control points or non-boundary observations.
