# Airban Converter v0.11.0-beta.1

This beta adds the first bearing/distance reduction workflow for **The Land Surveyors Workstation**.

## Added

- Bearing / Distance Reduction section inside Parcel Workstation.
- Starting point ID, starting easting/northing, and reduction unit inputs.
- Bearing/distance file or pasted observation input.
- Whole-circle bearing, DMS bearing, and quadrant bearing parsing.
- Reduced coordinate preview table.
- Total distance, close error, and precision summary.
- Map preview for reduced coordinates.
- One-click transfer of reduced points into parcel computation.
- Sample file at `samples/bearing-distance-observations.csv`.
- Project files now preserve bearing/distance reduction inputs.

## Notes For Testers

- This is a practical coordinate reduction step for bearing/distance observations.
- It does not yet perform full raw angle-set adjustment or least-squares adjustment.
- Use known field books or trusted computation sheets to compare reduced coordinates and closure.
