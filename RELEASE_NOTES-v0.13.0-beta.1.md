# Airban Converter v0.13.0-beta.1

This beta turns traverse adjustment into a clearer survey deliverable inside **The Land Surveyors Workstation**.

## Added

- Traverse CSV export from the Bearing / Distance Reduction workflow.
- CSV columns for raw reduced coordinates, easting/northing corrections, adjusted deltas, and adjusted coordinates.
- Project files now remember when Bowditch adjustment had been applied and restore that adjusted state.
- Workbook export now includes a Traverse Adjustment sheet when reduction evidence is available.
- Branded survey report now includes a Traverse Adjustment section when reduction evidence is available.
- Test coverage for traverse CSV, adjustment persistence, and report/workbook adjustment evidence.

## Notes For Testers

- Apply Adjust Traverse before exporting if you want corrected coordinates in the CSV, workbook, and report.
- The app still keeps Use Raw and Use Adjusted separate so testers can compare both parcel results.
- Full raw angle-set and least-squares observation adjustment remain future milestones.
