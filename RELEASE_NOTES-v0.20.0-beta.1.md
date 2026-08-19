# Airban Converter v0.20.0-beta.1

## Focus

Broader Topcon-style coordinate export import support.

## Added

- Observation import now recognizes more common survey-export header aliases, including `Point No.`, `Point Number`, `Pt No`, `Grid E`, `Grid N`, `E Coord`, `N Coord`, `Ortho Ht`, `Ellip Ht`, `Feature Code`, and `Raw Description`.
- New sample file: `samples/topcon-alias-coordinate-observations.csv`.
- Field Notes and Evidence exports now include an Observation Header Map showing which source columns were mapped to point ID, easting, northing, elevation, and code.
- The sample download area now includes the alias-header observation sample.

## Why It Matters

Topcon Tools and survey office exports do not always use the same column labels. This release makes the import path more forgiving and records the detected column mapping so reviewers can audit how parcel coordinates were derived.

## Testing Notes

- Import `samples/topcon-alias-coordinate-observations.csv`.
- Filter by `BEACON`.
- Use the accepted points as parcel beacons and compute the parcel.
- Download the workbook or branded report and confirm Field Notes includes the Observation Header Map with `Easting: Grid E` and `Northing: Grid N`.
