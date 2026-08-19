# Airban Converter v0.15.0-beta.1

This beta adds **Workstation Quality Control** for The Land Surveyors Workstation.

## Added

- Quality Control panel in Parcel Workstation.
- Project detail checks for History of Survey readiness.
- Parcel geometry checks for minimum beacons, duplicate IDs, duplicate coordinates, zero-length sides, perimeter, and area.
- Ghana preview bounds check from parcel beacon coordinates.
- Traverse evidence checks for reduction, closure precision, and Bowditch adjustment status.
- Quality Control worksheet in the Excel-compatible survey workbook.
- Quality Control section in the branded HTML survey report.
- New QC verifier script for happy-path, missing-detail, and duplicate-beacon checks.

## Notes For Testers

- A parcel entered directly can be usable while still showing a warning that no traverse evidence is attached.
- Quality Control is a workstation readiness review. It does not replace professional judgment, field-book checks, or Lands Commission submission requirements.
- If a QC warning feels too strict or too relaxed, record it in `FEEDBACK_TEMPLATE.md` under the Quality Control test area.
