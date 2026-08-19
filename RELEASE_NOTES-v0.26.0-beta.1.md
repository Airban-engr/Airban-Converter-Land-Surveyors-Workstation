# Airban Converter v0.26.0-beta.1

## Added

- Report sign-off and issue-control fields in Project Details:
  - Survey date
  - Issue date
  - Prepared by / surveyor
  - Checked by
  - Revision / issue
  - Report status
- Quality Control check for missing report sign-off fields.
- Issue Control section in the branded survey report.
- Sign-off metadata in Computation Summary and Field Notes workbook/report sections.
- Sign-off metadata in Survey Package Manifest package review and evidence sections.
- Issue-control metadata in parcel GeoJSON, KML, and DXF exports.

## Changed

- Airban project schema version increased to `7` so project files preserve sign-off and issue-control metadata.
- The built-in sample parcel now populates sign-off fields for clean beta testing.

## Notes

- Older Airban project files can still be opened. New sign-off fields will be blank until the user fills them in.
