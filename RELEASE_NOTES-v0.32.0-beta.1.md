# Airban Converter v0.32.0-beta.1

## Focus

This beta makes the formal Computation Sheet export formula-backed and more auditable in Excel.

## Added

- Added SpreadsheetML formula support to exported workbook cells.
- Added formulas to the `BRG N DIST COORD` sheet for:
  - Beacon coordinate references from `BEACON INDEX`
  - Delta X / Delta Y
  - Bearing degrees, minutes, and seconds
  - Course distance
- Added formulas to the `PLAN DATA` sheet so course rows reference the bearing/distance sheet.
- Added formulas to the `AREA COMPUTATION` sheet for:
  - Coordinate references from `BEACON INDEX`
  - Shoelace forward/backward products
  - Sums
  - Double area
  - Area
  - Acre and hectare conversion

## Why It Matters

The Computation Sheet now behaves more like a surveyor's working Excel sheet. Exported values remain visible immediately, while Excel can trace the formulas behind bearing, distance, and area checks.

## Verify

- Compute the sample parcel and download `Computation Sheet`.
- Open it in Excel and inspect formulas in `BRG N DIST COORD`, `PLAN DATA`, and `AREA COMPUTATION`.
- Confirm formulas reference `BEACON INDEX` and that values match the app's parcel summary.
