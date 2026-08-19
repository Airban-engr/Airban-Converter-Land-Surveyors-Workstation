(function (ns) {
  function decimalToParts(decimal, axis) {
    const direction = axis === "lat"
      ? decimal < 0 ? "S" : "N"
      : decimal < 0 ? "W" : "E";
    const absolute = Math.abs(decimal);
    const degrees = Math.floor(absolute);
    const minutesFloat = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = (minutesFloat - minutes) * 60;
    return { degrees, minutes, seconds, direction };
  }

  ns.dms = {
    decimalToDms(decimal, axis) {
      const { degrees, minutes, seconds, direction } = decimalToParts(decimal, axis);
      return `${degrees} deg ${minutes}' ${seconds.toFixed(3)}" ${direction}`;
    },

    dmsToDecimal(degrees, minutes, seconds, direction) {
      const deg = ns.utils.parseNumber(degrees, "Degrees");
      const min = ns.utils.parseNumber(minutes || 0, "Minutes");
      const sec = ns.utils.parseNumber(seconds || 0, "Seconds");
      if (min < 0 || min >= 60) throw new Error("Minutes must be between 0 and 59.999.");
      if (sec < 0 || sec >= 60) throw new Error("Seconds must be between 0 and 59.999.");
      const sign = ["S", "W"].includes(String(direction).toUpperCase()) || deg < 0 ? -1 : 1;
      return sign * (Math.abs(deg) + min / 60 + sec / 3600);
    },

    parseFreeform(value) {
      const normalized = value
        .trim()
        .replace(/[−–—]/g, "-")
        .replace(/[º˚°]/g, " deg ")
        .replace(/[′’]/g, "'")
        .replace(/[″”]/g, '"');

      const matches = [...normalized.matchAll(/(-?\d+(?:\.\d+)?)\s*(?:deg|d)?\s*(\d+(?:\.\d+)?)?\s*(?:'|m)?\s*(\d+(?:\.\d+)?)?\s*(?:"|s)?\s*([NSEW])/gi)];
      if (matches.length < 2) {
        throw new Error("Paste two DMS values, for example 5 deg 10' 0.575\" N, 1 deg 10' 58.808\" W.");
      }

      const parsed = {};
      matches.forEach((match) => {
        const direction = match[4].toUpperCase();
        const decimal = ns.dms.dmsToDecimal(match[1], match[2] || 0, match[3] || 0, direction);
        if (direction === "N" || direction === "S") parsed.lat = decimal;
        if (direction === "E" || direction === "W") parsed.lon = decimal;
      });

      if (!Number.isFinite(parsed.lat) || !Number.isFinite(parsed.lon)) {
        throw new Error("Could not identify both latitude and longitude DMS values.");
      }
      return parsed;
    }
  };
})(window.GhanaGrid = window.GhanaGrid || {});
