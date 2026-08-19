# Airban Converter v0.19.0-beta.1

## Focus

Parcel provenance and export evidence for The Land Surveyors Workstation.

## Added

- Parcel summary now shows the coordinate source used for the current parcel computation.
- Source tracking covers manual/edited coordinates, parcel CSV uploads, sample parcels, imported observation coordinates, raw traverse reduction, Bowditch adjusted traverse, and restored project files.
- Airban project files now preserve the parcel coordinate source and detail.
- Survey workbook Computation Summary and Field Notes now include Parcel Coordinate Source and Parcel Source Detail.
- Branded HTML survey report now includes the parcel coordinate source in Project Summary, Computation Summary, and Field Notes and Evidence.

## Why It Matters

Survey computations need a clear evidence trail. This release makes it easier to tell whether parcel beacons came directly from entered coordinates, an uploaded coordinate list, imported Topcon-style observations, a raw traverse reduction, or an adjusted traverse workflow.

## Testing Notes

- Compute a parcel from typed coordinates and confirm the Source card shows manual or edited coordinates.
- Load a parcel CSV and confirm the Source card changes to Parcel CSV upload.
- Import observation coordinates, use them as parcel beacons, and confirm exported reports record Imported observation coordinates.
- Use raw and adjusted traverse reductions as parcel beacons and confirm the Source card distinguishes the two paths.
- Save and reopen an Airban project file and confirm the parcel source is restored.
