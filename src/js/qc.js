(function (ns) {
  const REQUIRED_HISTORY_FIELDS = [
    { key: "locality", label: "Parcel locality" },
    { key: "district", label: "District" },
    { key: "client", label: "Client name" },
    { key: "regionalNumber", label: "Regional number" },
    { key: "corsId", label: "Reference CORS ID" }
  ];
  const REQUIRED_SURVEY_FIELDS = [
    { key: "surveyDate", label: "Survey date" },
    { key: "preparedBy", label: "Prepared by" }
  ];

  function clean(value) {
    return String(value ?? "").trim();
  }

  function check(category, name, status, detail) {
    return { category, check: name, status, detail };
  }

  function statusRank(status) {
    if (status === "Error") return 3;
    if (status === "Warning") return 2;
    return 1;
  }

  function duplicateValues(items, keyFn) {
    const seen = new Map();
    const duplicates = new Set();
    items.forEach((item) => {
      const key = keyFn(item);
      if (seen.has(key)) duplicates.add(key);
      seen.set(key, true);
    });
    return Array.from(duplicates);
  }

  function formatPrecision(value) {
    if (!Number.isFinite(value)) return "Closed";
    return `1:${Math.round(value).toLocaleString()}`;
  }

  function pointBoundsCheck(result) {
    try {
      const outside = [];
      result.points.forEach((point) => {
        const converted = ns.converter.gridToWgs(point.easting, point.northing, result.unit);
        if (!ns.utils.inGhanaBounds(converted.lat, converted.lon)) {
          outside.push(point.id);
        }
      });

      if (outside.length) {
        return check(
          "Coordinate Bounds",
          "Ghana extent",
          "Warning",
          `${outside.join(", ")} convert outside the Ghana preview bounds. Confirm the input unit and coordinate system.`
        );
      }

      return check("Coordinate Bounds", "Ghana extent", "OK", "All beacons convert inside the Ghana preview bounds.");
    } catch (error) {
      return check("Coordinate Bounds", "Ghana extent", "Warning", `Bounds check could not run: ${error.message}`);
    }
  }

  function traverseChecks(reduction, adjustment) {
    if (!reduction) {
      return [
        check(
          "Traverse Evidence",
          "Observation reduction",
          "Warning",
          "No traverse reduction evidence is attached to this parcel. Attach raw observations where available."
        )
      ];
    }

    const checks = [];
    const closeText = `${reduction.close_error.toFixed(6)} ${reduction.unit_label}`;

    if (!reduction.closed_traverse) {
      checks.push(check("Traverse Evidence", "Closure", "Warning", `Open traverse or missing close line. Current close is ${closeText}.`));
      return checks;
    }

    if (Number.isFinite(reduction.precision) && reduction.precision < 5000) {
      checks.push(check("Traverse Evidence", "Closure precision", "Warning", `Closure precision is ${formatPrecision(reduction.precision)} before adjustment.`));
    } else {
      checks.push(check("Traverse Evidence", "Closure precision", "OK", `Closure precision is ${formatPrecision(reduction.precision)} before adjustment.`));
    }

    if (!adjustment) {
      checks.push(check("Traverse Evidence", "Adjustment", "Warning", "Closed traverse has not been adjusted with Bowditch or another method."));
    } else {
      checks.push(check("Traverse Evidence", "Adjustment", "OK", `Adjusted close is ${adjustment.close_error_after.toFixed(6)} ${adjustment.unit_label}.`));
    }

    return checks;
  }

  function evaluate(details, result, context) {
    const project = details || {};
    const evidence = context || {};
    const checks = [];

    const missing = REQUIRED_HISTORY_FIELDS
      .filter((field) => !clean(project[field.key]))
      .map((field) => field.label);

    checks.push(missing.length
      ? check("Project Details", "History of Survey fields", "Warning", `Missing: ${missing.join(", ")}.`)
      : check("Project Details", "History of Survey fields", "OK", "Required History of Survey details are complete."));

    const missingSurveyFields = REQUIRED_SURVEY_FIELDS
      .filter((field) => !clean(project[field.key]))
      .map((field) => field.label);

    checks.push(missingSurveyFields.length
      ? check("Project Details", "Survey fields", "Warning", `Missing: ${missingSurveyFields.join(", ")}.`)
      : check("Project Details", "Survey fields", "OK", "Visible survey fields are complete."));

    if (!result) {
      checks.push(check("Parcel Geometry", "Parcel computation", "Error", "No parcel computation is available."));
      return summarize(checks);
    }

    checks.push(result.points.length >= 3
      ? check("Parcel Geometry", "Minimum beacons", "OK", `${result.points.length} beacons supplied.`)
      : check("Parcel Geometry", "Minimum beacons", "Error", "A parcel needs at least three beacons."));

    checks.push(result.closing_point_removed
      ? check("Parcel Geometry", "Repeated closing row", "OK", `Input row ${result.closing_point.source_row || "at end"} repeated ${result.closing_point.id || "the first beacon"} and was excluded from computation.`)
      : check("Parcel Geometry", "Repeated closing row", "OK", "No repeated closing row detected."));

    checks.push(result.reference_point_count
      ? check("Parcel Geometry", "Reference CORS rows", "OK", `${result.reference_point_count} reference row${result.reference_point_count === 1 ? "" : "s"} excluded before area/perimeter computation.`)
      : check("Parcel Geometry", "Reference CORS rows", "OK", `${result.reference_row_mode_label || "Auto-detect CORS/reference rows"}; no reference rows excluded.`));

    const duplicateIds = duplicateValues(result.points, (point) => clean(point.id).toLowerCase());
    checks.push(duplicateIds.length
      ? check("Parcel Geometry", "Beacon IDs", "Error", `Duplicate beacon ID(s): ${duplicateIds.join(", ")}.`)
      : check("Parcel Geometry", "Beacon IDs", "OK", "Beacon IDs are unique."));

    const duplicateCoordinates = duplicateValues(result.points, (point) => `${point.nativeEasting.toFixed(6)}:${point.nativeNorthing.toFixed(6)}`);
    checks.push(duplicateCoordinates.length
      ? check("Parcel Geometry", "Duplicate coordinates", "Warning", "Two or more beacons have the same coordinate pair.")
      : check("Parcel Geometry", "Duplicate coordinates", "OK", "No duplicate coordinate pairs found."));

    const shortLines = result.lines.filter((line) => line.distance <= 0.000001).map((line) => `${line.from}-${line.to}`);
    checks.push(shortLines.length
      ? check("Parcel Geometry", "Zero length sides", "Error", `Zero length side(s): ${shortLines.join(", ")}.`)
      : check("Parcel Geometry", "Zero length sides", "OK", "No zero length sides found."));

    const geometryRows = ns.parcel.toGeometryReviewRows(result);
    const shortest = geometryRows.find((item) => item.item === "Shortest side");
    const average = geometryRows.find((item) => item.item === "Average side length");
    const shortestDistance = shortest ? Number(String(shortest.unit).split(" ")[0]) : NaN;
    const averageDistance = average ? Number(average.value) : NaN;
    checks.push(Number.isFinite(shortestDistance) && Number.isFinite(averageDistance) && averageDistance > 0 && shortestDistance < averageDistance * 0.1
      ? check("Parcel Geometry", "Side length spread", "Warning", `Shortest side ${shortest.value} is much shorter than average side length. Confirm beacon order and coordinate entry.`)
      : check("Parcel Geometry", "Side length spread", "OK", "Shortest, longest, and average side lengths are available in Geometry Review."));

    checks.push(result.perimeter > 0
      ? check("Area Evidence", "Perimeter", "OK", `${result.perimeter.toFixed(3)} ${result.unit_label}.`)
      : check("Area Evidence", "Perimeter", "Error", "Perimeter is not positive."));

    checks.push(result.area_square_metres > 0
      ? check("Area Evidence", "Area", "OK", `${result.area_acres.toFixed(4)} acres / ${result.area_hectares.toFixed(4)} hectares.`)
      : check("Area Evidence", "Area", "Error", "Area is not positive."));

    checks.push(pointBoundsCheck(result));
    checks.push(...traverseChecks(evidence.reduction, evidence.adjustment));

    return summarize(checks);
  }

  function summarize(checks) {
    const errors = checks.filter((item) => item.status === "Error").length;
    const warnings = checks.filter((item) => item.status === "Warning").length;
    const status = errors ? "blocked" : warnings ? "review" : "ready";
    const summary = errors
      ? "Needs correction before export"
      : warnings ? "Ready with review warnings" : "Ready for export review";

    return {
      status,
      summary,
      counts: {
        ok: checks.filter((item) => item.status === "OK").length,
        warnings,
        errors
      },
      checks: checks.slice().sort((a, b) => statusRank(b.status) - statusRank(a.status))
    };
  }

  function toRows(result) {
    if (!result) return [];
    return result.checks.map((item, index) => ({
      no: index + 1,
      category: item.category,
      check: item.check,
      status: item.status,
      detail: item.detail
    }));
  }

  ns.qc = {
    evaluate,
    toRows
  };
})(window.GhanaGrid = window.GhanaGrid || {});
