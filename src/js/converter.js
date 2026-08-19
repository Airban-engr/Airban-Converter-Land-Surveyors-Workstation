(function (ns) {
  function normaliseUtmZone(zone) {
    const text = String(zone || "").trim().toUpperCase().replace(/\s+/g, "");
    if (text === "30" || text === "30N" || text === "EPSG:32630" || text === "32630") return "30N";
    if (text === "31" || text === "31N" || text === "EPSG:32631" || text === "32631") return "31N";
    throw new Error("UTM zone must be 30N or 31N for Ghana.");
  }

  function utmCrs(zone) {
    const normalised = normaliseUtmZone(zone);
    return normalised === "31N" ? ns.constants.utmZone31N : ns.constants.utmZone30N;
  }

  function autoUtmZone(lon) {
    return lon >= 0 ? "31N" : "30N";
  }

  ns.converter = {
    normaliseUtmZone,
    autoUtmZone,
    utmCrs,

    gridToWgs(easting, northing, unit) {
      ns.ensureProjection();
      const nativeEasting = ns.units.toNative(easting, unit);
      const nativeNorthing = ns.units.toNative(northing, unit);
      const result = window.proj4(ns.constants.ghanaGrid, ns.constants.wgs84, [nativeEasting, nativeNorthing]);
      return { lon: result[0], lat: result[1] };
    },

    wgsToGrid(lat, lon, unit) {
      ns.ensureProjection();
      const result = window.proj4(ns.constants.wgs84, ns.constants.ghanaGrid, [lon, lat]);
      return {
        easting: ns.units.fromNative(result[0], unit),
        northing: ns.units.fromNative(result[1], unit)
      };
    },

    wgsToUtm(lat, lon, zone) {
      ns.ensureProjection();
      const selectedZone = zone === "auto" || !zone ? autoUtmZone(lon) : normaliseUtmZone(zone);
      const result = window.proj4(ns.constants.wgs84, utmCrs(selectedZone), [lon, lat]);
      return {
        easting: result[0],
        northing: result[1],
        zone: selectedZone,
        crs: utmCrs(selectedZone)
      };
    },

    utmToWgs(easting, northing, zone) {
      ns.ensureProjection();
      const selectedZone = normaliseUtmZone(zone);
      const result = window.proj4(utmCrs(selectedZone), ns.constants.wgs84, [easting, northing]);
      return {
        lon: result[0],
        lat: result[1],
        zone: selectedZone,
        crs: utmCrs(selectedZone)
      };
    },

    utmToGrid(easting, northing, zone, unit) {
      const wgs = this.utmToWgs(easting, northing, zone);
      const grid = this.wgsToGrid(wgs.lat, wgs.lon, unit);
      return {
        lat: wgs.lat,
        lon: wgs.lon,
        easting: grid.easting,
        northing: grid.northing,
        zone: wgs.zone,
        crs: wgs.crs
      };
    },

    gridToUtm(easting, northing, unit, zone) {
      const wgs = this.gridToWgs(easting, northing, unit);
      const utm = this.wgsToUtm(wgs.lat, wgs.lon, zone || "auto");
      return {
        lat: wgs.lat,
        lon: wgs.lon,
        easting: utm.easting,
        northing: utm.northing,
        zone: utm.zone,
        crs: utm.crs
      };
    }
  };
})(window.GhanaGrid = window.GhanaGrid || {});
