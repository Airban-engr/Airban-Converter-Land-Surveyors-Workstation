# Airban Converter v0.5.0-beta.1

This beta introduces the first **Land Surveyors Workstation** feature set inside Airban Converter.

## Added

- Parcel Workstation panel for project details and parcel beacon coordinates.
- Pasted or uploaded `id,easting,northing` parcel coordinate input.
- Bearing and distance schedule between consecutive parcel beacons.
- Parcel perimeter, acreage, and hectares.
- History of Survey draft text using locality, district, client, regional number, CORS ID, and computed area.
- Parcel polygon preview on the map with beacon IDs.
- Parcel plan CSV export.
- Sample parcel beacon CSV at `samples/parcel-beacons.csv`.

## Notes For Testers

- Compare parcel bearings, distances, and areas against trusted Excel computation sheets before production use.
- Coordinates are processed in the selected Ghana Grid unit. Gold Coast foot remains the EPSG-native Ghana Grid unit.
- This release is still an internal beta and does not yet import Topcon Tools observations directly.
