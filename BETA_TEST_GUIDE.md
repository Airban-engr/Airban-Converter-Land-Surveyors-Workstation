# Airban Converter Internal Beta Test Guide

Version: `0.41.1-beta.1`

Airban Converter is ready for controlled internal testing with a small group of colleagues. Treat this release as a beta, not yet as final survey production software.

## Who Should Test

- Surveyors or GIS users who understand Ghana National Grid coordinates
- Team members who can compare results against trusted control points
- Users who regularly work with parcel coordinate lists and CSV exports

## What To Test

1. Convert Ghana National Grid to WGS84.
2. Convert WGS84 to Ghana National Grid.
3. Convert WGS84 UTM zone 30N to Ghana National Grid.
4. Convert WGS84 UTM zone 31N when you have eastern-Ghana test data.
5. Confirm one-point WGS84 UTM output can switch between auto, zone 30N, and zone 31N.
6. Switch Ghana Grid result units and WGS84 UTM result units separately.
7. Parse DMS coordinates into decimal degrees.
8. Upload a CSV using `id,easting,northing`.
9. Upload a CSV using `id,latitude,longitude`.
10. Upload a CSV using `id,utm_easting,utm_northing,utm_zone`.
11. Export Ghana Grid CSV output in Gold Coast foot and metre.
12. Export UTM CSV output in metre and international foot.
13. Confirm all converted CSV points plot on the map with point IDs.
14. Download converted CSV output.
15. Export plotted points as GeoJSON.
16. Enter parcel project details: locality, district, client, regional number, reference CORS ID, survey date, and prepared by.
17. Confirm the Project Details section does not show issue date, checked by, revision/issue, or report status.
18. Compute a parcel from `id,easting,northing,remarks,computation_sheet_no,description_no,page,beacon_remarks`.
19. Confirm the Parcel Coordinates section shows the accepted format and preferred parcel unit.
20. Change the preferred parcel unit and confirm the parcel result recomputes.
21. Test `samples/parcel-with-reference-cors.csv` with Reference rows set to auto-detect.
22. Confirm CORS/reference rows are excluded from area, perimeter, KML, KMZ, DXF, and GeoJSON parcel geometry, but appear as departure/closure ties in Beacon Index, Bearing and Distance, Plan Data, workbook, computation sheet, report, and manifest outputs.
23. Switch Reference rows to `Exclude first and last rows` and confirm the same enclosed parcel is used when reference rows are not labelled.
24. Switch Reference rows to `Include every row` only for a controlled test and confirm the computation basis changes.
25. Confirm the parcel summary shows beacons, perimeter, acres, hectares, source, input rows, reference rows, and row rule.
26. Add a final row that repeats the first beacon coordinate and confirm the app reports that the repeated closing row was excluded.
27. Confirm repeated closing-row handling does not change the enclosed parcel area.
28. Enter History purpose and optional reported acreage/hectare values.
29. Confirm the History of Survey preview updates and can be copied.
30. Export the History of Survey as a Word document and confirm it opens in Microsoft Word.
31. Confirm the desktop layout shows Coordinate Tools, Output, and Batch CSV in the upper converter workspace, with Parcel Workstation across the lower workspace and no map overlap while scrolling.
32. Switch between Plan Data, Bearing & Distance, Beacon Index, and Area Computation previews.
33. Confirm reference CORS rows appear in Plan Data, Bearing & Distance, and Beacon Index when the sample has first/last reference rows.
34. Confirm the Beacon Index preview is clean, with Beacon, X, Y, Unit, and Reference columns.
35. Confirm the Quality Control section, Geometry Review tab, and Calculation Audit tab are no longer visible.
36. Download the active parcel CSV.
37. Download the formula-backed Computation Sheet and confirm it includes only Beacon Index, Bearing and Distance from Coordinates, and Plan Data sheets.
38. Download the survey workbook and confirm it uses the same three clean formal sheets.
39. Download the branded survey report and confirm it includes the logo, project summary, parcel sketch, History of Survey, Beacon Index, Bearing and Distance from Coordinates, and Plan Data.
40. Download the Survey Package Manifest and confirm it records package review, reference-row handling, the clean export set, KMZ availability, and History of Survey.
41. Download KML and KMZ, then confirm each opens in Google Earth or a KML/KMZ viewer with the parcel polygon, boundary courses, beacon placemarks, and metadata.
42. Download DXF and confirm it opens in CAD/GIS software with parcel boundary, course labels, beacon labels, and parcel notes.
43. Confirm the Project Files section is no longer visible in the Parcel Workstation.
44. Confirm the desktop scaffold files exist: `package.json`, `desktop/main.js`, `desktop/preload.js`, and `desktop/build-windows.ps1`.
45. When Node dependencies are available, run `npm install` and `npm run desktop` from the app folder to test the Electron shell.
46. When packaging dependencies are available, run `npm run dist:win` to build the Windows installer.
47. Open the hosted HTTPS URL on Android Chrome, not the downloaded `index.html` file.
48. Open the hosted HTTPS URL on iPhone Safari, not the Files preview.
49. Install the app from a desktop browser and reopen it from the desktop/start menu.
50. Add the app to a mobile home screen and confirm it opens in standalone mode.

## Minimum Browser Coverage

- Microsoft Edge on Windows
- Google Chrome on Windows
- Google Chrome on Android
- Safari on iPhone or iPad

## Accuracy Notes

- Confirm all test conversions against known Ghana control points.
- For cadastral or legal work, validate the transformation method required by the relevant authority before final submission.
- The online basemap requires internet access; computations and export generation are designed to work from the local app shell.
