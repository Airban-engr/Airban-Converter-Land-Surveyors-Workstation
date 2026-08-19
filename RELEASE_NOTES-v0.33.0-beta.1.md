# Airban Converter v0.33.0-beta.1

## Focus

This beta adds a Computation Review tab to the formal Computation Sheet export.

## Added

- Added a first-sheet `COMPUTATION REVIEW` tab to the Computation Sheet export.
- Captures project, locality, district, client, regional number, CORS ID, prepared-by, and checked-by details.
- Records coordinate reference, transformation set, grid unit, parcel coordinate source, and source detail.
- Summarizes input coordinate rows, computed beacons, repeated closing-row handling, perimeter, acreage, and hectares.
- Records worksheet count and formula-cell count for checker review.
- Adds a review note reminding users to confirm control, transformation method, field evidence, and submission standards.

## Why It Matters

The Computation Sheet now opens with a clear audit/cover tab before the checker enters the calculation tabs. This makes the export easier to review, file, and compare with office computation records.

## Verify

- Compute the sample parcel and download `Computation Sheet`.
- Open the workbook and confirm the first tab is `COMPUTATION REVIEW`.
- Confirm the review tab lists project/source details, area/perimeter summary, worksheet count, and formula-cell count.
- Confirm the calculation tabs still contain formulas for bearing, distance, plan data, and area computation.
