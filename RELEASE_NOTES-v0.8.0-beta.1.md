# Airban Converter v0.8.0-beta.1

This beta adds a branded report export for **The Land Surveyors Workstation**.

## Added

- Branded print-ready survey report export as `airban-survey-report.html`.
- Airban-branded report header using the logo asset.
- Project summary cards for locality, district, client, regional number, CORS ID, beacons, acreage, and hectares.
- Schematic parcel sketch generated from beacon coordinates.
- Report sections for History of Survey, Beacon Index, Plan Data, and Area Computation.
- Print-friendly styling so the HTML report can be opened and printed or saved to PDF by the browser.

## Notes For Testers

- The report sketch is a schematic coordinate preview, not a replacement for the formal cadastral plan drawing.
- The report references the Airban logo asset from the hosted/local app folder. Keep the report with access to the app asset path when possible.
- For formal submissions, compare the report values against your trusted computation sheet and required authority format.
