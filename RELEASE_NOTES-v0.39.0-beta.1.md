# Airban Converter v0.39.0-beta.1

This beta cleans up the Parcel Workstation outputs around the sample computation workbook format.

## Added / Changed

- Computation Sheet export now contains only three formal sheets: `BEACON INDEX`, `BRG AND DISTANCE`, and `PLAN DATA`.
- Survey Workbook export now uses the same three clean formal sheets.
- Reference CORS/control rows are shown in the formal outputs as departure and closure ties, while area and perimeter still use only the enclosed parcel beacons.
- Beacon Index output follows the survey-office convention from the sample workbook: `X` is northing and `Y` is easting.
- Plan Data bearings now use degree/minute presentation with rounded minutes and distance to one decimal place.
- Branded report export now removes Computation Summary, Field Notes and Evidence, Quality Control, Geometry Review, Calculation Audit, and Area Computation sections.
- The Parcel Workstation preview no longer shows the Quality Control section, Geometry Review tab, or Calculation Audit tab.
- Service-worker cache bumped so hosted testers receive the updated output behavior.

## Testing Focus

- Test `samples/parcel-with-reference-cors.csv` and confirm the first reference appears before the first beacon and the last reference appears after the final parcel closure course.
- Confirm acreage and hectares do not change when reference rows are excluded from the area computation.
- Download the Computation Sheet and Workbook and confirm both open cleanly in Excel with the three expected sheets.
