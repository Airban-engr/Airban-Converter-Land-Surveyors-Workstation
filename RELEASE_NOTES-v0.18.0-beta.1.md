# Airban Converter v0.18.0-beta.1

This beta improves **Topcon-style coordinate observation imports** for The Land Surveyors Workstation.

## Added

- No-header observation column order selector.
- Support for `Point, Easting, Northing` no-header coordinate files.
- Support for `Point, Northing, Easting` no-header coordinate files.
- Saved Airban project files now preserve the selected no-header observation order.
- Field Notes and Evidence exports now record the interpreted observation column order.
- New sample file: `samples/topcon-no-header-northing-easting.csv`.

## Notes For Testers

- Use `samples/topcon-no-header-northing-easting.csv` with the no-header order set to `Point, Northing, Easting`.
- Confirm the first point imports as E `833356.39`, N `180404.48`.
- Headered files still auto-detect easting/northing columns and ignore the no-header order selector.
