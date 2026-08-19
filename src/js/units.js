(function (ns) {
  const { goldCoastFootToMetre, internationalFootToMetre } = ns.constants;

  ns.units = {
    toNative(value, unit) {
      if (unit === "gold_coast_foot") return value;
      if (unit === "metre") return value / goldCoastFootToMetre;
      if (unit === "international_foot") return (value * internationalFootToMetre) / goldCoastFootToMetre;
      return value;
    },

    fromNative(value, unit) {
      if (unit === "gold_coast_foot") return value;
      if (unit === "metre") return value * goldCoastFootToMetre;
      if (unit === "international_foot") return (value * goldCoastFootToMetre) / internationalFootToMetre;
      return value;
    },

    label(unit) {
      if (unit === "metre") return "m";
      if (unit === "international_foot") return "ft";
      return "Gold Coast ft";
    },

    fromMetre(value, unit) {
      if (unit === "international_foot") return value / internationalFootToMetre;
      return value;
    },

    toMetre(value, unit) {
      if (unit === "international_foot") return value * internationalFootToMetre;
      return value;
    },

    metricLabel(unit) {
      if (unit === "international_foot") return "ft";
      return "m";
    },

    csvSuffix(unit) {
      if (unit === "international_foot") return "ft";
      return "m";
    }
  };
})(window.GhanaGrid = window.GhanaGrid || {});
