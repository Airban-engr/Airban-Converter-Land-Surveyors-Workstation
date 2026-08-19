(function (ns) {
  function normaliseBearing(degrees) {
    return ((degrees % 360) + 360) % 360;
  }

  function decimalToDmsParts(decimalDegrees) {
    let degrees = Math.floor(normaliseBearing(decimalDegrees));
    const minutesDecimal = (normaliseBearing(decimalDegrees) - degrees) * 60;
    let minutes = Math.floor(minutesDecimal);
    let seconds = Math.round((minutesDecimal - minutes) * 60);
    if (seconds === 60) {
      seconds = 0;
      minutes += 1;
    }
    if (minutes === 60) {
      minutes = 0;
      degrees += 1;
    }
    return { degrees: degrees % 360, minutes, seconds };
  }

  function formatBearing(decimalDegrees) {
    const parts = decimalToDmsParts(decimalDegrees);
    return `${String(parts.degrees).padStart(3, "0")} deg ${String(parts.minutes).padStart(2, "0")}' ${String(parts.seconds).padStart(2, "0")}"`;
  }

  function parseDmsValue(value) {
    const numbers = String(value || "").match(/-?\d+(?:\.\d+)?/g);
    if (!numbers || !numbers.length) return null;
    const sign = Number(numbers[0]) < 0 ? -1 : 1;
    const degrees = Math.abs(Number(numbers[0]));
    const minutes = numbers[1] ? Math.abs(Number(numbers[1])) : 0;
    const seconds = numbers[2] ? Math.abs(Number(numbers[2])) : 0;
    return sign * (degrees + (minutes / 60) + (seconds / 3600));
  }

  function parseBearing(value) {
    const text = String(value || "").trim().toUpperCase();
    if (!text) throw new Error("Bearing is required.");

    const quadrant = text.match(/^([NS])\s*(.+?)\s*([EW])$/);
    if (quadrant) {
      const angle = parseDmsValue(quadrant[2]);
      if (!Number.isFinite(angle)) throw new Error(`Invalid quadrant bearing: ${value}`);
      if (angle < 0 || angle > 90) throw new Error(`Quadrant bearing angle must be 0 to 90 degrees: ${value}`);
      const nsDir = quadrant[1];
      const ewDir = quadrant[3];
      if (nsDir === "N" && ewDir === "E") return normaliseBearing(angle);
      if (nsDir === "S" && ewDir === "E") return normaliseBearing(180 - angle);
      if (nsDir === "S" && ewDir === "W") return normaliseBearing(180 + angle);
      return normaliseBearing(360 - angle);
    }

    const decimal = Number(text.replace(/,/g, ""));
    if (Number.isFinite(decimal)) return normaliseBearing(decimal);

    const dms = parseDmsValue(text);
    if (!Number.isFinite(dms)) throw new Error(`Invalid bearing: ${value}`);
    return normaliseBearing(dms);
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

  function normaliseHeader(value) {
    return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
  }

  function headerIndex(headers, candidates) {
    const normalised = candidates.map(normaliseHeader);
    return headers.findIndex((header) => normalised.includes(normaliseHeader(header)));
  }

  function rowLooksLikeHeader(cells) {
    const known = [
      "to", "point", "pointid", "station", "beacon", "id",
      "bearing", "brg", "azimuth", "wcb",
      "angle", "observedangle", "deflection", "interiorangle",
      "distance", "dist", "length",
      "code", "remark", "remarks", "description"
    ];
    return cells.some((cell) => known.includes(normaliseHeader(cell)));
  }

  function parseDistance(value, row) {
    const numeric = Number(String(value ?? "").trim().replace(/,/g, ""));
    if (!Number.isFinite(numeric)) throw new Error(`Row ${row} distance must be a valid number.`);
    if (numeric < 0) throw new Error(`Row ${row} distance cannot be negative.`);
    return numeric;
  }

  function parseRows(text) {
    const lines = cleanLines(text);
    if (!lines.length) throw new Error("Bearing/distance observation text is empty.");
    const delimiter = detectDelimiter(lines[0].text);
    const firstCells = splitDelimited(lines[0].text, delimiter);
    const hasHeader = rowLooksLikeHeader(firstCells);
    const headers = hasHeader ? firstCells : ["to", "bearing", "distance", "code"];
    const mapping = {
      to: headerIndex(headers, ["to", "point", "pointid", "station", "beacon", "id"]),
      bearing: headerIndex(headers, ["bearing", "brg", "azimuth", "wcb"]),
      distance: headerIndex(headers, ["distance", "dist", "length"]),
      code: headerIndex(headers, ["code", "remark", "remarks", "description"])
    };
    if (mapping.to < 0 || mapping.bearing < 0 || mapping.distance < 0) {
      throw new Error("Bearing/distance rows need point, bearing, and distance columns.");
    }

    const dataLines = hasHeader ? lines.slice(1) : lines;
    return dataLines.map((line, index) => {
      const sourceRow = hasHeader ? index + 2 : line.row;
      const cells = splitDelimited(line.text, delimiter);
      const to = String(cells[mapping.to] || "").trim() || `OBS${String(index + 1).padStart(3, "0")}`;
      const bearing = parseBearing(cells[mapping.bearing]);
      const distance = parseDistance(cells[mapping.distance], sourceRow);
      const code = mapping.code >= 0 ? String(cells[mapping.code] || "").trim() : "";
      return {
        source_row: sourceRow,
        to,
        bearing,
        bearing_dms: formatBearing(bearing),
        distance,
        code
      };
    });
  }

  function reduceParsedObservations(options, observations) {
    const unit = options.unit || "gold_coast_foot";
    const startId = String(options.startId || "START").trim() || "START";
    const startEasting = ns.utils.parseNumber(options.easting, "Starting easting");
    const startNorthing = ns.utils.parseNumber(options.northing, "Starting northing");
    if (!observations.length) throw new Error("At least one bearing/distance row is required.");

    let nativeEasting = ns.units.toNative(startEasting, unit);
    let nativeNorthing = ns.units.toNative(startNorthing, unit);
    const points = [{
      id: startId,
      easting: startEasting,
      northing: startNorthing,
      nativeEasting,
      nativeNorthing,
      source: "start"
    }];
    let totalDistanceNative = 0;

    const lines = observations.map((observation, index) => {
      const from = points[points.length - 1];
      const distanceNative = ns.units.toNative(observation.distance, unit);
      const radians = observation.bearing * Math.PI / 180;
      const deltaEastingNative = distanceNative * Math.sin(radians);
      const deltaNorthingNative = distanceNative * Math.cos(radians);
      nativeEasting += deltaEastingNative;
      nativeNorthing += deltaNorthingNative;
      totalDistanceNative += distanceNative;
      const point = {
        id: observation.to,
        easting: ns.units.fromNative(nativeEasting, unit),
        northing: ns.units.fromNative(nativeNorthing, unit),
        nativeEasting,
        nativeNorthing,
        source: "reduced",
        code: observation.code,
        source_row: observation.source_row
      };
      points.push(point);
      return {
        index: index + 1,
        source_row: observation.source_row,
        from: from.id,
        to: point.id,
        bearing: observation.bearing,
        bearing_dms: observation.bearing_dms,
        distance: observation.distance,
        distance_native: distanceNative,
        delta_easting_native: deltaEastingNative,
        delta_northing_native: deltaNorthingNative,
        delta_easting: ns.units.fromNative(deltaEastingNative, unit),
        delta_northing: ns.units.fromNative(deltaNorthingNative, unit),
        observed_angle: observation.observed_angle,
        observed_angle_dms: observation.observed_angle_dms,
        angle_mode: observation.angle_mode,
        code: observation.code
      };
    });

    const first = points[0];
    const last = points[points.length - 1];
    const closeDeltaEastingNative = last.nativeEasting - first.nativeEasting;
    const closeDeltaNorthingNative = last.nativeNorthing - first.nativeNorthing;
    const closeErrorNative = Math.hypot(closeDeltaEastingNative, closeDeltaNorthingNative);
    const precision = closeErrorNative > 0 ? totalDistanceNative / closeErrorNative : Infinity;

    return {
      start: first,
      points,
      parcel_points: parcelPoints(points),
      lines,
      closed_traverse: normaliseHeader(first.id) === normaliseHeader(last.id),
      unit,
      unit_label: ns.units.label(unit),
      total_distance: ns.units.fromNative(totalDistanceNative, unit),
      total_distance_native: totalDistanceNative,
      close_delta_easting_native: closeDeltaEastingNative,
      close_delta_northing_native: closeDeltaNorthingNative,
      close_error_native: closeErrorNative,
      close_delta_easting: ns.units.fromNative(closeDeltaEastingNative, unit),
      close_delta_northing: ns.units.fromNative(closeDeltaNorthingNative, unit),
      close_error: ns.units.fromNative(closeErrorNative, unit),
      precision
    };
  }

  function reduceBearingDistance(options) {
    return reduceParsedObservations(options, parseRows(options.text));
  }

  function parseAngularRows(text) {
    const lines = cleanLines(text);
    if (!lines.length) throw new Error("Angular traverse observation text is empty.");
    const delimiter = detectDelimiter(lines[0].text);
    const firstCells = splitDelimited(lines[0].text, delimiter);
    const hasHeader = rowLooksLikeHeader(firstCells);
    const headers = hasHeader ? firstCells : ["to", "angle", "distance", "code"];
    const mapping = {
      to: headerIndex(headers, ["to", "point", "pointid", "station", "beacon", "id"]),
      angle: headerIndex(headers, ["angle", "observedangle", "deflection", "interiorangle"]),
      distance: headerIndex(headers, ["distance", "dist", "length"]),
      code: headerIndex(headers, ["code", "remark", "remarks", "description"])
    };
    if (mapping.to < 0 || mapping.angle < 0 || mapping.distance < 0) {
      throw new Error("Angular traverse rows need point, angle, and distance columns.");
    }

    const dataLines = hasHeader ? lines.slice(1) : lines;
    return dataLines.map((line, index) => {
      const sourceRow = hasHeader ? index + 2 : line.row;
      const cells = splitDelimited(line.text, delimiter);
      const rawAngle = String(cells[mapping.angle] || "").trim();
      const angle = rawAngle ? parseDmsValue(rawAngle) : null;
      if (rawAngle && !Number.isFinite(angle)) throw new Error(`Row ${sourceRow} angle must be a valid DMS or decimal angle.`);
      const to = String(cells[mapping.to] || "").trim() || `OBS${String(index + 1).padStart(3, "0")}`;
      const distance = parseDistance(cells[mapping.distance], sourceRow);
      const code = mapping.code >= 0 ? String(cells[mapping.code] || "").trim() : "";
      return {
        source_row: sourceRow,
        to,
        angle,
        angle_dms: Number.isFinite(angle) ? formatBearing(angle) : "",
        distance,
        code
      };
    });
  }

  function nextBearing(previousBearing, observedAngle, angleMode, row) {
    if (!Number.isFinite(observedAngle)) {
      throw new Error(`Row ${row} needs an observed angle after the first traverse leg.`);
    }
    if (angleMode === "deflection_left") return normaliseBearing(previousBearing - observedAngle);
    if (angleMode === "interior_right") return normaliseBearing(previousBearing + 180 - observedAngle);
    if (angleMode === "interior_left") return normaliseBearing(previousBearing - 180 + observedAngle);
    return normaliseBearing(previousBearing + observedAngle);
  }

  function angularModeLabel(angleMode) {
    return {
      deflection_right: "Deflection right",
      deflection_left: "Deflection left",
      interior_right: "Interior angle right",
      interior_left: "Interior angle left"
    }[angleMode] || "Deflection right";
  }

  function reduceAngularTraverse(options) {
    const angleMode = options.angleMode || "deflection_right";
    let bearing = parseBearing(options.initialBearing);
    const rows = parseAngularRows(options.text);
    const observations = rows.map((row, index) => {
      if (index > 0) bearing = nextBearing(bearing, row.angle, angleMode, row.source_row);
      return {
        source_row: row.source_row,
        to: row.to,
        bearing,
        bearing_dms: formatBearing(bearing),
        distance: row.distance,
        observed_angle: Number.isFinite(row.angle) ? row.angle : "",
        observed_angle_dms: row.angle_dms,
        angle_mode: angularModeLabel(angleMode),
        code: row.code
      };
    });
    const result = reduceParsedObservations(options, observations);
    result.source_mode = "angular_traverse";
    result.initial_bearing = parseBearing(options.initialBearing);
    result.initial_bearing_dms = formatBearing(result.initial_bearing);
    result.angle_mode = angleMode;
    result.angle_mode_label = angularModeLabel(angleMode);
    return result;
  }

  function adjustCompassRule(result) {
    if (!result || !result.lines || !result.points) {
      throw new Error("Reduce bearing/distance observations before adjustment.");
    }
    if (!result.closed_traverse) {
      throw new Error("Bowditch adjustment needs a closed traverse. End the traverse on the starting point ID.");
    }
    if (!(result.total_distance_native > 0)) {
      throw new Error("Bowditch adjustment needs positive traverse distance.");
    }

    const unit = result.unit || "gold_coast_foot";
    const first = result.points[0];
    let nativeEasting = first.nativeEasting;
    let nativeNorthing = first.nativeNorthing;
    const adjustedPoints = [{
      ...first,
      source: "adjusted_start",
      correction_easting: 0,
      correction_northing: 0
    }];
    let cumulativeCorrectionEasting = 0;
    let cumulativeCorrectionNorthing = 0;

    const adjustedLines = result.lines.map((line) => {
      const ratio = line.distance_native / result.total_distance_native;
      const correctionEastingNative = -result.close_delta_easting_native * ratio;
      const correctionNorthingNative = -result.close_delta_northing_native * ratio;
      const adjustedDeltaEastingNative = line.delta_easting_native + correctionEastingNative;
      const adjustedDeltaNorthingNative = line.delta_northing_native + correctionNorthingNative;
      nativeEasting += adjustedDeltaEastingNative;
      nativeNorthing += adjustedDeltaNorthingNative;
      cumulativeCorrectionEasting += correctionEastingNative;
      cumulativeCorrectionNorthing += correctionNorthingNative;

      const point = {
        id: line.to,
        easting: ns.units.fromNative(nativeEasting, unit),
        northing: ns.units.fromNative(nativeNorthing, unit),
        nativeEasting,
        nativeNorthing,
        source: "adjusted",
        code: line.code,
        source_row: line.source_row,
        correction_easting: ns.units.fromNative(cumulativeCorrectionEasting, unit),
        correction_northing: ns.units.fromNative(cumulativeCorrectionNorthing, unit)
      };
      adjustedPoints.push(point);

      return {
        ...line,
        correction_easting: ns.units.fromNative(correctionEastingNative, unit),
        correction_northing: ns.units.fromNative(correctionNorthingNative, unit),
        adjusted_delta_easting: ns.units.fromNative(adjustedDeltaEastingNative, unit),
        adjusted_delta_northing: ns.units.fromNative(adjustedDeltaNorthingNative, unit)
      };
    });

    const last = adjustedPoints[adjustedPoints.length - 1];
    const adjustedCloseDeltaEastingNative = last.nativeEasting - first.nativeEasting;
    const adjustedCloseDeltaNorthingNative = last.nativeNorthing - first.nativeNorthing;
    const adjustedCloseErrorNative = Math.hypot(adjustedCloseDeltaEastingNative, adjustedCloseDeltaNorthingNative);

    return {
      method: "Bowditch / Compass Rule",
      source: result,
      unit,
      unit_label: result.unit_label,
      points: adjustedPoints,
      parcel_points: parcelPoints(adjustedPoints),
      lines: adjustedLines,
      total_distance: result.total_distance,
      close_error_before: result.close_error,
      close_error_after: ns.units.fromNative(adjustedCloseErrorNative, unit),
      close_delta_easting_after: ns.units.fromNative(adjustedCloseDeltaEastingNative, unit),
      close_delta_northing_after: ns.units.fromNative(adjustedCloseDeltaNorthingNative, unit)
    };
  }

  function parcelPoints(points) {
    if (points.length < 2) return points.slice();
    const output = points.slice();
    const first = output[0];
    const last = output[output.length - 1];
    if (normaliseHeader(first.id) === normaliseHeader(last.id)) output.pop();
    return output;
  }

  function toParcelCsv(result) {
    const points = result.parcel_points || parcelPoints(result.points);
    return [
      "id,easting,northing",
      ...points.map((point) => `${point.id},${point.easting.toFixed(3)},${point.northing.toFixed(3)}`)
    ].join("\n");
  }

  function traverseRows(result, adjustment) {
    if (!result || !result.lines || !result.points) {
      throw new Error("Reduce bearing/distance observations before exporting the traverse.");
    }

    return result.lines.map((line, index) => {
      const rawPoint = result.points[index + 1];
      const adjustedLine = adjustment && adjustment.lines ? adjustment.lines[index] : null;
      const adjustedPoint = adjustment && adjustment.points ? adjustment.points[index + 1] : null;
      return {
        no: line.index,
        from: line.from,
        to: line.to,
        bearing_dms: line.bearing_dms,
        observed_angle_dms: line.observed_angle_dms || "",
        angle_mode: line.angle_mode || "",
        bearing_decimal: line.bearing.toFixed(8),
        distance: line.distance.toFixed(3),
        unit: result.unit_label,
        raw_delta_easting: line.delta_easting.toFixed(3),
        raw_delta_northing: line.delta_northing.toFixed(3),
        raw_easting: rawPoint ? rawPoint.easting.toFixed(3) : "",
        raw_northing: rawPoint ? rawPoint.northing.toFixed(3) : "",
        correction_easting: adjustedPoint ? adjustedPoint.correction_easting.toFixed(3) : "",
        correction_northing: adjustedPoint ? adjustedPoint.correction_northing.toFixed(3) : "",
        adjusted_delta_easting: adjustedLine ? adjustedLine.adjusted_delta_easting.toFixed(3) : "",
        adjusted_delta_northing: adjustedLine ? adjustedLine.adjusted_delta_northing.toFixed(3) : "",
        adjusted_easting: adjustedPoint ? adjustedPoint.easting.toFixed(3) : "",
        adjusted_northing: adjustedPoint ? adjustedPoint.northing.toFixed(3) : "",
        code: line.code || ""
      };
    });
  }

  function toTraverseCsv(result, adjustment) {
    const emptyLineFields = {
      no: "",
      from: "",
      to: "",
      bearing_dms: "",
      observed_angle_dms: "",
      angle_mode: "",
      bearing_decimal: "",
      distance: "",
      raw_delta_easting: "",
      raw_delta_northing: "",
      raw_easting: "",
      raw_northing: "",
      correction_easting: "",
      correction_northing: "",
      adjusted_delta_easting: "",
      adjusted_delta_northing: "",
      adjusted_easting: "",
      adjusted_northing: "",
      code: ""
    };
    const summary = [
      {
        section: "summary",
        item: "method",
        value: adjustment ? adjustment.method : "Raw bearing/distance reduction",
        unit: "",
        ...emptyLineFields
      },
      {
        section: "summary",
        item: "total_distance",
        value: result.total_distance.toFixed(3),
        unit: result.unit_label,
        ...emptyLineFields
      },
      {
        section: "summary",
        item: "close_error_before",
        value: result.close_error.toFixed(6),
        unit: result.unit_label,
        ...emptyLineFields
      },
      {
        section: "summary",
        item: "precision",
        value: Number.isFinite(result.precision) ? `1:${Math.round(result.precision)}` : "Closed",
        unit: "",
        ...emptyLineFields
      },
      {
        section: "summary",
        item: "close_error_after",
        value: adjustment ? adjustment.close_error_after.toFixed(6) : "",
        unit: adjustment ? adjustment.unit_label : "",
        ...emptyLineFields
      }
    ];
    const rows = traverseRows(result, adjustment).map((row) => ({
      section: "line",
      item: row.no,
      value: "",
      unit: row.unit,
      ...row
    }));
    return ns.csv.rowsToCsv([...summary, ...rows]);
  }

  ns.survey = {
    parseBearing,
    formatBearing,
    parseRows,
    parseAngularRows,
    reduceBearingDistance,
    reduceAngularTraverse,
    adjustCompassRule,
    traverseRows,
    toParcelCsv,
    toTraverseCsv
  };
})(window.GhanaGrid = window.GhanaGrid || {});
