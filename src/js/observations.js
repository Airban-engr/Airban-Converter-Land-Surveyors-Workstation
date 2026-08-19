(function (ns) {
  const FIELD_CANDIDATES = {
    id: ["id", "point", "pointid", "pointname", "pointno", "pointnumber", "pt", "ptid", "ptno", "ptnumber", "pnt", "pntno", "pntnumber", "name", "station", "beacon"],
    easting: ["easting", "eastings", "east", "e", "x", "grid_easting", "ghanagrid_easting", "eastingcoord", "eastcoord", "ecoord", "gridx", "xcoord"],
    northing: ["northing", "northings", "north", "n", "y", "grid_northing", "ghanagrid_northing", "northingcoord", "northcoord", "ncoord", "gridy", "ycoord"],
    elevation: ["elevation", "elev", "height", "h", "z", "rl", "reducedlevel", "reducedlevel", "orthometricheight", "orthoheight", "orthoht", "ellipsoidheight", "ellipheight", "ellipht"],
    code: ["code", "desc", "description", "feature", "featurecode", "fc", "rawdescription", "rawdesc", "remark", "remarks"]
  };

  function normalise(value) {
    return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
  }

  function headerTokens(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[#]/g, " no ")
      .replace(/[^a-z0-9]+/g, " ")
      .split(/\s+/)
      .filter(Boolean);
  }

  function hasToken(tokens, candidates) {
    return candidates.some((candidate) => tokens.includes(candidate));
  }

  function headerMatches(header, kind) {
    const normalised = normalise(header);
    const candidates = FIELD_CANDIDATES[kind].map(normalise);
    if (candidates.includes(normalised)) return true;

    const tokens = headerTokens(header);
    if (!tokens.length) return false;

    if (kind === "id") {
      return hasToken(tokens, ["point", "pt", "pnt", "station", "beacon"])
        && (hasToken(tokens, ["id", "name", "no", "number", "num"]) || tokens.length === 1);
    }

    if (kind === "easting") {
      return hasToken(tokens, ["easting", "east"])
        || (hasToken(tokens, ["e", "x"]) && hasToken(tokens, ["coord", "coordinate", "grid", "local"]));
    }

    if (kind === "northing") {
      return hasToken(tokens, ["northing", "north"])
        || (hasToken(tokens, ["n", "y"]) && hasToken(tokens, ["coord", "coordinate", "grid", "local"]));
    }

    if (kind === "elevation") {
      return hasToken(tokens, ["elevation", "elev", "height", "ht", "rl", "z"])
        || (hasToken(tokens, ["ortho", "orthometric", "ellip", "ellipsoid"]) && hasToken(tokens, ["height", "ht"]));
    }

    if (kind === "code") {
      return hasToken(tokens, ["code", "desc", "description", "feature", "fc", "remark", "remarks"])
        || (hasToken(tokens, ["raw"]) && hasToken(tokens, ["desc", "description"]));
    }

    return false;
  }

  function cleanLines(text) {
    return String(text || "")
      .split(/\r?\n/)
      .map((line, index) => ({ raw: line, row: index + 1, text: line.trim() }))
      .filter((line) => line.text && !line.text.startsWith("#") && !line.text.startsWith("//"));
  }

  function detectDelimiter(line) {
    if (line.includes(",")) return ",";
    if (line.includes("\t")) return "\t";
    if (line.includes(";")) return ";";
    return "whitespace";
  }

  function splitDelimited(line, delimiter) {
    if (delimiter === "whitespace") return line.trim().split(/\s+/);

    const cells = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      const next = line[i + 1];
      if (char === '"' && inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        cells.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    cells.push(current.trim());
    return cells;
  }

  function headerIndex(headers, kind) {
    return headers.findIndex((header) => headerMatches(header, kind));
  }

  function rowLooksLikeHeader(cells) {
    const mapping = mappingFromHeaders(cells);
    return mapping.easting >= 0 && mapping.northing >= 0;
  }

  function parseNumeric(value) {
    const numeric = Number(String(value ?? "").trim().replace(/,/g, ""));
    return Number.isFinite(numeric) ? numeric : null;
  }

  function defaultMapping(cellCount, coordinateOrder) {
    const northingFirst = coordinateOrder === "id_northing_easting";
    return {
      id: 0,
      easting: cellCount > 2 ? (northingFirst ? 2 : 1) : -1,
      northing: cellCount > 2 ? (northingFirst ? 1 : 2) : -1,
      elevation: cellCount > 3 ? 3 : -1,
      code: cellCount > 4 ? 4 : -1
    };
  }

  function orderLabel(coordinateOrder, hasHeader) {
    if (hasHeader) return "Header detected";
    if (coordinateOrder === "id_northing_easting") return "Point, Northing, Easting";
    return "Point, Easting, Northing";
  }

  function mappingFromHeaders(headers) {
    return {
      id: headerIndex(headers, "id"),
      easting: headerIndex(headers, "easting"),
      northing: headerIndex(headers, "northing"),
      elevation: headerIndex(headers, "elevation"),
      code: headerIndex(headers, "code")
    };
  }

  function valueAt(cells, index) {
    if (index < 0 || index >= cells.length) return "";
    return String(cells[index] || "").trim();
  }

  function parse(text, options) {
    const parseOptions = options || {};
    const coordinateOrder = parseOptions.coordinateOrder || "id_easting_northing";
    const lines = cleanLines(text);
    if (!lines.length) throw new Error("Observation import file is empty.");

    const delimiter = detectDelimiter(lines[0].text);
    const firstCells = splitDelimited(lines[0].text, delimiter);
    const hasHeader = rowLooksLikeHeader(firstCells);
    const mapping = hasHeader ? mappingFromHeaders(firstCells) : defaultMapping(firstCells.length, coordinateOrder);
    const headerMap = hasHeader ? {
      id: valueAt(firstCells, mapping.id),
      easting: valueAt(firstCells, mapping.easting),
      northing: valueAt(firstCells, mapping.northing),
      elevation: valueAt(firstCells, mapping.elevation),
      code: valueAt(firstCells, mapping.code)
    } : null;
    if (mapping.easting < 0 || mapping.northing < 0) {
      throw new Error("Observation import needs easting and northing columns.");
    }

    const dataLines = hasHeader ? lines.slice(1) : lines;
    const points = [];
    const rejected = [];

    dataLines.forEach((line, index) => {
      const cells = splitDelimited(line.text, delimiter);
      const sourceRow = hasHeader ? index + 2 : line.row;
      const id = valueAt(cells, mapping.id) || `OBS${String(points.length + 1).padStart(3, "0")}`;
      const easting = parseNumeric(valueAt(cells, mapping.easting));
      const northing = parseNumeric(valueAt(cells, mapping.northing));
      const elevation = parseNumeric(valueAt(cells, mapping.elevation));
      const code = valueAt(cells, mapping.code);

      if (!Number.isFinite(easting) || !Number.isFinite(northing)) {
        rejected.push({
          row: sourceRow,
          raw: line.raw,
          reason: "Missing or invalid easting/northing"
        });
        return;
      }

      points.push({
        id: String(id).trim(),
        easting,
        northing,
        elevation,
        code,
        source_row: sourceRow
      });
    });

    if (!points.length) throw new Error("No usable observation coordinate points were found.");

    const duplicateIds = new Set();
    const seen = new Set();
    points.forEach((point) => {
      const key = normalise(point.id);
      if (seen.has(key)) duplicateIds.add(point.id);
      seen.add(key);
    });

    return {
      format: hasHeader ? "headered coordinate export" : orderLabel(coordinateOrder, hasHeader),
      coordinate_order: hasHeader ? "header_detected" : coordinateOrder,
      coordinate_order_label: orderLabel(coordinateOrder, hasHeader),
      delimiter,
      hasHeader,
      header_map: headerMap,
      points,
      rejected,
      duplicateIds: [...duplicateIds]
    };
  }

  function filterPoints(points, query) {
    const terms = String(query || "")
      .split(/[,\s]+/)
      .map((term) => term.trim().toLowerCase())
      .filter(Boolean);
    if (!terms.length) return points;
    return points.filter((point) => {
      const haystack = `${point.id} ${point.code || ""}`.toLowerCase();
      return terms.some((term) => haystack.includes(term));
    });
  }

  function toParcelCsv(points) {
    return [
      "id,easting,northing",
      ...points.map((point) => `${point.id},${point.easting},${point.northing}`)
    ].join("\n");
  }

  ns.observations = {
    parse,
    filterPoints,
    toParcelCsv
  };
})(window.GhanaGrid = window.GhanaGrid || {});
