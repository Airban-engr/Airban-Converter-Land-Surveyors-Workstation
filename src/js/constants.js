(function (ns) {
  ns.constants = {
    appVersion: "0.41.1-beta.1",
    releaseStage: "Internal beta",
    wgs84: "EPSG:4326",
    ghanaGrid: "EPSG:2136",
    utmZone30N: "EPSG:32630",
    utmZone31N: "EPSG:32631",
    projectionLabel: "Accra / Ghana National Grid",
    transformLabel: "EPSG:2136, EPSG:4326, EPSG:32630, EPSG:32631",
    goldCoastFootToMetre: 0.304799710181509,
    internationalFootToMetre: 0.3048,
    ghanaBounds: {
      south: 4.4,
      north: 11.3,
      west: -3.5,
      east: 1.5
    },
    ghanaGridProj4: "+proj=tmerc +lat_0=4.66666666666667 +lon_0=-1 +k=0.99975 +x_0=274319.739163358 +y_0=0 +a=6378300 +rf=296 +towgs84=-199,32,322,0,0,0,0 +to_meter=0.304799710181509 +no_defs +type=crs",
    utmZone30NProj4: "+proj=utm +zone=30 +datum=WGS84 +units=m +no_defs +type=crs",
    utmZone31NProj4: "+proj=utm +zone=31 +datum=WGS84 +units=m +no_defs +type=crs"
  };

  ns.ensureProjection = function ensureProjection() {
    if (!window.proj4) {
      throw new Error("Projection library is not available. Check your internet connection or move conversion to the backend.");
    }
    if (!ns.projectionRegistered) {
      window.proj4.defs(ns.constants.ghanaGrid, ns.constants.ghanaGridProj4);
      window.proj4.defs(ns.constants.utmZone30N, ns.constants.utmZone30NProj4);
      window.proj4.defs(ns.constants.utmZone31N, ns.constants.utmZone31NProj4);
      ns.projectionRegistered = true;
    }
  };
})(window.GhanaGrid = window.GhanaGrid || {});
