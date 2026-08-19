# Airban Converter v0.31.0-beta.1

## Focus

This beta adds a formal office-style Computation Sheet export inspired by the reference workbook structure.

## Added

- Added a separate `Computation Sheet` export button in the Parcel Workstation.
- Added a focused Excel-compatible computation sheet with four formal sheets:
  - `BEACON INDEX`
  - `BRG N DIST COORD`
  - `PLAN DATA`
  - `AREA COMPUTATION`
- Added bearing/distance coordinate review blocks showing From/To points, Xa/Xb, Ya/Yb, coordinate deltas, actual bearing, and distance.
- Added verifier coverage for the new computation-sheet export structure.

## Why It Matters

The existing Survey Workbook remains the broader workstation package with field notes, QC, history, and evidence. The new Computation Sheet is a more familiar survey-office deliverable for Beacon Index, bearing/distance, plan data, and area computation review.

## Verify

- Compute the sample parcel and download `Computation Sheet`.
- Open the `.xls` file in Excel.
- Confirm it contains `BEACON INDEX`, `BRG N DIST COORD`, `PLAN DATA`, and `AREA COMPUTATION`.
- Confirm Beacon Index metadata, course remarks, bearings, distances, acreage, and hectares appear correctly.
