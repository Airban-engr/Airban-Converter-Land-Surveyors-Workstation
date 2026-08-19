# Airban Converter v0.34.0-beta.1

## Focus

This beta adds Parcel Geometry Review as a first-class workstation output.

## Added

- Added a new `Geometry Review` output tab in the Parcel Workstation.
- Computes beacon count, course count, parcel orientation, centroid, coordinate extents, easting/northing span, shortest side, longest side, average side length, perimeter, and area.
- Added Geometry Review to the survey workbook export.
- Added Geometry Review to the branded survey report.
- Added Geometry Review to the Survey Package Manifest.
- Added a QC side-length spread check that points users to Geometry Review.

## Why It Matters

Geometry Review gives surveyors and checkers a compact desk-check view before export or submission. It helps catch unusual side lengths, wrong beacon order, unexpected extents, and centroid/area issues early.

## Verify

- Compute the sample parcel.
- Open the `Geometry Review` tab and confirm centroid, extents, orientation, shortest side, longest side, perimeter, acreage, and hectares.
- Download the workbook, branded report, and manifest and confirm Geometry Review appears in each.
- Confirm QC includes a side-length spread check.
