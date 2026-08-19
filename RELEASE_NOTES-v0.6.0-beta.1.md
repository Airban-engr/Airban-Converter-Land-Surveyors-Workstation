# Airban Converter v0.6.0-beta.1

This beta deepens the first **Land Surveyors Workstation** module by adding workbook-style survey outputs based on the reference computation sheet structure.

## Added

- Parcel output tabs for `Plan Data`, `Beacon Index`, and `Area Computation`.
- Active CSV export for the currently selected workstation output.
- Excel-compatible survey workbook export with four sheets:
  - `BEACON INDEX`
  - `PLAN DATA`
  - `AREA COMPUTATION`
  - `HISTORY OF SURVEY`
- Parcel sample link in the batch sample area.
- Coordinate-method area rows using `Y(I)*(X(I+1)-X(I))` and `X(I)*(Y(I+1)-Y(I))`.

## Notes For Testers

- Compare workbook outputs against your trusted computation sheet before using them for production work.
- The workbook is exported as Excel-compatible `.xls` XML so the static web app can create it without a server.
- Direct Topcon Tools observation import is still planned for a later workstation milestone.
