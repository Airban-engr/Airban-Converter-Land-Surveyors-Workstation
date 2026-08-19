# Airban Converter v0.4.3-beta.1

Release stage: Internal beta

## Fix

- Separated Ghana Grid result units from WGS84 UTM result units.
- Batch conversion now clearly labels the Ghana Grid unit selector separately from the UTM output unit selector.
- CSV Grid outputs now use explicit `ghana_grid_easting`, `ghana_grid_northing`, and `ghana_grid_unit` columns.

## Note

Ghana Grid native feet are Gold Coast feet. WGS84 UTM feet are display/export international feet. They are intentionally controlled separately.
