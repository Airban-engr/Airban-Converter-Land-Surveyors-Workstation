# Airban Converter v0.30.0-beta.1

## Focus

This beta turns the History of Survey draft into a dedicated workstation module.

## Added

- Added a History of Survey card beside project details.
- Added a survey purpose field for the generated narrative.
- Added optional reported acreage and hectares fields for legal/reporting values that need to be controlled separately from computed area display rounding.
- Added a custom History of Survey wording field for professional edits or office-specific language.
- Added a Preview History action so the narrative can be drafted before parcel computation.
- Saved and restored History of Survey fields in Airban project files and browser drafts.

## Updated

- Generated History of Survey text now respects custom wording and reported area overrides.
- Survey workbook, branded report, manifest, and Copy History use the same final History of Survey text.
- Project file schema advanced to version 8.
- Service-worker cache advanced for beta testers.

## Verify

- Run the sample parcel, preview the History of Survey, then export workbook, report, and manifest.
- Confirm the exported history uses computed area by default.
- Enter reported acreage/hectare overrides and confirm exports use those values in the History of Survey section.
- Enter a custom History of Survey and confirm Copy History, workbook, report, and manifest use the custom text.
