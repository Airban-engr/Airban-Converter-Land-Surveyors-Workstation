(function (ns) {
  function normaliseHeader(value) {
    return String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  }

  function rowLooksLikeHeader(row) {
    const knownHeaders = new Set([
      "id", "point", "pointid", "name",
      "easting", "eastings", "east", "x",
      "northing", "northings", "north", "y",
      "latitude", "lat", "longitude", "lon", "lng",
      "utmeasting", "utmnorthing", "utmzone", "zone"
    ]);
    return row.some((cell) => knownHeaders.has(normaliseHeader(cell)));
  }

  function defaultHeadersForMode(mode, columnCount) {
    if (mode === "grid_to_wgs" || mode === "grid_to_utm") {
      if (columnCount >= 3) return ["id", "easting", "northing", ...Array.from({ length: columnCount - 3 }, (_, index) => `extra_${index + 1}`)];
      return ["easting", "northing", ...Array.from({ length: Math.max(0, columnCount - 2) }, (_, index) => `extra_${index + 1}`)];
    }
    if (mode === "utm_to_grid") {
      if (columnCount >= 4) return ["id", "utm_easting", "utm_northing", "utm_zone", ...Array.from({ length: columnCount - 4 }, (_, index) => `extra_${index + 1}`)];
      if (columnCount >= 3) return ["id", "utm_easting", "utm_northing", ...Array.from({ length: columnCount - 3 }, (_, index) => `extra_${index + 1}`)];
      return ["utm_easting", "utm_northing", ...Array.from({ length: Math.max(0, columnCount - 2) }, (_, index) => `extra_${index + 1}`)];
    }
    if (columnCount >= 3) return ["id", "latitude", "longitude", ...Array.from({ length: columnCount - 3 }, (_, index) => `extra_${index + 1}`)];
    return ["latitude", "longitude", ...Array.from({ length: Math.max(0, columnCount - 2) }, (_, index) => `extra_${index + 1}`)];
  }

  function escapeCsvCell(value) {
    const text = String(value ?? "");
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  ns.csv = {
    normaliseHeader,

    parse(text, mode) {
      const rows = [];
      let current = [];
      let value = "";
      let inQuotes = false;

      for (let i = 0; i < text.length; i += 1) {
        const char = text[i];
        const next = text[i + 1];
        if (char === '"' && inQuotes && next === '"') {
          value += '"';
          i += 1;
        } else if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          current.push(value);
          value = "";
        } else if ((char === "\n" || char === "\r") && !inQuotes) {
          if (char === "\r" && next === "\n") i += 1;
          current.push(value);
          if (current.some((cell) => cell.trim() !== "")) rows.push(current);
          current = [];
          value = "";
        } else {
          value += char;
        }
      }

      current.push(value);
      if (current.some((cell) => cell.trim() !== "")) rows.push(current);
      if (!rows.length) throw new Error("CSV file is empty.");

      const hasHeader = rowLooksLikeHeader(rows[0]);
      const headers = hasHeader ? rows[0].map((header) => header.trim()) : defaultHeadersForMode(mode, rows[0].length);
      const dataRows = hasHeader ? rows.slice(1) : rows;
      if (!dataRows.length) throw new Error("CSV needs at least one data row.");

      return {
        hasHeader,
        rows: dataRows.map((row) => {
          const record = {};
          headers.forEach((header, index) => {
            record[header] = row[index] ? row[index].trim() : "";
          });
          return record;
        })
      };
    },

    getColumn(record, candidates) {
      const keys = Object.keys(record);
      const normalisedCandidates = candidates.map(normaliseHeader);
      const match = keys.find((key) => normalisedCandidates.includes(normaliseHeader(key)));
      if (!match) return undefined;
      return record[match];
    },

    rowsToCsv(rows) {
      if (!rows.length) return "";
      const headers = Object.keys(rows[0]);
      return [
        headers.map(escapeCsvCell).join(","),
        ...rows.map((row) => headers.map((header) => escapeCsvCell(row[header])).join(","))
      ].join("\n");
    }
  };
})(window.GhanaGrid = window.GhanaGrid || {});
