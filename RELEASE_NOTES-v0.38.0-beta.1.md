# Airban Converter v0.38.0-beta.1

This beta tightens the Parcel Workstation interface and adds requested map-package and UTM-zone controls while leaving the coordinate converter logic unchanged.

## Added

- One-point WGS84 UTM output zone selector: auto, zone 30N, or zone 31N.
- Parcel KMZ export beside the existing KML export.
- Accepted parcel coordinate format reference in the Parcel Coordinates section.
- Preferred parcel unit selector inside the Parcel Coordinates section.

## Changed

- Removed issue date, checked by, revision/issue, and report status from the visible Project Details form.
- Removed the visible Project Files section from the Parcel Workstation.
- Parcel unit and reference-row changes now recompute the current parcel when coordinates are already present.

## Next

- Workbook, computation sheet, and report layout cleanup is queued for the next pass after reviewing a preferred sample format.
