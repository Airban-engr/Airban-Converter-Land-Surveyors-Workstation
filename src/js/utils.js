(function (ns) {
  ns.utils = {
    byId(id) {
      return document.getElementById(id);
    },

    parseNumber(value, name) {
      const numeric = Number(String(value ?? "").trim().replace(/,/g, ""));
      if (!Number.isFinite(numeric)) {
        throw new Error(`${name} must be a valid number.`);
      }
      return numeric;
    },

    escapeHtml(value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    },

    clampPercent(value) {
      return Math.max(4, Math.min(96, value));
    },

    inGhanaBounds(lat, lon) {
      const bounds = ns.constants.ghanaBounds;
      return lat >= bounds.south && lat <= bounds.north && lon >= bounds.west && lon <= bounds.east;
    }
  };
})(window.GhanaGrid = window.GhanaGrid || {});
