# Airban Converter v0.17.0-beta.1

This beta adds **Field Notes and Evidence** exports for The Land Surveyors Workstation.

## Added

- Field Notes worksheet in the Excel-compatible survey workbook.
- Field Notes and Evidence section in the branded HTML survey report.
- Project notes now travel into survey exports.
- Observation import evidence now travels into exports, including format, delimiter, unit, filter, parsed points, accepted points, rejected rows, and duplicate observation IDs.
- Traverse reduction and adjustment evidence is repeated in the Field Notes section for easier review.
- Computation Summary now includes observation evidence status.

## Notes For Testers

- Add a short project note before exporting and confirm it appears in both workbook and report.
- Import `samples/topcon-coordinate-observations.csv`, apply the `BEACON` filter, and confirm accepted/rejected observation evidence appears in exports.
- Confirm long project notes wrap correctly in the branded report.
