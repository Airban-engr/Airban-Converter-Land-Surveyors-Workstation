# Airban Converter v0.35.0-beta.1

Release stage: Internal beta

This beta adds a dedicated Bearing & Distance Schedule as a first-class Land Surveyors Workstation output.

## Added

- Added a new `Bearing & Distance` output tab in the Parcel Workstation.
- Added active CSV download for the Bearing & Distance Schedule.
- Added a `BEARING DISTANCE` worksheet to the survey workbook export.
- Added a Bearing and Distance Schedule section to the branded survey report.
- Added a Bearing and Distance Schedule section to the Survey Package Manifest.
- Added schedule coverage to beta testing and deployment checks.

## Why It Matters

The schedule gives surveyors a direct review table for every boundary course: course number, from/to beacons, bearing, distance, coordinate deltas, adjoining remarks, perimeter, and area context. This makes the package easier to check before final plan preparation or report issue.

## Suggested Beta Checks

- Compute the sample parcel and open the `Bearing & Distance` tab.
- Confirm bearings, distances, dE/dN, and course remarks match Plan Data and Calculation Audit.
- Download the active CSV while the schedule tab is selected.
- Download the workbook, branded report, and manifest and confirm the Bearing and Distance Schedule appears in each.
