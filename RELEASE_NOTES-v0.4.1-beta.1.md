# Airban Converter v0.4.1-beta.1

Release stage: Internal beta

## Update

- Added WGS84 UTM result display units.
- UTM Results panel can show metre or international foot.
- Copy Results now respects the selected UTM display unit.
- CSV batch output can export UTM easting/northing in metre or international foot.
- GeoJSON properties include UTM attributes in the selected display unit while point geometry remains WGS84 longitude/latitude.

## Note

WGS84 / UTM EPSG definitions are metre-based. Feet output is a display/export conversion only; the internal projection calculation still uses metres.
