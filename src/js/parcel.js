(function (ns) {
  const ACRE_IN_SQ_METRES = 4046.8564224;

  function normaliseBearing(degrees) {
    return ((degrees % 360) + 360) % 360;
  }

  function squareUnitLabel(unit) {
    if (unit === "metre") return "sq.m";
    if (unit === "international_foot") return "sq.ft";
    return "sq Gold Coast ft";
  }

  function areaFromNative(areaNativeSquareFeet, unit) {
    const scale = ns.units.fromNative(1, unit);
    return areaNativeSquareFeet * scale * scale;
  }

  function decimalToDmsParts(decimalDegrees) {
    let degrees = Math.floor(decimalDegrees);
    const minutesDecimal = (decimalDegrees - degrees) * 60;
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
    return { degrees, minutes, seconds };
  }

  function formatBearing(decimalDegrees) {
    const parts = decimalToDmsParts(normaliseBearing(decimalDegrees));
    return `${String(parts.degrees).padStart(3, "0")} deg ${String(parts.minutes).padStart(2, "0")}' ${String(parts.seconds).padStart(2, "0")}"`;
  }

  function parsePoints(text, unit) {
    const parsed = ns.csv.parse(text, "grid_to_wgs");
    return parsed.rows.map((row, index) => {
      const sourceRow = parsed.hasHeader ? index + 2 : index + 1;
      const id = ns.csv.getColumn(row, ["id", "beacon", "point", "pointid", "name"]) || `P${String(index + 1).padStart(2, "0")}`;
      const easting = ns.utils.parseNumber(ns.csv.getColumn(row, ["easting", "eastings", "east", "x"]), `Row ${sourceRow} easting`);
      const northing = ns.utils.parseNumber(ns.csv.getColumn(row, ["northing", "northings", "north", "y"]), `Row ${sourceRow} northing`);
      const remarks = ns.csv.getColumn(row, [
        "remarks",
        "remark",
        "description",
        "boundary",
        "boundary_note",
        "adjoining",
        "adjoiner",
        "course",
        "course_remarks",
        "side"
      ]);
      const computationSheetNo = ns.csv.getColumn(row, [
        "computation_sheet_no",
        "computation_sheet",
        "comptn_sheet_no",
        "comptn_sheet",
        "sheet_no",
        "sheet"
      ]);
      const descriptionNo = ns.csv.getColumn(row, [
        "description_no",
        "description_number",
        "desc_no",
        "desc_number",
        "beacon_description_no",
        "pillar_no",
        "pillar_number"
      ]);
      const page = ns.csv.getColumn(row, [
        "page",
        "page_no",
        "page_number",
        "book_page"
      ]);
      const beaconRemarks = ns.csv.getColumn(row, [
        "beacon_remarks",
        "beacon_remark",
        "beacon_note",
        "beacon_notes",
        "index_remarks",
        "pillar_remarks",
        "pillar_remark"
      ]);
      const pointRole = ns.csv.getColumn(row, [
        "role",
        "point_role",
        "point_type",
        "type",
        "usage",
        "purpose",
        "classification"
      ]);
      const code = ns.csv.getColumn(row, [
        "code",
        "feature_code",
        "feature",
        "point_code",
        "survey_code"
      ]);
      return {
        id: String(id).trim(),
        easting,
        northing,
        remarks: String(remarks || "").trim(),
        computation_sheet_no: String(computationSheetNo || "").trim(),
        description_no: String(descriptionNo || "").trim(),
        page: String(page || "").trim(),
        beacon_remarks: String(beaconRemarks || "").trim(),
        role: String(pointRole || "").trim(),
        code: String(code || "").trim(),
        source_row: sourceRow,
        nativeEasting: ns.units.toNative(easting, unit),
        nativeNorthing: ns.units.toNative(northing, unit)
      };
    });
  }

  function sameNativeCoordinate(a, b) {
    return Math.abs(a.nativeEasting - b.nativeEasting) <= 0.000001
      && Math.abs(a.nativeNorthing - b.nativeNorthing) <= 0.000001;
  }

  function closingPointInfo(point, unit) {
    if (!point) return null;
    return {
      id: point.id,
      source_row: point.source_row || "",
      easting: Number(ns.units.fromNative(point.nativeEasting, unit).toFixed(3)),
      northing: Number(ns.units.fromNative(point.nativeNorthing, unit).toFixed(3))
    };
  }

  function referenceText(point) {
    return [
      point.id,
      point.remarks,
      point.beacon_remarks,
      point.role,
      point.code
    ].join(" ").toLowerCase().replace(/[^a-z0-9]+/g, " ");
  }

  function pointLooksLikeReference(point) {
    const text = ` ${referenceText(point)} `;
    return /\b(cors|reference|ref|control|base|datum|known|benchmark)\b/.test(text);
  }

  function referencePointInfo(point, unit, position) {
    return {
      id: point.id,
      position,
      source_row: point.source_row || "",
      nativeEasting: point.nativeEasting,
      nativeNorthing: point.nativeNorthing,
      easting: Number(ns.units.fromNative(point.nativeEasting, unit).toFixed(3)),
      northing: Number(ns.units.fromNative(point.nativeNorthing, unit).toFixed(3)),
      role: point.role || point.code || point.remarks || point.beacon_remarks || "Reference / control point"
    };
  }

  function referenceModeLabel(mode) {
    if (mode === "include_all") return "Include every row";
    if (mode === "exclude_first_last") return "Exclude first and last rows";
    return "Auto-detect CORS/reference rows";
  }

  function removeReferenceRows(points, unit, mode) {
    const normalisedMode = mode || "auto";
    let startIndex = 0;
    let endIndex = points.length;

    if (normalisedMode === "include_all") {
      return { points: points.slice(), references: [], mode: normalisedMode };
    }

    if (normalisedMode === "exclude_first_last") {
      if (points.length < 5) {
        throw new Error("Excluding first and last reference rows needs at least five coordinate rows so three parcel beacons remain.");
      }
      startIndex = 1;
      endIndex = points.length - 1;
    } else {
      if (points.length > 3 && pointLooksLikeReference(points[0])) startIndex = 1;
      if ((endIndex - startIndex) > 3 && pointLooksLikeReference(points[points.length - 1])) endIndex = points.length - 1;
    }

    const references = [
      ...points.slice(0, startIndex).map((point) => referencePointInfo(point, unit, "first")),
      ...points.slice(endIndex).map((point) => referencePointInfo(point, unit, "last"))
    ];

    return {
      points: points.slice(startIndex, endIndex),
      references,
      mode: normalisedMode
    };
  }

  function compute(points, unit, options) {
    if (!Array.isArray(points) || points.length < 3) {
      throw new Error("Parcel computation needs at least three beacon points.");
    }

    const computeOptions = options || {};
    const inputPointCount = points.length;
    const referenceMode = computeOptions.referenceRowMode || "auto";
    const referenceFiltered = removeReferenceRows(points, unit, referenceMode);
    const candidatePoints = referenceFiltered.points;
    const repeatedClosingPoint = candidatePoints.length > 3 && sameNativeCoordinate(candidatePoints[0], candidatePoints[candidatePoints.length - 1])
      ? candidatePoints[candidatePoints.length - 1]
      : null;
    const workingPoints = repeatedClosingPoint ? candidatePoints.slice(0, -1) : candidatePoints.slice();

    if (workingPoints.length < 3) {
      throw new Error("Parcel computation needs at least three unique parcel beacons after excluding reference rows and repeated closing rows.");
    }

    let perimeterNative = 0;
    let shoelace = 0;
    const lines = workingPoints.map((point, index) => {
      const next = workingPoints[(index + 1) % workingPoints.length];
      const deltaEasting = next.nativeEasting - point.nativeEasting;
      const deltaNorthing = next.nativeNorthing - point.nativeNorthing;
      const bearing = normaliseBearing(Math.atan2(deltaEasting, deltaNorthing) * (180 / Math.PI));
      const distanceNative = Math.hypot(deltaEasting, deltaNorthing);
      perimeterNative += distanceNative;
      shoelace += (point.nativeEasting * next.nativeNorthing) - (next.nativeEasting * point.nativeNorthing);
      return {
        index: index + 1,
        from: point.id,
        to: next.id,
        bearing,
        bearing_dms: formatBearing(bearing),
        distance_native: distanceNative,
        distance: ns.units.fromNative(distanceNative, unit),
        delta_easting: ns.units.fromNative(deltaEasting, unit),
        delta_northing: ns.units.fromNative(deltaNorthing, unit),
        remarks: point.remarks || ""
      };
    });

    const areaNativeSquareFeet = Math.abs(shoelace) / 2;
    const areaSquareMetres = areaNativeSquareFeet * (ns.constants.goldCoastFootToMetre ** 2);
    const perimeter = ns.units.fromNative(perimeterNative, unit);

    return {
      points: workingPoints,
      lines,
      input_point_count: inputPointCount,
      ignored_point_count: inputPointCount - workingPoints.length,
      reference_row_mode: referenceMode,
      reference_row_mode_label: referenceModeLabel(referenceMode),
      reference_rows_removed: referenceFiltered.references.length > 0,
      reference_point_count: referenceFiltered.references.length,
      reference_points: referenceFiltered.references,
      closing_point_removed: Boolean(repeatedClosingPoint),
      closing_point: closingPointInfo(repeatedClosingPoint, unit),
      unit,
      unit_label: ns.units.label(unit),
      perimeter,
      perimeter_native: perimeterNative,
      area_square_native_feet: areaNativeSquareFeet,
      area_square_metres: areaSquareMetres,
      area_hectares: areaSquareMetres / 10000,
      area_acres: areaSquareMetres / ACRE_IN_SQ_METRES
    };
  }

  function toPlanRows(result) {
    return result.lines.map((line) => {
      const parts = decimalToDmsParts(line.bearing);
      return {
        from: line.from,
        to: line.to,
        bearing_deg: parts.degrees,
        bearing_min: parts.minutes,
        bearing_sec: parts.seconds,
        bearing: line.bearing_dms,
        distance: line.distance.toFixed(3),
        distance_unit: result.unit_label,
        remarks: line.remarks || "",
        delta_easting: line.delta_easting.toFixed(3),
        delta_northing: line.delta_northing.toFixed(3)
      };
    });
  }

  function toBearingDistanceRows(result) {
    return result.lines.map((line) => ({
      course_no: line.index,
      from: line.from,
      to: line.to,
      bearing: line.bearing_dms,
      bearing_decimal: line.bearing.toFixed(8),
      distance: line.distance.toFixed(3),
      distance_unit: result.unit_label,
      delta_easting: line.delta_easting.toFixed(3),
      delta_northing: line.delta_northing.toFixed(3),
      remarks: line.remarks || ""
    }));
  }

  function toBeaconIndexRows(result) {
    return result.points.map((point) => ({
      beacon: point.id,
      x: ns.units.fromNative(point.nativeEasting, result.unit).toFixed(3),
      y: ns.units.fromNative(point.nativeNorthing, result.unit).toFixed(3),
      unit: result.unit_label,
      computation_sheet_no: point.computation_sheet_no || "",
      description_no: point.description_no || "",
      page: point.page || "",
      remarks: point.beacon_remarks || ""
    }));
  }

  function toAreaComputationRows(result) {
    let sumForward = 0;
    let sumBackward = 0;
    const rows = result.points.map((point, index) => {
      const next = result.points[(index + 1) % result.points.length];
      const x = ns.units.fromNative(point.nativeEasting, result.unit);
      const y = ns.units.fromNative(point.nativeNorthing, result.unit);
      const nextX = ns.units.fromNative(next.nativeEasting, result.unit);
      const nextY = ns.units.fromNative(next.nativeNorthing, result.unit);
      const forward = y * (nextX - x);
      const backward = x * (nextY - y);
      sumForward += forward;
      sumBackward += backward;
      return {
        station: point.id,
        x: x.toFixed(3),
        y: y.toFixed(3),
        y_times_delta_x: forward.toFixed(3),
        x_times_delta_y: backward.toFixed(3),
        unit: squareUnitLabel(result.unit)
      };
    });

    const doubleArea = Math.abs(sumForward - sumBackward);
    const area = doubleArea / 2;

    return {
      rows,
      summary: {
        sum_forward: sumForward,
        sum_backward: sumBackward,
        double_area: doubleArea,
        area,
        area_unit: squareUnitLabel(result.unit),
        area_acres: result.area_acres,
        area_hectares: result.area_hectares
      }
    };
  }

  function toCalculationAuditRows(result) {
    return result.lines.map((line, index) => {
      const point = result.points[index];
      const next = result.points[(index + 1) % result.points.length];
      const startEasting = ns.units.fromNative(point.nativeEasting, result.unit);
      const startNorthing = ns.units.fromNative(point.nativeNorthing, result.unit);
      const endEasting = ns.units.fromNative(next.nativeEasting, result.unit);
      const endNorthing = ns.units.fromNative(next.nativeNorthing, result.unit);
      const forward = startNorthing * (endEasting - startEasting);
      const backward = startEasting * (endNorthing - startNorthing);
      const signedDoubleAreaPart = forward - backward;

      return {
        course_no: line.index,
        from: line.from,
        to: line.to,
        start_easting: startEasting.toFixed(3),
        start_northing: startNorthing.toFixed(3),
        end_easting: endEasting.toFixed(3),
        end_northing: endNorthing.toFixed(3),
        delta_easting: line.delta_easting.toFixed(3),
        delta_northing: line.delta_northing.toFixed(3),
        bearing: line.bearing_dms,
        distance: line.distance.toFixed(3),
        distance_unit: result.unit_label,
        remarks: line.remarks || "",
        y_times_delta_x: forward.toFixed(3),
        x_times_delta_y: backward.toFixed(3),
        signed_double_area_part: signedDoubleAreaPart.toFixed(3),
        signed_area_part: (signedDoubleAreaPart / 2).toFixed(3),
        area_unit: squareUnitLabel(result.unit)
      };
    });
  }

  function referenceToPoint(reference, result) {
    const nativeEasting = Number.isFinite(Number(reference.nativeEasting))
      ? Number(reference.nativeEasting)
      : ns.units.toNative(Number(reference.easting), result.unit);
    const nativeNorthing = Number.isFinite(Number(reference.nativeNorthing))
      ? Number(reference.nativeNorthing)
      : ns.units.toNative(Number(reference.northing), result.unit);
    return {
      id: reference.id,
      position: reference.position || "",
      source_row: reference.source_row || "",
      role: reference.role || "Reference / control point",
      nativeEasting,
      nativeNorthing,
      is_reference: true
    };
  }

  function computationPointSequence(result) {
    const references = (result.reference_points || []).map((reference) => referenceToPoint(reference, result));
    const firstReferences = references.filter((point) => point.position === "first");
    const lastReferences = references.filter((point) => point.position === "last");
    const fallbackFirst = !firstReferences.length && references.length ? [references[0]] : [];
    const fallbackLast = !lastReferences.length && references.length > 1 ? [references[references.length - 1]] : [];
    const sequence = [
      ...(firstReferences.length ? firstReferences : fallbackFirst),
      ...result.points.map((point) => ({ ...point, is_reference: false })),
      ...(lastReferences.length ? lastReferences : fallbackLast)
    ];
    return sequence.map((point, index) => ({
      ...point,
      computation_index: index + 1
    }));
  }

  function pointDisplay(point, unit) {
    return {
      easting: ns.units.fromNative(point.nativeEasting, unit),
      northing: ns.units.fromNative(point.nativeNorthing, unit)
    };
  }

  function roundedDegreeMinuteParts(decimalDegrees) {
    const parts = decimalToDmsParts(normaliseBearing(decimalDegrees));
    if (parts.seconds >= 30) parts.minutes += 1;
    if (parts.minutes === 60) {
      parts.minutes = 0;
      parts.degrees = normaliseBearing(parts.degrees + 1);
    }
    return {
      degrees: parts.degrees,
      minutes: parts.minutes
    };
  }

  function padded(value, width) {
    return String(Number(value)).padStart(width, "0");
  }

  function courseBetweenPoints(fromPoint, toPoint, result, index) {
    const from = pointDisplay(fromPoint, result.unit);
    const to = pointDisplay(toPoint, result.unit);
    const dx = to.northing - from.northing;
    const dy = to.easting - from.easting;
    const bearing = normaliseBearing(Math.atan2(dy, dx) * (180 / Math.PI));
    const bearingParts = decimalToDmsParts(bearing);
    const planBearing = roundedDegreeMinuteParts(bearing);
    const distance = Math.hypot(dx, dy);
    return {
      course_no: index,
      from: fromPoint.id,
      to: toPoint.id,
      from_sequence: fromPoint.computation_index,
      to_sequence: toPoint.computation_index,
      from_is_reference: fromPoint.is_reference ? "yes" : "",
      to_is_reference: toPoint.is_reference ? "yes" : "",
      xa: from.northing.toFixed(3),
      ya: from.easting.toFixed(3),
      xb: to.northing.toFixed(3),
      yb: to.easting.toFixed(3),
      dx: dx.toFixed(3),
      dy: dy.toFixed(3),
      bearing_deg: padded(bearingParts.degrees, 3),
      bearing_min: padded(bearingParts.minutes, 2),
      bearing_sec: padded(bearingParts.seconds, 2),
      plan_bearing_deg: padded(planBearing.degrees, 3),
      plan_bearing_min: padded(planBearing.minutes, 2),
      bearing: `${padded(bearingParts.degrees, 3)} deg ${padded(bearingParts.minutes, 2)}' ${padded(bearingParts.seconds, 2)}"`,
      distance: distance.toFixed(3),
      plan_distance: distance.toFixed(1),
      distance_unit: result.unit_label,
      remarks: fromPoint.remarks || ""
    };
  }

  function toComputationBeaconRows(result) {
    return computationPointSequence(result).map((point) => {
      const display = pointDisplay(point, result.unit);
      return {
        sequence: point.computation_index,
        beacon: point.id,
        x: display.northing.toFixed(3),
        y: display.easting.toFixed(3),
        unit: result.unit_label,
        is_reference: point.is_reference ? "yes" : "",
        role: point.role || "",
        computation_sheet_no: point.computation_sheet_no || "",
        description_no: point.description_no || "",
        page: point.page || "",
        remarks: point.beacon_remarks || point.remarks || ""
      };
    });
  }

  function toComputationCourseRows(result) {
    const sequence = computationPointSequence(result);
    const parcelPoints = sequence.filter((point) => !point.is_reference);
    const firstReference = [...sequence].reverse().find((point) => point.is_reference && point.computation_index < parcelPoints[0].computation_index);
    const lastReference = sequence.find((point) => point.is_reference && point.computation_index > parcelPoints[parcelPoints.length - 1].computation_index);
    const courses = [];

    if (firstReference) {
      courses.push(courseBetweenPoints(firstReference, parcelPoints[0], result, courses.length + 1));
    }

    parcelPoints.forEach((point, index) => {
      const next = parcelPoints[(index + 1) % parcelPoints.length];
      courses.push(courseBetweenPoints(point, next, result, courses.length + 1));
    });

    if (lastReference) {
      courses.push(courseBetweenPoints(parcelPoints[parcelPoints.length - 1], lastReference, result, courses.length + 1));
    }

    return courses;
  }

  function toComputationPlanRows(result) {
    return [
      ...toComputationCourseRows(result).map((course) => ({
        from: course.from,
        to: course.to,
        from_is_reference: course.from_is_reference,
        to_is_reference: course.to_is_reference,
        bearing_deg: course.plan_bearing_deg,
        bearing_min: course.plan_bearing_min,
        distance: course.plan_distance,
        distance_unit: result.unit === "metre" ? "METRES" : "FEET",
        remarks: course.remarks || ""
      })),
      {
        from: "AREA IN ACREAGE",
        to: "",
        from_is_reference: "",
        to_is_reference: "",
        bearing_deg: "",
        bearing_min: "",
        distance: result.area_acres.toFixed(3),
        distance_unit: "ACRE",
        remarks: ""
      },
      {
        from: "AREA IN HECTARE",
        to: "",
        from_is_reference: "",
        to_is_reference: "",
        bearing_deg: "",
        bearing_min: "",
        distance: result.area_hectares.toFixed(3),
        distance_unit: "HECTARE",
        remarks: ""
      }
    ];
  }

  function polygonSignedDoubleArea(points) {
    return points.reduce((sum, point, index) => {
      const next = points[(index + 1) % points.length];
      return sum + ((point.nativeEasting * next.nativeNorthing) - (next.nativeEasting * point.nativeNorthing));
    }, 0);
  }

  function polygonCentroidNative(points) {
    const signedDoubleArea = polygonSignedDoubleArea(points);
    if (Math.abs(signedDoubleArea) <= 0.000000001) {
      const total = points.reduce((sum, point) => ({
        easting: sum.easting + point.nativeEasting,
        northing: sum.northing + point.nativeNorthing
      }), { easting: 0, northing: 0 });
      return {
        nativeEasting: total.easting / points.length,
        nativeNorthing: total.northing / points.length
      };
    }

    let centroidEasting = 0;
    let centroidNorthing = 0;
    points.forEach((point, index) => {
      const next = points[(index + 1) % points.length];
      const cross = (point.nativeEasting * next.nativeNorthing) - (next.nativeEasting * point.nativeNorthing);
      centroidEasting += (point.nativeEasting + next.nativeEasting) * cross;
      centroidNorthing += (point.nativeNorthing + next.nativeNorthing) * cross;
    });

    return {
      nativeEasting: centroidEasting / (3 * signedDoubleArea),
      nativeNorthing: centroidNorthing / (3 * signedDoubleArea)
    };
  }

  function toGeometryReviewRows(result) {
    const eastings = result.points.map((point) => ns.units.fromNative(point.nativeEasting, result.unit));
    const northings = result.points.map((point) => ns.units.fromNative(point.nativeNorthing, result.unit));
    const minEasting = Math.min(...eastings);
    const maxEasting = Math.max(...eastings);
    const minNorthing = Math.min(...northings);
    const maxNorthing = Math.max(...northings);
    const centroid = polygonCentroidNative(result.points);
    const signedDoubleArea = polygonSignedDoubleArea(result.points);
    const shortest = result.lines.reduce((best, line) => line.distance < best.distance ? line : best, result.lines[0]);
    const longest = result.lines.reduce((best, line) => line.distance > best.distance ? line : best, result.lines[0]);
    const sideDistances = result.lines.map((line) => line.distance);
    const averageSide = sideDistances.reduce((sum, value) => sum + value, 0) / sideDistances.length;
    const referenceSummary = result.reference_point_count
      ? result.reference_points.map((point) => `row ${point.source_row || point.position} ${point.id}`).join("; ")
      : "None";

    return [
      { item: "Input coordinate rows", value: String(result.input_point_count || result.points.length), unit: "rows", note: "Rows parsed before reference and closure exclusions." },
      { item: "Reference row mode", value: result.reference_row_mode_label || "Auto-detect CORS/reference rows", unit: "", note: "Controls how CORS/control rows are handled before area computation." },
      { item: "Reference rows excluded", value: String(result.reference_point_count || 0), unit: "rows", note: referenceSummary },
      { item: "Beacon count", value: String(result.points.length), unit: "beacons", note: "Computed parcel corner count." },
      { item: "Boundary course count", value: String(result.lines.length), unit: "courses", note: "Closed boundary sides generated from beacon order." },
      { item: "Orientation", value: signedDoubleArea < 0 ? "Clockwise" : "Counter-clockwise", unit: "", note: "Computed from signed shoelace area." },
      { item: "Centroid easting", value: ns.units.fromNative(centroid.nativeEasting, result.unit).toFixed(3), unit: result.unit_label, note: "Polygon centroid from beacon coordinates." },
      { item: "Centroid northing", value: ns.units.fromNative(centroid.nativeNorthing, result.unit).toFixed(3), unit: result.unit_label, note: "Polygon centroid from beacon coordinates." },
      { item: "Minimum easting", value: minEasting.toFixed(3), unit: result.unit_label, note: "Parcel coordinate extent." },
      { item: "Maximum easting", value: maxEasting.toFixed(3), unit: result.unit_label, note: "Parcel coordinate extent." },
      { item: "Minimum northing", value: minNorthing.toFixed(3), unit: result.unit_label, note: "Parcel coordinate extent." },
      { item: "Maximum northing", value: maxNorthing.toFixed(3), unit: result.unit_label, note: "Parcel coordinate extent." },
      { item: "Easting span", value: (maxEasting - minEasting).toFixed(3), unit: result.unit_label, note: "Maximum easting minus minimum easting." },
      { item: "Northing span", value: (maxNorthing - minNorthing).toFixed(3), unit: result.unit_label, note: "Maximum northing minus minimum northing." },
      { item: "Shortest side", value: `${shortest.from}-${shortest.to}`, unit: `${shortest.distance.toFixed(3)} ${result.unit_label}`, note: shortest.bearing_dms },
      { item: "Longest side", value: `${longest.from}-${longest.to}`, unit: `${longest.distance.toFixed(3)} ${result.unit_label}`, note: longest.bearing_dms },
      { item: "Average side length", value: averageSide.toFixed(3), unit: result.unit_label, note: "Perimeter divided by boundary course count." },
      { item: "Perimeter", value: result.perimeter.toFixed(3), unit: result.unit_label, note: "Sum of boundary course distances." },
      { item: "Area", value: result.area_acres.toFixed(4), unit: "acres", note: `${result.area_hectares.toFixed(4)} hectares.` }
    ];
  }

  function historyText(details, result) {
    const project = details || {};
    const customHistory = String(project.historyOverride || project.customHistory || "")
      .replace(/\r\n/g, "\n")
      .trim();
    if (customHistory) return customHistory;

    const locality = project.locality || "[LOCALITY]";
    const district = project.district || "[DISTRICT]";
    const client = project.client || "[CLIENT NAME]";
    const regionalNumber = project.regionalNumber || "[REGIONAL NUMBER]";
    const corsId = project.corsId || "[CORS ID]";
    const surveyPurpose = project.historyPurpose || "prepare a cadastral site plan";
    const acreage = String(project.historyAcreage || project.reportedAcreage || "").trim()
      || (result ? result.area_acres.toFixed(4) : "[ACREAGE]");
    const hectares = String(project.historyHectares || project.reportedHectares || "").trim()
      || (result ? result.area_hectares.toFixed(4) : "[HECTARE]");
    const boundary = project.boundary || "the width road given in the diagram of survey with reference to the cardinal North";

    return [
      `The survey was conducted to ${surveyPurpose} of a parcel at ${locality} in the ${district}. This was done upon the request of ${client}.`,
      `Regional number ${regionalNumber} applied from the lands commission was used as pillar numbers at the corners of the parcel.`,
      `A GNSS Receiver was used in the survey, with reference ${corsId} to coordinate the constructed pillars.`,
      `The total area of the parcel is calculated to be ${acreage} acre or ${hectares} hectare. The plot is bounded by ${boundary}.`
    ].join("\n\n");
  }

  function referenceRowsSummary(result) {
    if (!result || !result.reference_point_count) return "";
    return result.reference_points.map((point) => {
      const row = point.source_row ? `row ${point.source_row}` : point.position;
      return `${row} ${point.id}`;
    }).join("; ");
  }

  function pointToWgs(point, result) {
    const converted = ns.converter.gridToWgs(point.easting, point.northing, result.unit);
    return {
      id: point.id,
      lat: converted.lat,
      lon: converted.lon,
      coordinates: [Number(converted.lon), Number(converted.lat)],
      easting: ns.units.fromNative(point.nativeEasting, result.unit),
      northing: ns.units.fromNative(point.nativeNorthing, result.unit)
    };
  }

  function toGeoJson(result, options) {
    if (!result) throw new Error("Compute a parcel before exporting parcel GeoJSON.");
    const exportOptions = options || {};
    const details = exportOptions.details || {};
    const parcelSource = exportOptions.parcelSource || {};
    const generatedAt = exportOptions.generatedAt || new Date().toISOString();
    const wgsPoints = result.points.map((point) => pointToWgs(point, result));
    const closedRing = [...wgsPoints.map((point) => point.coordinates), wgsPoints[0].coordinates];

    const polygonFeature = {
      type: "Feature",
      properties: {
        feature_type: "parcel_polygon",
        project: details.projectName || "",
        locality: details.locality || "",
        district: details.district || "",
        client: details.client || "",
        regional_number: details.regionalNumber || "",
        cors_id: details.corsId || "",
        survey_date: details.surveyDate || "",
        issue_date: details.issueDate || "",
        prepared_by: details.preparedBy || "",
        checked_by: details.checkedBy || "",
        revision: details.reportRevision || "",
        report_status: details.reportStatus || "",
        parcel_source: parcelSource.label || "",
        parcel_source_detail: parcelSource.detail || "",
        input_coordinate_rows: result.input_point_count || result.points.length,
        reference_row_mode: result.reference_row_mode_label || "Auto-detect CORS/reference rows",
        reference_rows_removed: Boolean(result.reference_rows_removed),
        reference_row_count: result.reference_point_count || 0,
        reference_rows: referenceRowsSummary(result),
        beacons: result.points.length,
        repeated_closing_row_removed: Boolean(result.closing_point_removed),
        repeated_closing_row_id: result.closing_point ? result.closing_point.id : "",
        repeated_closing_row_source_row: result.closing_point ? result.closing_point.source_row : "",
        perimeter: Number(result.perimeter.toFixed(3)),
        perimeter_unit: result.unit_label,
        area_acres: Number(result.area_acres.toFixed(4)),
        area_hectares: Number(result.area_hectares.toFixed(4)),
        area_square_metres: Number(result.area_square_metres.toFixed(3)),
        grid_unit: result.unit_label
      },
      geometry: {
        type: "Polygon",
        coordinates: [closedRing]
      }
    };

    const lineFeatures = result.lines.map((line, index) => ({
      type: "Feature",
      properties: {
        feature_type: "boundary_line",
        sequence: line.index,
        from: line.from,
        to: line.to,
        bearing: line.bearing_dms,
        bearing_decimal: Number(line.bearing.toFixed(8)),
        distance: Number(line.distance.toFixed(3)),
        distance_unit: result.unit_label,
        delta_easting: Number(line.delta_easting.toFixed(3)),
        delta_northing: Number(line.delta_northing.toFixed(3)),
        remarks: line.remarks || ""
      },
      geometry: {
        type: "LineString",
        coordinates: [
          wgsPoints[index].coordinates,
          wgsPoints[(index + 1) % wgsPoints.length].coordinates
        ]
      }
    }));

    const pointFeatures = wgsPoints.map((point, index) => ({
      type: "Feature",
      properties: {
        feature_type: "beacon",
        sequence: index + 1,
        id: point.id,
        computation_sheet_no: result.points[index].computation_sheet_no || "",
        description_no: result.points[index].description_no || "",
        page: result.points[index].page || "",
        remarks: result.points[index].beacon_remarks || "",
        easting: Number(point.easting.toFixed(3)),
        northing: Number(point.northing.toFixed(3)),
        grid_unit: result.unit_label,
        latitude: Number(point.lat.toFixed(8)),
        longitude: Number(point.lon.toFixed(8))
      },
      geometry: {
        type: "Point",
        coordinates: point.coordinates
      }
    }));

    return {
      type: "FeatureCollection",
      name: details.projectName || "Airban parcel geometry",
      metadata: {
        app: "Airban Converter",
        version: ns.constants.appVersion,
        transform: ns.constants.transformLabel,
        generated_at: generatedAt,
        export_type: "parcel_geometry",
        crs: "EPSG:4326",
        source_grid: ns.constants.ghanaGrid,
        reference_rows: referenceRowsSummary(result)
      },
      features: [polygonFeature, ...lineFeatures, ...pointFeatures]
    };
  }

  function dxfSafe(value) {
    return String(value ?? "")
      .replace(/[\r\n\t]+/g, " ")
      .replace(/[^\x20-\x7E]/g, "")
      .trim();
  }

  function xmlEscape(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  function dxfNumber(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toFixed(3) : "0.000";
  }

  function dxfPair(code, value) {
    return [String(code), String(value)];
  }

  function dxfText(layer, x, y, height, textValue, rotation) {
    return [
      ...dxfPair(0, "TEXT"),
      ...dxfPair(8, layer),
      ...dxfPair(10, dxfNumber(x)),
      ...dxfPair(20, dxfNumber(y)),
      ...dxfPair(30, "0.000"),
      ...dxfPair(40, dxfNumber(height)),
      ...dxfPair(1, dxfSafe(textValue)),
      ...dxfPair(50, dxfNumber(rotation || 0))
    ];
  }

  function dxfLayer(name, color) {
    return [
      ...dxfPair(0, "LAYER"),
      ...dxfPair(2, name),
      ...dxfPair(70, 0),
      ...dxfPair(62, color),
      ...dxfPair(6, "CONTINUOUS")
    ];
  }

  function dxfPoints(result) {
    return result.points.map((point) => ({
      id: point.id,
      x: ns.units.fromNative(point.nativeEasting, result.unit),
      y: ns.units.fromNative(point.nativeNorthing, result.unit),
      computation_sheet_no: point.computation_sheet_no || "",
      description_no: point.description_no || "",
      page: point.page || "",
      beacon_remarks: point.beacon_remarks || ""
    }));
  }

  function textSize(points) {
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const diagonal = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    return Math.max(diagonal * 0.025, 2.5);
  }

  function toDxf(result, options) {
    if (!result) throw new Error("Compute a parcel before exporting parcel DXF.");
    const exportOptions = options || {};
    const details = exportOptions.details || {};
    const parcelSource = exportOptions.parcelSource || {};
    const generatedAt = exportOptions.generatedAt || new Date().toISOString();
    const points = dxfPoints(result);
    const labelHeight = textSize(points);
    const beaconRadius = labelHeight * 0.32;
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const minX = Math.min(...xs);
    const maxY = Math.max(...ys);
    const noteX = minX;
    const noteY = maxY + (labelHeight * 5);
    const lines = [];

    lines.push(
      ...dxfPair(0, "SECTION"),
      ...dxfPair(2, "HEADER"),
      ...dxfPair(9, "$ACADVER"),
      ...dxfPair(1, "AC1009"),
      ...dxfPair(0, "ENDSEC"),
      ...dxfPair(0, "SECTION"),
      ...dxfPair(2, "TABLES"),
      ...dxfPair(0, "TABLE"),
      ...dxfPair(2, "LAYER"),
      ...dxfPair(70, 6),
      ...dxfLayer("PARCEL_BOUNDARY", 3),
      ...dxfLayer("BOUNDARY_COURSES", 5),
      ...dxfLayer("BEACONS", 2),
      ...dxfLayer("BEACON_LABELS", 7),
      ...dxfLayer("COURSE_LABELS", 6),
      ...dxfLayer("PARCEL_NOTES", 4),
      ...dxfPair(0, "ENDTAB"),
      ...dxfPair(0, "ENDSEC"),
      ...dxfPair(0, "SECTION"),
      ...dxfPair(2, "ENTITIES")
    );

    lines.push(
      ...dxfPair(0, "POLYLINE"),
      ...dxfPair(8, "PARCEL_BOUNDARY"),
      ...dxfPair(66, 1),
      ...dxfPair(70, 1),
      ...dxfPair(10, "0.000"),
      ...dxfPair(20, "0.000"),
      ...dxfPair(30, "0.000")
    );
    points.forEach((point) => {
      lines.push(
        ...dxfPair(0, "VERTEX"),
        ...dxfPair(8, "PARCEL_BOUNDARY"),
        ...dxfPair(10, dxfNumber(point.x)),
        ...dxfPair(20, dxfNumber(point.y)),
        ...dxfPair(30, "0.000")
      );
    });
    lines.push(...dxfPair(0, "SEQEND"));

    result.lines.forEach((line, index) => {
      const start = points[index];
      const end = points[(index + 1) % points.length];
      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;
      const rotation = Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI);
      lines.push(
        ...dxfPair(0, "LINE"),
        ...dxfPair(8, "BOUNDARY_COURSES"),
        ...dxfPair(10, dxfNumber(start.x)),
        ...dxfPair(20, dxfNumber(start.y)),
        ...dxfPair(30, "0.000"),
        ...dxfPair(11, dxfNumber(end.x)),
        ...dxfPair(21, dxfNumber(end.y)),
        ...dxfPair(31, "0.000"),
        ...dxfText(
          "COURSE_LABELS",
          midX,
          midY,
          labelHeight * 0.75,
          `${line.from}-${line.to} ${line.bearing_dms} ${line.distance.toFixed(3)} ${result.unit_label}${line.remarks ? ` ${line.remarks}` : ""}`,
          rotation
        )
      );
    });

    points.forEach((point) => {
      lines.push(
        ...dxfPair(0, "CIRCLE"),
        ...dxfPair(8, "BEACONS"),
        ...dxfPair(10, dxfNumber(point.x)),
        ...dxfPair(20, dxfNumber(point.y)),
        ...dxfPair(30, "0.000"),
        ...dxfPair(40, dxfNumber(beaconRadius)),
        ...dxfText("BEACON_LABELS", point.x + labelHeight, point.y + labelHeight, labelHeight, point.id, 0)
      );
      const metadata = [
        point.computation_sheet_no ? `Sheet ${point.computation_sheet_no}` : "",
        point.description_no ? `Desc ${point.description_no}` : "",
        point.page ? `Page ${point.page}` : "",
        point.beacon_remarks || ""
      ].filter(Boolean).join(" | ");
      if (metadata) {
        lines.push(...dxfText("BEACON_LABELS", point.x + labelHeight, point.y - labelHeight, labelHeight * 0.55, metadata, 0));
      }
    });

    [
      `Airban Converter v${ns.constants.appVersion}`,
      `Project: ${details.projectName || "Survey Computation"}`,
      `Locality: ${details.locality || ""}`,
      `Client: ${details.client || ""}`,
      `Prepared by: ${details.preparedBy || ""}`,
      `Checked by: ${details.checkedBy || ""}`,
      `Revision: ${details.reportRevision || ""}`,
      `Status: ${details.reportStatus || ""}`,
      `Source: ${parcelSource.label || "Parcel coordinates"}`,
      `Input rows: ${result.input_point_count || result.points.length}`,
      `Reference rows: ${result.reference_point_count ? `excluded ${referenceRowsSummary(result)}` : "none excluded"}`,
      `Computed beacons: ${result.points.length}`,
      `Repeated closing row: ${result.closing_point_removed ? `removed ${result.closing_point && result.closing_point.id ? result.closing_point.id : "final row"}` : "none detected"}`,
      `Area: ${result.area_acres.toFixed(4)} acres / ${result.area_hectares.toFixed(4)} hectares`,
      `Perimeter: ${result.perimeter.toFixed(3)} ${result.unit_label}`,
      `Generated: ${generatedAt}`
    ].forEach((note, index) => {
      lines.push(...dxfText("PARCEL_NOTES", noteX, noteY - (index * labelHeight * 1.45), labelHeight, note, 0));
    });

    lines.push(
      ...dxfPair(0, "ENDSEC"),
      ...dxfPair(0, "EOF")
    );

    return `${lines.join("\r\n")}\r\n`;
  }

  function kmlData(name, value) {
    return `<Data name="${xmlEscape(name)}"><value>${xmlEscape(value)}</value></Data>`;
  }

  function kmlCoordinate(point) {
    return `${point.coordinates[0].toFixed(8)},${point.coordinates[1].toFixed(8)},0`;
  }

  function toKml(result, options) {
    if (!result) throw new Error("Compute a parcel before exporting parcel KML.");
    const exportOptions = options || {};
    const details = exportOptions.details || {};
    const parcelSource = exportOptions.parcelSource || {};
    const generatedAt = exportOptions.generatedAt || new Date().toISOString();
    const wgsPoints = result.points.map((point) => pointToWgs(point, result));
    const ringCoordinates = [...wgsPoints, wgsPoints[0]].map(kmlCoordinate).join(" ");
    const projectName = details.projectName || "Airban parcel boundary";

    const polygonData = [
      kmlData("project", projectName),
      kmlData("locality", details.locality || ""),
      kmlData("district", details.district || ""),
      kmlData("client", details.client || ""),
      kmlData("regional_number", details.regionalNumber || ""),
      kmlData("cors_id", details.corsId || ""),
      kmlData("survey_date", details.surveyDate || ""),
      kmlData("issue_date", details.issueDate || ""),
      kmlData("prepared_by", details.preparedBy || ""),
      kmlData("checked_by", details.checkedBy || ""),
      kmlData("revision", details.reportRevision || ""),
      kmlData("report_status", details.reportStatus || ""),
      kmlData("parcel_source", parcelSource.label || ""),
      kmlData("parcel_source_detail", parcelSource.detail || ""),
      kmlData("input_coordinate_rows", result.input_point_count || result.points.length),
      kmlData("reference_row_mode", result.reference_row_mode_label || "Auto-detect CORS/reference rows"),
      kmlData("reference_rows_removed", result.reference_rows_removed ? "true" : "false"),
      kmlData("reference_row_count", result.reference_point_count || 0),
      kmlData("reference_rows", referenceRowsSummary(result)),
      kmlData("beacons", result.points.length),
      kmlData("repeated_closing_row_removed", result.closing_point_removed ? "true" : "false"),
      kmlData("repeated_closing_row_id", result.closing_point ? result.closing_point.id : ""),
      kmlData("repeated_closing_row_source_row", result.closing_point ? result.closing_point.source_row : ""),
      kmlData("perimeter", result.perimeter.toFixed(3)),
      kmlData("perimeter_unit", result.unit_label),
      kmlData("area_acres", result.area_acres.toFixed(4)),
      kmlData("area_hectares", result.area_hectares.toFixed(4)),
      kmlData("grid_unit", result.unit_label),
      kmlData("generated_at", generatedAt)
    ].join("");

    const linePlacemarks = result.lines.map((line, index) => {
      const start = wgsPoints[index];
      const end = wgsPoints[(index + 1) % wgsPoints.length];
      return `
      <Placemark>
        <name>${xmlEscape(`${line.from}-${line.to}`)}</name>
        <styleUrl>#boundaryCourseStyle</styleUrl>
        <ExtendedData>
          ${kmlData("from", line.from)}
          ${kmlData("to", line.to)}
          ${kmlData("bearing", line.bearing_dms)}
          ${kmlData("distance", line.distance.toFixed(3))}
          ${kmlData("distance_unit", result.unit_label)}
          ${kmlData("remarks", line.remarks || "")}
        </ExtendedData>
        <LineString>
          <tessellate>1</tessellate>
          <coordinates>${kmlCoordinate(start)} ${kmlCoordinate(end)}</coordinates>
        </LineString>
      </Placemark>`;
    }).join("");

    const beaconPlacemarks = wgsPoints.map((point, index) => `
      <Placemark>
        <name>${xmlEscape(point.id)}</name>
        <styleUrl>#beaconStyle</styleUrl>
        <ExtendedData>
          ${kmlData("sequence", index + 1)}
          ${kmlData("computation_sheet_no", result.points[index].computation_sheet_no || "")}
          ${kmlData("description_no", result.points[index].description_no || "")}
          ${kmlData("page", result.points[index].page || "")}
          ${kmlData("remarks", result.points[index].beacon_remarks || "")}
          ${kmlData("easting", point.easting.toFixed(3))}
          ${kmlData("northing", point.northing.toFixed(3))}
          ${kmlData("grid_unit", result.unit_label)}
          ${kmlData("latitude", point.lat.toFixed(8))}
          ${kmlData("longitude", point.lon.toFixed(8))}
        </ExtendedData>
        <Point>
          <coordinates>${kmlCoordinate(point)}</coordinates>
        </Point>
      </Placemark>`).join("");

    return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${xmlEscape(projectName)}</name>
    <description>${xmlEscape(`Generated by Airban Converter v${ns.constants.appVersion}`)}</description>
    <Style id="parcelPolygonStyle">
      <LineStyle><color>ff2e7523</color><width>3</width></LineStyle>
      <PolyStyle><color>553cae49</color></PolyStyle>
    </Style>
    <Style id="boundaryCourseStyle">
      <LineStyle><color>ffff9f1c</color><width>2</width></LineStyle>
    </Style>
    <Style id="beaconStyle">
      <IconStyle>
        <scale>0.85</scale>
        <Icon><href>http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href></Icon>
      </IconStyle>
      <LabelStyle><scale>0.85</scale></LabelStyle>
    </Style>
    <Placemark>
      <name>${xmlEscape(`${projectName} parcel`)}</name>
      <styleUrl>#parcelPolygonStyle</styleUrl>
      <ExtendedData>${polygonData}</ExtendedData>
      <Polygon>
        <tessellate>1</tessellate>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${ringCoordinates}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>
    ${linePlacemarks}
    ${beaconPlacemarks}
  </Document>
</kml>
`;
  }

  function littleEndian16(value) {
    return [value & 255, (value >>> 8) & 255];
  }

  function littleEndian32(value) {
    return [
      value & 255,
      (value >>> 8) & 255,
      (value >>> 16) & 255,
      (value >>> 24) & 255
    ];
  }

  const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    return value >>> 0;
  });

  function crc32(bytes) {
    let crc = 0xffffffff;
    bytes.forEach((byte) => {
      crc = CRC_TABLE[(crc ^ byte) & 255] ^ (crc >>> 8);
    });
    return (crc ^ 0xffffffff) >>> 0;
  }

  function concatBytes(parts) {
    const length = parts.reduce((sum, part) => sum + part.length, 0);
    const output = new Uint8Array(length);
    let offset = 0;
    parts.forEach((part) => {
      output.set(part, offset);
      offset += part.length;
    });
    return output;
  }

  function bytes(values) {
    return new Uint8Array(values);
  }

  function zipDosDateTime(dateValue) {
    const date = new Date(dateValue || Date.now());
    const year = Math.max(1980, date.getFullYear());
    return {
      time: ((date.getHours() & 31) << 11) | ((date.getMinutes() & 63) << 5) | Math.floor((date.getSeconds() & 63) / 2),
      date: (((year - 1980) & 127) << 9) | (((date.getMonth() + 1) & 15) << 5) | (date.getDate() & 31)
    };
  }

  function zipStoredFile(filename, content, modifiedAt) {
    const encoder = new TextEncoder();
    const nameBytes = encoder.encode(filename);
    const dataBytes = typeof content === "string" ? encoder.encode(content) : content;
    const checksum = crc32(dataBytes);
    const stamp = zipDosDateTime(modifiedAt);
    const localHeader = bytes([
      ...littleEndian32(0x04034b50),
      ...littleEndian16(20),
      ...littleEndian16(0),
      ...littleEndian16(0),
      ...littleEndian16(stamp.time),
      ...littleEndian16(stamp.date),
      ...littleEndian32(checksum),
      ...littleEndian32(dataBytes.length),
      ...littleEndian32(dataBytes.length),
      ...littleEndian16(nameBytes.length),
      ...littleEndian16(0)
    ]);
    const centralHeader = bytes([
      ...littleEndian32(0x02014b50),
      ...littleEndian16(20),
      ...littleEndian16(20),
      ...littleEndian16(0),
      ...littleEndian16(0),
      ...littleEndian16(stamp.time),
      ...littleEndian16(stamp.date),
      ...littleEndian32(checksum),
      ...littleEndian32(dataBytes.length),
      ...littleEndian32(dataBytes.length),
      ...littleEndian16(nameBytes.length),
      ...littleEndian16(0),
      ...littleEndian16(0),
      ...littleEndian16(0),
      ...littleEndian16(0),
      ...littleEndian32(0),
      ...littleEndian32(0)
    ]);
    const local = concatBytes([localHeader, nameBytes, dataBytes]);
    const central = concatBytes([centralHeader, nameBytes]);
    const end = bytes([
      ...littleEndian32(0x06054b50),
      ...littleEndian16(0),
      ...littleEndian16(0),
      ...littleEndian16(1),
      ...littleEndian16(1),
      ...littleEndian32(central.length),
      ...littleEndian32(local.length),
      ...littleEndian16(0)
    ]);
    return concatBytes([local, central, end]);
  }

  function toKmz(result, options) {
    return zipStoredFile("doc.kml", toKml(result, options), options && options.generatedAt);
  }

  ns.parcel = {
    parsePoints,
    compute,
    formatBearing,
    toPlanRows,
    toBearingDistanceRows,
    toBeaconIndexRows,
    toComputationBeaconRows,
    toComputationCourseRows,
    toComputationPlanRows,
    toAreaComputationRows,
    toCalculationAuditRows,
    toGeometryReviewRows,
    squareUnitLabel,
    areaFromNative,
    historyText,
    toGeoJson,
    toDxf,
    toKml,
    toKmz
  };
})(window.GhanaGrid = window.GhanaGrid || {});
