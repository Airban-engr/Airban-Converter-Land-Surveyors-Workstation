(function (ns) {
  const $ = ns.utils.byId;
  let convertedCsv = [];
  let mappedPoints = [];
  let latestResult = null;
  let latestParcelResult = null;
  let latestQcResult = null;
  let latestHistoryText = "";
  let latestObservationImport = null;
  let latestReductionResult = null;
  let latestAdjustmentResult = null;
  let activeParcelOutput = "plan";
  let latestParcelSource = {
    code: "manual",
    label: "Manual / pasted coordinates",
    detail: "Parcel coordinates were entered directly or loaded from a parcel CSV."
  };

  function parcelSource(code, label, detail) {
    return {
      code: code || "manual",
      label: label || "Manual / pasted coordinates",
      detail: detail || "Parcel coordinates were entered directly or loaded from a parcel CSV."
    };
  }

  function setParcelSource(source) {
    latestParcelSource = parcelSource(source && source.code, source && source.label, source && source.detail);
    if ($("parcel-source")) $("parcel-source").textContent = latestParcelSource.label;
  }

  function showMessage(text, type) {
    const message = $("message");
    message.textContent = text;
    message.className = `message is-visible ${type || "info"}`;
  }

  function clearMessage() {
    const message = $("message");
    message.textContent = "";
    message.className = "message";
  }

  function setReview({ mode, count, unit, status }) {
    $("review-mode").textContent = mode || "-";
    $("review-count").textContent = Number.isFinite(count) ? String(count) : "-";
    $("review-unit").textContent = unit || "-";
    $("review-status").textContent = status || "-";
  }

  function setMappedPoints(points) {
    mappedPoints = points.filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon));
    $("download-geojson").disabled = mappedPoints.length === 0;
  }

  function currentGridResultUnit() {
    return $("grid-result-unit") ? $("grid-result-unit").value : "gold_coast_foot";
  }

  function currentUtmResultUnit() {
    return $("utm-result-unit") ? $("utm-result-unit").value : "metre";
  }

  function currentSingleUtmZone() {
    return $("single-utm-zone") ? $("single-utm-zone").value : "auto";
  }

  function formatGrid(easting, northing, sourceUnit, displayUnit) {
    if (!Number.isFinite(easting) || !Number.isFinite(northing)) return "-";
    const unit = displayUnit || currentGridResultUnit();
    const nativeEasting = ns.units.toNative(easting, sourceUnit);
    const nativeNorthing = ns.units.toNative(northing, sourceUnit);
    const displayEasting = ns.units.fromNative(nativeEasting, unit);
    const displayNorthing = ns.units.fromNative(nativeNorthing, unit);
    return `E ${displayEasting.toFixed(3)}, N ${displayNorthing.toFixed(3)} ${ns.units.label(unit)}`;
  }

  function formatUtm(utm, displayUnit) {
    if (!utm || !Number.isFinite(utm.easting) || !Number.isFinite(utm.northing)) return "-";
    const unit = displayUnit || currentUtmResultUnit();
    const easting = ns.units.fromMetre(utm.easting, unit);
    const northing = ns.units.fromMetre(utm.northing, unit);
    const unitLabel = ns.units.metricLabel(unit);
    const note = unit === "metre" ? "EPSG native" : "display";
    return `E ${easting.toFixed(3)}, N ${northing.toFixed(3)} ${unitLabel} ${utm.zone} (${utm.crs}, ${note})`;
  }

  function precisionText(value) {
    if (!Number.isFinite(value)) return "Closed";
    return `1:${Math.round(value).toLocaleString()}`;
  }

  function downloadTextFile(filename, text, type, prefix) {
    const blob = new Blob([prefix || "", text], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function downloadBinaryFile(filename, bytes, type) {
    const blob = new Blob([bytes], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  function setResults({ lat, lon, easting, northing, unit, utm }) {
    let resultUtm = utm;
    const gridDisplayUnit = currentGridResultUnit();
    const utmDisplayUnit = currentUtmResultUnit();
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      resultUtm = ns.converter.wgsToUtm(lat, lon, currentSingleUtmZone());
    }
    $("result-lat").textContent = Number.isFinite(lat) ? lat.toFixed(8) : "-";
    $("result-lon").textContent = Number.isFinite(lon) ? lon.toFixed(8) : "-";
    $("result-dms").textContent = Number.isFinite(lat) && Number.isFinite(lon)
      ? `${ns.dms.decimalToDms(lat, "lat")}, ${ns.dms.decimalToDms(lon, "lon")}`
      : "-";
    $("result-grid").textContent = formatGrid(easting, northing, unit, gridDisplayUnit);
    $("result-utm").textContent = formatUtm(resultUtm, utmDisplayUnit);
    latestResult = { lat, lon, easting, northing, unit, utm: resultUtm };
    $("copy-results").disabled = !(Number.isFinite(lat) && Number.isFinite(lon));
  }

  function refreshResultUnits() {
    if (latestResult) setResults(latestResult);
  }

  function warnIfOutsideGhana(lat, lon) {
    if (!ns.utils.inGhanaBounds(lat, lon)) {
      showMessage("Converted point is outside the rough Ghana bounds. Check units and input values.", "error");
      return true;
    }
    return false;
  }

  function getCsvUtmZone(row, fallbackZone, sourceRow, allowAuto) {
    const rowZone = ns.csv.getColumn(row, ["utm_zone", "utmzone", "zone", "utm"]);
    if (rowZone) return ns.converter.normaliseUtmZone(rowZone);
    if (fallbackZone && fallbackZone !== "auto") return ns.converter.normaliseUtmZone(fallbackZone);
    if (allowAuto) return "auto";
    throw new Error(`Row ${sourceRow} needs a UTM zone. Choose Zone 30N/31N or include an utm_zone column.`);
  }

  function utmCsvColumns(utm, displayUnit) {
    const suffix = ns.units.csvSuffix(displayUnit);
    return {
      [`utm_easting_${suffix}`]: ns.units.fromMetre(utm.easting, displayUnit).toFixed(3),
      [`utm_northing_${suffix}`]: ns.units.fromMetre(utm.northing, displayUnit).toFixed(3),
      utm_output_unit: ns.units.metricLabel(displayUnit),
      utm_zone: utm.zone,
      utm_crs: utm.crs
    };
  }

  function gridCsvColumns(easting, northing, unit) {
    return {
      ghana_grid_easting: easting.toFixed(3),
      ghana_grid_northing: northing.toFixed(3),
      ghana_grid_unit: ns.units.label(unit)
    };
  }

  function updateCsvGridUnitLabel() {
    const label = $("csv-grid-unit-label");
    if (!label) return;
    const mode = $("csv-mode").value;
    label.textContent = mode === "grid_to_wgs" || mode === "grid_to_utm"
      ? "Ghana Grid input unit"
      : "Ghana Grid output unit";
  }

  function handleGridConvert() {
    try {
      clearMessage();
      const unit = $("grid-unit").value;
      const easting = ns.utils.parseNumber($("grid-easting").value, "Easting");
      const northing = ns.utils.parseNumber($("grid-northing").value, "Northing");
      const { lat, lon } = ns.converter.gridToWgs(easting, northing, unit);
      const grid = ns.converter.wgsToGrid(lat, lon, unit);
      const utm = ns.converter.wgsToUtm(lat, lon, currentSingleUtmZone());
      ns.map.clearBatch();
      setResults({ lat, lon, easting: grid.easting, northing: grid.northing, unit, utm });
      setMappedPoints([{
        id: "Single point",
        lat,
        lon,
        label: `Grid E ${easting}, N ${northing}`,
        properties: {
          source: "single_grid_to_wgs84",
          easting,
          northing,
          grid_unit: ns.units.label(unit),
          ...utmCsvColumns(utm, currentUtmResultUnit())
        }
      }]);
      setReview({
        mode: "Grid to WGS84",
        count: 1,
        unit: ns.units.label(unit),
        status: ns.utils.inGhanaBounds(lat, lon) ? "OK" : "Outside Ghana rough bounds"
      });
      ns.map.updatePoint(lat, lon, `Grid E ${easting}, N ${northing}`);
      if (!warnIfOutsideGhana(lat, lon)) showMessage("Conversion complete.", "info");
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  function handleWgsConvert() {
    try {
      clearMessage();
      const unit = $("wgs-output-unit").value;
      const lat = ns.utils.parseNumber($("wgs-lat").value, "Latitude");
      const lon = ns.utils.parseNumber($("wgs-lon").value, "Longitude");
      if (lat < -90 || lat > 90) throw new Error("Latitude must be between -90 and 90.");
      if (lon < -180 || lon > 180) throw new Error("Longitude must be between -180 and 180.");
      const { easting, northing } = ns.converter.wgsToGrid(lat, lon, unit);
      const utm = ns.converter.wgsToUtm(lat, lon, currentSingleUtmZone());
      ns.map.clearBatch();
      setResults({ lat, lon, easting, northing, unit, utm });
      setMappedPoints([{
        id: "Single point",
        lat,
        lon,
        label: `WGS84 ${lat.toFixed(6)}, ${lon.toFixed(6)}`,
        properties: {
          source: "single_wgs84_to_grid",
          easting: easting.toFixed(3),
          northing: northing.toFixed(3),
          grid_unit: ns.units.label(unit),
          ...utmCsvColumns(utm, currentUtmResultUnit())
        }
      }]);
      setReview({
        mode: "WGS84 to Grid",
        count: 1,
        unit: ns.units.label(unit),
        status: ns.utils.inGhanaBounds(lat, lon) ? "OK" : "Outside Ghana rough bounds"
      });
      ns.map.updatePoint(lat, lon, `WGS84 ${lat.toFixed(6)}, ${lon.toFixed(6)}`);
      if (!warnIfOutsideGhana(lat, lon)) showMessage("Conversion complete.", "info");
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  function handleUtmConvert() {
    try {
      clearMessage();
      const unit = $("utm-output-unit").value;
      const utmEasting = ns.utils.parseNumber($("utm-easting").value, "UTM easting");
      const utmNorthing = ns.utils.parseNumber($("utm-northing").value, "UTM northing");
      const zone = ns.converter.normaliseUtmZone($("utm-zone").value);
      const result = ns.converter.utmToGrid(utmEasting, utmNorthing, zone, unit);
      const utm = ns.converter.wgsToUtm(result.lat, result.lon, currentSingleUtmZone());

      ns.map.clearBatch();
      setResults({ lat: result.lat, lon: result.lon, easting: result.easting, northing: result.northing, unit, utm });
      setMappedPoints([{
        id: `UTM ${zone}`,
        lat: result.lat,
        lon: result.lon,
        label: `UTM ${zone} E ${utmEasting}, N ${utmNorthing}`,
        properties: {
          source: "single_utm_to_grid",
          utm_easting: utmEasting.toFixed(3),
          utm_northing: utmNorthing.toFixed(3),
          utm_zone: zone,
          ...gridCsvColumns(result.easting, result.northing, unit)
        }
      }]);
      setReview({
        mode: "UTM to Grid",
        count: 1,
        unit: `${ns.units.label(unit)} / ${zone}`,
        status: ns.utils.inGhanaBounds(result.lat, result.lon) ? "OK" : "Outside Ghana rough bounds"
      });
      ns.map.updatePoint(result.lat, result.lon, `UTM ${zone} E ${utmEasting}, N ${utmNorthing}`);
      if (!warnIfOutsideGhana(result.lat, result.lon)) showMessage("UTM conversion complete.", "info");
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  function handleDmsConvert() {
    try {
      clearMessage();
      let lat;
      let lon;
      if ($("freeform-dms").value.trim()) {
        const parsed = ns.dms.parseFreeform($("freeform-dms").value);
        lat = parsed.lat;
        lon = parsed.lon;
      } else {
        lat = ns.dms.dmsToDecimal($("lat-deg").value, $("lat-min").value, $("lat-sec").value, $("lat-dir").value);
        lon = ns.dms.dmsToDecimal($("lon-deg").value, $("lon-min").value, $("lon-sec").value, $("lon-dir").value);
      }

      const unit = "gold_coast_foot";
      const { easting, northing } = ns.converter.wgsToGrid(lat, lon, unit);
      const utm = ns.converter.wgsToUtm(lat, lon, currentSingleUtmZone());
      ns.map.clearBatch();
      setResults({ lat, lon, easting, northing, unit, utm });
      setMappedPoints([{
        id: "DMS point",
        lat,
        lon,
        label: `DMS ${ns.dms.decimalToDms(lat, "lat")}, ${ns.dms.decimalToDms(lon, "lon")}`,
        properties: {
          source: "dms_to_decimal",
          easting: easting.toFixed(3),
          northing: northing.toFixed(3),
          grid_unit: ns.units.label(unit),
          ...utmCsvColumns(utm, currentUtmResultUnit())
        }
      }]);
      setReview({
        mode: "DMS parser",
        count: 1,
        unit: ns.units.label(unit),
        status: ns.utils.inGhanaBounds(lat, lon) ? "OK" : "Outside Ghana rough bounds"
      });
      ns.map.updatePoint(lat, lon, `DMS ${ns.dms.decimalToDms(lat, "lat")}, ${ns.dms.decimalToDms(lon, "lon")}`);
      if (!warnIfOutsideGhana(lat, lon)) showMessage("DMS parsed and plotted.", "info");
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  function renderCsvTable(rows) {
    const table = $("csv-table");
    if (!rows.length) {
      table.innerHTML = "<thead><tr><th>CSV output appears here</th></tr></thead><tbody><tr><td>No rows converted.</td></tr></tbody>";
      return;
    }
    const headers = Object.keys(rows[0]);
    const previewRows = rows.slice(0, 30);
    table.innerHTML = `
      <thead><tr>${headers.map((header) => `<th>${ns.utils.escapeHtml(header)}</th>`).join("")}</tr></thead>
      <tbody>
        ${previewRows.map((row) => `<tr>${headers.map((header) => `<td>${ns.utils.escapeHtml(row[header])}</td>`).join("")}</tr>`).join("")}
      </tbody>
    `;
  }

  function parcelDetails() {
    return {
      projectName: $("project-name").value.trim(),
      locality: $("parcel-locality").value.trim(),
      district: $("parcel-district").value.trim(),
      client: $("parcel-client").value.trim(),
      regionalNumber: $("parcel-regional-number").value.trim(),
      corsId: $("parcel-cors-id").value.trim(),
      surveyDate: $("survey-date").value.trim(),
      issueDate: $("issue-date").value.trim(),
      preparedBy: $("prepared-by").value.trim(),
      checkedBy: $("checked-by").value.trim(),
      reportRevision: $("report-revision").value.trim(),
      reportStatus: $("report-status").value,
      boundary: $("parcel-boundary").value.trim(),
      historyPurpose: $("history-purpose").value.trim(),
      historyAcreage: $("history-acreage").value.trim(),
      historyHectares: $("history-hectares").value.trim(),
      historyOverride: $("history-override").value.trim(),
      projectNotes: $("project-notes").value.trim()
    };
  }

  function setProjectStatus(text) {
    $("project-status").textContent = text;
  }

  function collectProjectState() {
    return ns.project.build({
      name: $("project-name").value.trim(),
      details: parcelDetails(),
      parcelUnit: $("parcel-unit").value,
      parcelReferenceMode: $("reference-row-mode").value,
      parcelCoordinates: $("parcel-coordinates").value.trim(),
      parcelSource: latestParcelSource,
      activeOutput: activeParcelOutput,
      observationUnit: $("observation-unit").value,
      observationOrder: $("observation-order").value,
      observationFilter: $("observation-filter").value.trim(),
      observationText: $("observation-text").value.trim(),
      reductionStartId: $("reduction-start-id").value.trim(),
      reductionStartEasting: $("reduction-start-easting").value.trim(),
      reductionStartNorthing: $("reduction-start-northing").value.trim(),
      reductionUnit: $("reduction-unit").value,
      reductionText: $("reduction-text").value.trim(),
      reductionAdjustmentApplied: Boolean(latestAdjustmentResult),
      angularStartId: $("angular-start-id").value.trim(),
      angularStartEasting: $("angular-start-easting").value.trim(),
      angularStartNorthing: $("angular-start-northing").value.trim(),
      angularUnit: $("angular-unit").value,
      angularInitialBearing: $("angular-initial-bearing").value.trim(),
      angularAngleMode: $("angular-angle-mode").value,
      angularText: $("angular-text").value.trim(),
      angularAdjustmentApplied: Boolean(latestAdjustmentResult && latestReductionResult && latestReductionResult.source_mode === "angular_traverse"),
      notes: $("project-notes").value.trim()
    });
  }

  function setValue(id, value) {
    $(id).value = value || "";
  }

  async function applyProject(project, sourceLabel) {
    const details = (project.project && project.project.details) || {};
    const workstation = project.workstation || {};
    const observations = project.observations || {};
    const reduction = project.reduction || {};
    const angular = project.angular || {};

    setValue("project-name", project.project && project.project.name ? project.project.name : details.projectName);
    setValue("parcel-locality", details.locality);
    setValue("parcel-district", details.district);
    setValue("parcel-client", details.client);
    setValue("parcel-regional-number", details.regionalNumber);
    setValue("parcel-cors-id", details.corsId);
    setValue("survey-date", details.surveyDate);
    setValue("issue-date", details.issueDate);
    setValue("prepared-by", details.preparedBy);
    setValue("checked-by", details.checkedBy);
    setValue("report-revision", details.reportRevision);
    $("report-status").value = details.reportStatus || "";
    setValue("parcel-boundary", details.boundary);
    setValue("history-purpose", details.historyPurpose);
    setValue("history-acreage", details.historyAcreage);
    setValue("history-hectares", details.historyHectares);
    setValue("history-override", details.historyOverride || details.customHistory);
    setValue("project-notes", project.notes);
    $("parcel-unit").value = workstation.parcel_unit || "gold_coast_foot";
    $("reference-row-mode").value = workstation.reference_row_mode || "auto";
    $("parcel-coordinates").value = workstation.parcel_coordinates || "";
    $("parcel-file").value = "";
    $("observation-unit").value = observations.unit || "gold_coast_foot";
    $("observation-order").value = observations.coordinate_order || "id_easting_northing";
    $("observation-filter").value = observations.filter || "";
    $("observation-text").value = observations.text || "";
    $("observation-file").value = "";
    setValue("reduction-start-id", reduction.start_id);
    setValue("reduction-start-easting", reduction.start_easting);
    setValue("reduction-start-northing", reduction.start_northing);
    $("reduction-unit").value = reduction.unit || "gold_coast_foot";
    $("reduction-text").value = reduction.text || "";
    $("reduction-file").value = "";
    setValue("angular-start-id", angular.start_id);
    setValue("angular-start-easting", angular.start_easting);
    setValue("angular-start-northing", angular.start_northing);
    $("angular-unit").value = angular.unit || "gold_coast_foot";
    setValue("angular-initial-bearing", angular.initial_bearing);
    $("angular-angle-mode").value = angular.angle_mode || "deflection_right";
    $("angular-text").value = angular.text || "";
    $("angular-file").value = "";
    activateParcelOutput(workstation.active_output || "plan");
    resetParcelState();
    setParcelSource(workstation.parcel_source || parcelSource("project_restore", "Restored parcel coordinates", "Parcel coordinates were restored from an Airban project file."));
    latestObservationImport = null;
    resetReductionState();

    if ($("observation-text").value.trim()) await handleImportObservations();
    if ($("reduction-text").value.trim() && $("reduction-start-easting").value.trim() && $("reduction-start-northing").value.trim()) {
      await handleReduceObservations();
      if (reduction.adjustment_applied && latestReductionResult && latestReductionResult.closed_traverse) {
        handleAdjustReduction();
      }
    }
    if ($("angular-text").value.trim() && $("angular-start-easting").value.trim() && $("angular-start-northing").value.trim() && $("angular-initial-bearing").value.trim()) {
      await handleReduceAngularObservations();
      if (angular.adjustment_applied && latestReductionResult && latestReductionResult.closed_traverse) {
        handleAdjustReduction();
      }
    }
    if ($("parcel-coordinates").value.trim()) await handleParcelCompute();

    const savedAt = project.saved_at ? ` Saved ${project.saved_at}.` : "";
    setProjectStatus(`${sourceLabel || "Project"} restored.${savedAt}`);
  }

  function handleExportProject() {
    const project = collectProjectState();
    const json = JSON.stringify(project, null, 2);
    downloadTextFile(ns.project.filename(project), json, "application/json;charset=utf-8");
    setProjectStatus(`Project file prepared: ${ns.project.filename(project)}`);
    showMessage("Project file downloaded.", "info");
  }

  async function handleImportProject() {
    try {
      clearMessage();
      const file = $("project-file").files[0];
      if (!file) throw new Error("Choose an Airban project JSON file first.");
      const project = ns.project.parse(await file.text());
      await applyProject(project, "Project file");
      showMessage("Project file opened.", "info");
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  function handleSaveBrowserDraft() {
    try {
      const project = collectProjectState();
      ns.project.saveDraft(project);
      setProjectStatus(`Browser draft saved ${project.saved_at}.`);
      showMessage("Browser draft saved on this device.", "info");
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  async function handleRestoreBrowserDraft() {
    try {
      clearMessage();
      await applyProject(ns.project.loadDraft(), "Browser draft");
      showMessage("Browser draft restored.", "info");
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  function handleClearBrowserDraft() {
    ns.project.clearDraft();
    setProjectStatus("Browser draft cleared.");
    showMessage("Browser draft cleared on this device.", "info");
  }

  function setObservationSummary(result, accepted, unit) {
    $("observation-count").textContent = result ? String(accepted.length) : "-";
    $("observation-rejected").textContent = result ? String(result.rejected.length) : "-";
    $("observation-source").textContent = result ? `${result.format}, ${ns.units.label(unit)}` : "-";
  }

  function renderObservationTable(accepted, rejected) {
    const table = $("observation-table");
    if (!accepted.length && !rejected.length) {
      table.innerHTML = "<thead><tr><th>Observation points appear here</th></tr></thead><tbody><tr><td>No observations imported yet.</td></tr></tbody>";
      return;
    }

    const acceptedRows = accepted.map((point) => ({
      status: "Accepted",
      row: point.source_row,
      id: point.id,
      easting: point.easting.toFixed(3),
      northing: point.northing.toFixed(3),
      elevation: Number.isFinite(point.elevation) ? point.elevation.toFixed(3) : "",
      code: point.code || ""
    }));
    const rejectedRows = rejected.map((item) => ({
      status: "Rejected",
      row: item.row,
      id: "",
      easting: "",
      northing: "",
      elevation: "",
      code: item.reason
    }));

    renderTable($("observation-table"), [
      { key: "status", label: "Status" },
      { key: "row", label: "Row" },
      { key: "id", label: "Point" },
      { key: "easting", label: "Easting" },
      { key: "northing", label: "Northing" },
      { key: "elevation", label: "Elevation" },
      { key: "code", label: "Code / Note" }
    ], [...acceptedRows, ...rejectedRows]);
  }

  async function readObservationText() {
    const file = $("observation-file").files[0];
    if (file) {
      const text = await file.text();
      $("observation-text").value = text;
      return text;
    }
    const pasted = $("observation-text").value.trim();
    if (pasted) return pasted;
    throw new Error("Choose an observation file or paste observation coordinates first.");
  }

  function observationPointsToMapPoints(points, unit) {
    return points.map((point) => {
      const converted = ns.converter.gridToWgs(point.easting, point.northing, unit);
      return {
        id: point.id,
        lat: converted.lat,
        lon: converted.lon,
        label: `${point.id}: E ${point.easting.toFixed(3)}, N ${point.northing.toFixed(3)} ${ns.units.label(unit)}`,
        properties: {
          source: "observation_import",
          point: point.id,
          easting: point.easting.toFixed(3),
          northing: point.northing.toFixed(3),
          elevation: Number.isFinite(point.elevation) ? point.elevation.toFixed(3) : "",
          code: point.code || "",
          grid_unit: ns.units.label(unit)
        }
      };
    });
  }

  async function handleImportObservations() {
    try {
      clearMessage();
      const unit = $("observation-unit").value;
      const coordinateOrder = $("observation-order").value;
      const text = await readObservationText();
      const parsed = ns.observations.parse(text, { coordinateOrder });
      const filter = $("observation-filter").value.trim();
      const accepted = ns.observations.filterPoints(parsed.points, filter);

      latestObservationImport = { ...parsed, accepted, unit, filter, coordinate_order: parsed.coordinate_order };
      setObservationSummary(parsed, accepted, unit);
      renderObservationTable(accepted, parsed.rejected);
      $("use-observations-for-parcel").disabled = accepted.length < 3;

      const mapPoints = observationPointsToMapPoints(accepted, unit);
      setMappedPoints(mapPoints);
      if (mapPoints.length) {
        ns.map.plotPoints(mapPoints, `${accepted.length} imported observation point${accepted.length === 1 ? "" : "s"} plotted`);
      } else {
        ns.map.clearBatch();
        $("map-meta").textContent = "No imported observation points accepted";
      }
      setReview({
        mode: "Observation Import",
        count: accepted.length,
        unit: ns.units.label(unit),
        status: parsed.rejected.length ? `${parsed.rejected.length} rejected` : "OK"
      });

      const duplicateNote = parsed.duplicateIds.length ? ` Duplicate IDs: ${parsed.duplicateIds.join(", ")}.` : "";
      showMessage(`${accepted.length} observation point${accepted.length === 1 ? "" : "s"} accepted.${duplicateNote}`, parsed.rejected.length ? "error" : "info");
    } catch (error) {
      latestObservationImport = null;
      $("use-observations-for-parcel").disabled = true;
      setObservationSummary(null, [], "gold_coast_foot");
      renderObservationTable([], []);
      showMessage(error.message, "error");
    }
  }

  async function handleUseObservationsForParcel() {
    if (!latestObservationImport || latestObservationImport.accepted.length < 3) {
      showMessage("Import at least three accepted observation points before using them as a parcel.", "error");
      return;
    }

    $("parcel-unit").value = latestObservationImport.unit;
    $("parcel-file").value = "";
    $("parcel-coordinates").value = ns.observations.toParcelCsv(latestObservationImport.accepted);
    setParcelSource(parcelSource(
      "observation_import",
      "Imported observation coordinates",
      `${latestObservationImport.accepted.length} accepted observation point${latestObservationImport.accepted.length === 1 ? "" : "s"} from ${latestObservationImport.format}; filter ${latestObservationImport.filter || "None"}; order ${latestObservationImport.coordinate_order_label || latestObservationImport.format}.`
    ));
    await handleParcelCompute();
    showMessage("Accepted observation points loaded and computed as parcel beacons.", "info");
  }

  function handleSampleObservations() {
    $("observation-unit").value = "gold_coast_foot";
    $("observation-order").value = "id_easting_northing";
    $("observation-filter").value = "BEACON";
    $("observation-file").value = "";
    $("observation-text").value = [
      "Point,Easting,Northing,Elevation,Code",
      "P01,833356.39,180404.48,18.220,BEACON",
      "P02,833317.35,180452.99,18.110,BEACON",
      "P03,833381.82,180518.39,18.060,BEACON",
      "P04,833438.90,180461.06,18.150,BEACON",
      "CTRL01,833250.00,180300.00,19.000,CONTROL"
    ].join("\n");
    handleImportObservations();
  }

  function setReductionSummary(result, adjustment) {
    $("reduction-count").textContent = result ? String(result.points.length) : "-";
    $("reduction-distance").textContent = result ? `${result.total_distance.toFixed(3)} ${result.unit_label}` : "-";
    $("reduction-close").textContent = result ? `${result.close_error.toFixed(3)} ${result.unit_label}` : "-";
    $("reduction-precision").textContent = result
      ? (Number.isFinite(result.precision) ? `1:${Math.round(result.precision).toLocaleString()}` : "Closed")
      : "-";
    $("reduction-adjusted-close").textContent = adjustment ? `${adjustment.close_error_after.toFixed(6)} ${adjustment.unit_label}` : "-";
  }

  function renderReductionTable(result, adjustment) {
    const table = $("reduction-table");
    if (!result || !result.points.length) {
      table.innerHTML = "<thead><tr><th>Reduced coordinates appear here</th></tr></thead><tbody><tr><td>No observations reduced yet.</td></tr></tbody>";
      return;
    }

    const hasAngles = result.lines.some((line) => line.observed_angle_dms || line.angle_mode);
    const rows = result.points.map((point, index) => {
      const line = index > 0 ? result.lines[index - 1] : null;
      return {
        order: index + 1,
        point: point.id,
        observed_angle: line ? line.observed_angle_dms || "" : "",
        angle_mode: line ? line.angle_mode || "" : "",
        easting: point.easting.toFixed(3),
        northing: point.northing.toFixed(3),
        adjusted_easting: adjustment && adjustment.points[index] ? adjustment.points[index].easting.toFixed(3) : "",
        adjusted_northing: adjustment && adjustment.points[index] ? adjustment.points[index].northing.toFixed(3) : "",
        correction_easting: adjustment && adjustment.points[index] ? adjustment.points[index].correction_easting.toFixed(3) : "",
        correction_northing: adjustment && adjustment.points[index] ? adjustment.points[index].correction_northing.toFixed(3) : "",
        source: point.source === "start" ? "Start" : "Reduced",
        code: point.code || ""
      };
    });
    const headers = [
      { key: "order", label: "No." },
      { key: "point", label: "Point" },
      ...(hasAngles ? [
        { key: "observed_angle", label: "Obs. Angle" },
        { key: "angle_mode", label: "Angle Mode" }
      ] : []),
      { key: "easting", label: "Easting" },
      { key: "northing", label: "Northing" },
      ...(adjustment ? [
        { key: "adjusted_easting", label: "Adj. Easting" },
        { key: "adjusted_northing", label: "Adj. Northing" },
        { key: "correction_easting", label: "Cum. Corr. E" },
        { key: "correction_northing", label: "Cum. Corr. N" }
      ] : []),
      { key: "source", label: "Source" },
      { key: "code", label: "Code" }
    ];
    renderTable(table, headers, rows);
  }

  function resetReductionState() {
    latestReductionResult = null;
    latestAdjustmentResult = null;
    setReductionSummary(null, null);
    renderReductionTable(null);
    $("adjust-reduction").disabled = true;
    $("use-reduction-for-parcel").disabled = true;
    $("use-adjusted-reduction-for-parcel").disabled = true;
    $("download-reduction-csv").disabled = true;
    refreshQualityControl();
  }

  async function readReductionText() {
    const file = $("reduction-file").files[0];
    if (file) {
      const text = await file.text();
      $("reduction-text").value = text;
      return text;
    }
    const pasted = $("reduction-text").value.trim();
    if (pasted) return pasted;
    throw new Error("Choose a bearing/distance file or paste observations first.");
  }

  async function readAngularText() {
    const file = $("angular-file").files[0];
    if (file) {
      const text = await file.text();
      $("angular-text").value = text;
      return text;
    }
    const pasted = $("angular-text").value.trim();
    if (pasted) return pasted;
    throw new Error("Choose an angular traverse file or paste angular observations first.");
  }

  function reductionPointsToMapPoints(result) {
    return result.points.map((point) => {
      const converted = ns.converter.gridToWgs(point.easting, point.northing, result.unit);
      return {
        id: point.id,
        lat: converted.lat,
        lon: converted.lon,
        label: `${point.id}: E ${point.easting.toFixed(3)}, N ${point.northing.toFixed(3)} ${result.unit_label}`,
        properties: {
          source: point.source === "start" || point.source === "adjusted_start"
            ? "reduction_start"
            : point.source === "adjusted" ? "bowditch_adjusted" : "bearing_distance_reduction",
          point: point.id,
          easting: point.easting.toFixed(3),
          northing: point.northing.toFixed(3),
          code: point.code || "",
          grid_unit: result.unit_label
        }
      };
    });
  }

  async function handleReduceObservations() {
    try {
      clearMessage();
      const unit = $("reduction-unit").value;
      const text = await readReductionText();
      const result = ns.survey.reduceBearingDistance({
        startId: $("reduction-start-id").value.trim() || "START",
        easting: $("reduction-start-easting").value,
        northing: $("reduction-start-northing").value,
        unit,
        text
      });

      latestReductionResult = result;
      latestAdjustmentResult = null;
      setReductionSummary(result, null);
      renderReductionTable(result, null);
      $("adjust-reduction").disabled = !result.closed_traverse;
      $("use-reduction-for-parcel").disabled = result.parcel_points.length < 3;
      $("use-adjusted-reduction-for-parcel").disabled = true;
      $("download-reduction-csv").disabled = false;

      const mapPoints = reductionPointsToMapPoints(result);
      setMappedPoints(mapPoints);
      ns.map.plotPoints(mapPoints, `${result.points.length} reduced point${result.points.length === 1 ? "" : "s"} plotted`);
      setReview({
        mode: "Bearing/Distance Reduction",
        count: result.points.length,
        unit: result.unit_label,
        status: result.close_error > 0.05 ? `Close ${result.close_error.toFixed(3)} ${result.unit_label}` : "OK"
      });
      refreshQualityControl();
      showMessage(`${result.lines.length} bearing/distance observation${result.lines.length === 1 ? "" : "s"} reduced.`, "info");
    } catch (error) {
      resetReductionState();
      showMessage(error.message, "error");
    }
  }

  async function handleReduceAngularObservations() {
    try {
      clearMessage();
      const unit = $("angular-unit").value;
      const text = await readAngularText();
      const result = ns.survey.reduceAngularTraverse({
        startId: $("angular-start-id").value.trim() || "START",
        easting: $("angular-start-easting").value,
        northing: $("angular-start-northing").value,
        unit,
        initialBearing: $("angular-initial-bearing").value,
        angleMode: $("angular-angle-mode").value,
        text
      });

      latestReductionResult = result;
      latestAdjustmentResult = null;
      setReductionSummary(result, null);
      renderReductionTable(result, null);
      $("adjust-reduction").disabled = !result.closed_traverse;
      $("use-reduction-for-parcel").disabled = result.parcel_points.length < 3;
      $("use-adjusted-reduction-for-parcel").disabled = true;
      $("download-reduction-csv").disabled = false;

      const mapPoints = reductionPointsToMapPoints(result);
      setMappedPoints(mapPoints);
      ns.map.plotPoints(mapPoints, `${result.points.length} angular traverse point${result.points.length === 1 ? "" : "s"} plotted`);
      setReview({
        mode: "Angular Traverse Reduction",
        count: result.points.length,
        unit: `${result.unit_label} / ${result.angle_mode_label}`,
        status: result.close_error > 0.05 ? `Close ${result.close_error.toFixed(3)} ${result.unit_label}` : "OK"
      });
      refreshQualityControl();
      showMessage(`${result.lines.length} angular observation${result.lines.length === 1 ? "" : "s"} reduced to bearings and coordinates.`, "info");
    } catch (error) {
      resetReductionState();
      showMessage(error.message, "error");
    }
  }

  function handleAdjustReduction() {
    try {
      clearMessage();
      if (!latestReductionResult) throw new Error("Reduce observations before applying Bowditch adjustment.");
      const adjustment = ns.survey.adjustCompassRule(latestReductionResult);
      latestAdjustmentResult = adjustment;
      setReductionSummary(latestReductionResult, adjustment);
      renderReductionTable(latestReductionResult, adjustment);
      $("use-adjusted-reduction-for-parcel").disabled = adjustment.parcel_points.length < 3;

      const mapPoints = reductionPointsToMapPoints(adjustment);
      setMappedPoints(mapPoints);
      ns.map.plotPoints(mapPoints, `${adjustment.points.length} adjusted point${adjustment.points.length === 1 ? "" : "s"} plotted`);
      setReview({
        mode: "Bowditch Adjustment",
        count: adjustment.points.length,
        unit: adjustment.unit_label,
        status: `Adjusted close ${adjustment.close_error_after.toFixed(6)} ${adjustment.unit_label}`
      });
      refreshQualityControl();
      showMessage("Bowditch adjustment applied.", "info");
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  function handleDownloadReductionCsv() {
    if (!latestReductionResult) {
      showMessage("Reduce observations before downloading the traverse CSV.", "error");
      return;
    }

    const csv = ns.survey.toTraverseCsv(latestReductionResult, latestAdjustmentResult);
    downloadTextFile("airban-traverse-adjustment.csv", csv, "text/csv;charset=utf-8", "\ufeff");
    showMessage(latestAdjustmentResult ? "Traverse adjustment CSV downloaded." : "Raw traverse CSV downloaded.", "info");
  }

  async function handleUseReductionForParcel() {
    if (!latestReductionResult || latestReductionResult.parcel_points.length < 3) {
      showMessage("Reduce at least three parcel points before using them as parcel beacons.", "error");
      return;
    }

    $("parcel-unit").value = latestReductionResult.unit;
    $("parcel-file").value = "";
    $("parcel-coordinates").value = ns.survey.toParcelCsv(latestReductionResult);
    setParcelSource(parcelSource(
      "raw_traverse_reduction",
      "Raw traverse reduction",
      `${latestReductionResult.parcel_points.length} parcel point${latestReductionResult.parcel_points.length === 1 ? "" : "s"} from reduced traverse; close ${latestReductionResult.close_error.toFixed(6)} ${latestReductionResult.unit_label}; precision ${precisionText(latestReductionResult.precision)}.`
    ));
    await handleParcelCompute();
    showMessage("Reduced observation points loaded and computed as parcel beacons.", "info");
  }

  async function handleUseAdjustedReductionForParcel() {
    if (!latestAdjustmentResult || latestAdjustmentResult.parcel_points.length < 3) {
      showMessage("Apply Bowditch adjustment before using adjusted parcel beacons.", "error");
      return;
    }

    $("parcel-unit").value = latestAdjustmentResult.unit;
    $("parcel-file").value = "";
    $("parcel-coordinates").value = ns.survey.toParcelCsv(latestAdjustmentResult);
    setParcelSource(parcelSource(
      "adjusted_traverse_reduction",
      "Bowditch adjusted traverse",
      `${latestAdjustmentResult.parcel_points.length} parcel point${latestAdjustmentResult.parcel_points.length === 1 ? "" : "s"} from ${latestAdjustmentResult.method}; adjusted close ${latestAdjustmentResult.close_error_after.toFixed(6)} ${latestAdjustmentResult.unit_label}.`
    ));
    await handleParcelCompute();
    showMessage("Adjusted traverse points loaded and computed as parcel beacons.", "info");
  }

  function handleSampleReduction() {
    $("reduction-start-id").value = "P01";
    $("reduction-start-easting").value = "833356.39";
    $("reduction-start-northing").value = "180404.48";
    $("reduction-unit").value = "gold_coast_foot";
    $("reduction-file").value = "";
    $("reduction-text").value = [
      "to,bearing,distance,code",
      "P02,\"321 deg 10' 25\\\"\",62.268,BEACON",
      "P03,\"044 deg 35' 23\\\"\",91.834,BEACON",
      "P04,\"135 deg 07' 31\\\"\",80.900,BEACON",
      "P01,\"235 deg 33' 37\\\"\",100.046,CLOSE"
    ].join("\n");
    handleReduceObservations().then(() => handleAdjustReduction());
  }

  function handleSampleAngular() {
    $("angular-start-id").value = "P01";
    $("angular-start-easting").value = "833356.39";
    $("angular-start-northing").value = "180404.48";
    $("angular-unit").value = "gold_coast_foot";
    $("angular-initial-bearing").value = "321 deg 10' 25\"";
    $("angular-angle-mode").value = "deflection_right";
    $("angular-file").value = "";
    $("angular-text").value = [
      "to,angle,distance,code",
      "P02,,62.268,BEACON",
      "P03,\"083 deg 24' 58\\\"\",91.834,BEACON",
      "P04,\"090 deg 32' 08\\\"\",80.900,BEACON",
      "P01,\"100 deg 26' 06\\\"\",100.046,CLOSE"
    ].join("\n");
    handleReduceAngularObservations().then(() => handleAdjustReduction());
  }

  function activateParcelOutput(kind) {
    const requestedKind = document.querySelector(`[data-parcel-output="${kind}"]`) ? kind : "plan";
    activeParcelOutput = requestedKind;
    document.querySelectorAll("[data-parcel-output]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.parcelOutput === requestedKind);
    });
    renderParcelOutput(latestParcelResult);
  }

  function renderTable(table, headers, rows) {
    table.innerHTML = `
      <thead><tr>${headers.map((header) => `<th>${ns.utils.escapeHtml(header.label)}</th>`).join("")}</tr></thead>
      <tbody>
        ${rows.map((item) => `<tr>${headers.map((header) => `<td>${ns.utils.escapeHtml(item[header.key])}</td>`).join("")}</tr>`).join("")}
      </tbody>
    `;
  }

  function parcelExportRows(kind, result) {
    if (kind === "beacon") return ns.parcel.toComputationBeaconRows(result);
    if (kind === "schedule") {
      return ns.parcel.toComputationCourseRows(result).map((item) => ({
        ...item,
        delta_easting: item.dx,
        delta_northing: item.dy
      }));
    }
    if (kind === "geometry") return ns.parcel.toGeometryReviewRows(result);

    if (kind === "area") {
      const area = ns.parcel.toAreaComputationRows(result);
      return [
        ...area.rows,
        {
          station: "SUM",
          x: "",
          y: "",
          y_times_delta_x: area.summary.sum_forward.toFixed(3),
          x_times_delta_y: area.summary.sum_backward.toFixed(3),
          unit: area.summary.area_unit
        },
        {
          station: "DOUBLE AREA",
          x: "",
          y: "",
          y_times_delta_x: area.summary.double_area.toFixed(3),
          x_times_delta_y: "",
          unit: area.summary.area_unit
        },
        {
          station: "AREA",
          x: "",
          y: "",
          y_times_delta_x: area.summary.area.toFixed(3),
          x_times_delta_y: "",
          unit: area.summary.area_unit
        },
        {
          station: "AREA",
          x: "",
          y: "",
          y_times_delta_x: area.summary.area_acres.toFixed(4),
          x_times_delta_y: "",
          unit: "acres"
        },
        {
          station: "AREA",
          x: "",
          y: "",
          y_times_delta_x: area.summary.area_hectares.toFixed(4),
          x_times_delta_y: "",
          unit: "hectares"
        }
      ];
    }

    if (kind === "audit") {
      const audit = ns.parcel.toCalculationAuditRows(result);
      const area = ns.parcel.toAreaComputationRows(result);
      const signedDoubleArea = area.summary.sum_forward - area.summary.sum_backward;
      return [
        ...audit,
        {
          course_no: "SUM",
          from: "",
          to: "",
          start_easting: "",
          start_northing: "",
          end_easting: "",
          end_northing: "",
          delta_easting: "",
          delta_northing: "",
          bearing: "",
          distance: "",
          distance_unit: "",
          y_times_delta_x: area.summary.sum_forward.toFixed(3),
          x_times_delta_y: area.summary.sum_backward.toFixed(3),
          signed_double_area_part: signedDoubleArea.toFixed(3),
          signed_area_part: (signedDoubleArea / 2).toFixed(3),
          area_unit: area.summary.area_unit
        },
        {
          course_no: "AREA",
          from: "",
          to: "",
          start_easting: "",
          start_northing: "",
          end_easting: "",
          end_northing: "",
          delta_easting: "",
          delta_northing: "",
          bearing: "",
          distance: result.area_acres.toFixed(4),
          distance_unit: "acres",
          y_times_delta_x: "",
          x_times_delta_y: "",
          signed_double_area_part: "",
          signed_area_part: result.area_hectares.toFixed(4),
          area_unit: "hectares"
        }
      ];
    }

    return ns.parcel.toComputationPlanRows(result);
  }

  function renderParcelOutput(result) {
    const table = $("parcel-output-table");
    if (!result || !result.lines.length) {
      table.innerHTML = "<thead><tr><th>Parcel outputs appear here</th></tr></thead><tbody><tr><td>No parcel computed yet.</td></tr></tbody>";
      return;
    }

    if (activeParcelOutput === "beacon") {
      renderTable(table, [
        { key: "beacon", label: "Beacon" },
        { key: "x", label: "X" },
        { key: "y", label: "Y" },
        { key: "unit", label: "Unit" },
        { key: "is_reference", label: "Reference" }
      ], parcelExportRows("beacon", result));
      return;
    }

    if (activeParcelOutput === "schedule") {
      renderTable(table, [
        { key: "course_no", label: "No." },
        { key: "from", label: "From" },
        { key: "to", label: "To" },
        { key: "bearing", label: "Bearing" },
        { key: "distance", label: "Distance" },
        { key: "distance_unit", label: "Unit" },
        { key: "dx", label: "DX" },
        { key: "dy", label: "DY" }
      ], parcelExportRows("schedule", result));
      return;
    }

    if (activeParcelOutput === "area") {
      renderTable(table, [
        { key: "station", label: "Station" },
        { key: "x", label: "X" },
        { key: "y", label: "Y" },
        { key: "y_times_delta_x", label: "Y(I)*(X(I+1)-X(I))" },
        { key: "x_times_delta_y", label: "X(I)*(Y(I+1)-Y(I))" },
        { key: "unit", label: "Unit" }
      ], parcelExportRows("area", result));
      return;
    }

    if (activeParcelOutput === "geometry") {
      renderTable(table, [
        { key: "item", label: "Item" },
        { key: "value", label: "Value" },
        { key: "unit", label: "Unit" },
        { key: "note", label: "Note" }
      ], parcelExportRows("geometry", result));
      return;
    }

    if (activeParcelOutput === "audit") {
      renderTable(table, [
        { key: "course_no", label: "No." },
        { key: "from", label: "From" },
        { key: "to", label: "To" },
        { key: "start_easting", label: "Start E" },
        { key: "start_northing", label: "Start N" },
        { key: "end_easting", label: "End E" },
        { key: "end_northing", label: "End N" },
        { key: "delta_easting", label: "dE" },
        { key: "delta_northing", label: "dN" },
        { key: "bearing", label: "Bearing" },
        { key: "distance", label: "Distance" },
        { key: "distance_unit", label: "Unit" },
        { key: "remarks", label: "Remarks" },
        { key: "y_times_delta_x", label: "Y*dX" },
        { key: "x_times_delta_y", label: "X*dY" },
        { key: "signed_double_area_part", label: "Signed 2A part" },
        { key: "signed_area_part", label: "Signed A part" },
        { key: "area_unit", label: "Area unit" }
      ], parcelExportRows("audit", result));
      return;
    }

    renderTable(table, [
      { key: "from", label: "From" },
      { key: "to", label: "To" },
      { key: "bearing_deg", label: "Deg" },
      { key: "bearing_min", label: "Min" },
      { key: "distance", label: "Distance" },
      { key: "distance_unit", label: "Unit" }
    ], parcelExportRows("plan", result));
  }

  function setParcelSummary(result) {
    $("parcel-point-count").textContent = result ? String(result.points.length) : "-";
    $("parcel-perimeter").textContent = result ? `${result.perimeter.toFixed(3)} ${result.unit_label}` : "-";
    $("parcel-acreage").textContent = result ? result.area_acres.toFixed(4) : "-";
    $("parcel-hectares").textContent = result ? result.area_hectares.toFixed(4) : "-";
    $("parcel-source").textContent = result ? latestParcelSource.label : "Manual / pasted coordinates";
    $("parcel-input-count").textContent = result ? String(result.input_point_count || result.points.length) : "-";
    $("parcel-reference-count").textContent = result ? String(result.reference_point_count || 0) : "-";
    $("parcel-row-mode").textContent = result ? result.reference_row_mode_label : "Auto-detect CORS/reference rows";
  }

  function renderQualityControl(result) {
    const summary = $("qc-summary");
    const table = $("qc-table");

    if (!result) {
      summary.className = "qc-banner";
      summary.textContent = "Compute a parcel to run workstation quality checks.";
      table.innerHTML = "<thead><tr><th>Quality checks appear here</th></tr></thead><tbody><tr><td>No parcel computed yet.</td></tr></tbody>";
      return;
    }

    const counts = result.counts;
    summary.className = `qc-banner is-${result.status}`;
    summary.textContent = `${result.summary}. ${counts.errors} error${counts.errors === 1 ? "" : "s"}, ${counts.warnings} warning${counts.warnings === 1 ? "" : "s"}, ${counts.ok} OK.`;
    renderTable(table, [
      { key: "no", label: "No." },
      { key: "category", label: "Category" },
      { key: "check", label: "Check" },
      { key: "status", label: "Status" },
      { key: "detail", label: "Detail" }
    ], ns.qc.toRows(result));
  }

  function resetParcelState() {
    latestParcelResult = null;
    latestQcResult = null;
    latestHistoryText = "";
    setParcelSource(parcelSource("manual", "Manual / pasted coordinates", "Parcel coordinates were entered directly or loaded from a parcel CSV."));
    setParcelSummary(null);
    renderQualityControl(null);
    renderParcelOutput(null);
    $("history-preview").textContent = "History of Survey draft appears here.";
    $("download-parcel-csv").disabled = true;
    $("download-kml").disabled = true;
    $("download-kmz").disabled = true;
    $("download-dxf").disabled = true;
    $("download-computation-sheet").disabled = true;
    $("download-workbook").disabled = true;
    $("download-report").disabled = true;
    $("download-manifest").disabled = true;
    $("copy-history").disabled = true;
    $("download-history-doc").disabled = true;
  }

  function refreshHistoryPreview() {
    latestHistoryText = ns.parcel.historyText(parcelDetails(), latestParcelResult);
    $("history-preview").textContent = latestHistoryText;
    $("copy-history").disabled = !latestHistoryText.trim();
    $("download-history-doc").disabled = !latestHistoryText.trim();
  }

  function refreshQualityControl() {
    if (!latestParcelResult) {
      latestQcResult = null;
      renderQualityControl(null);
      return null;
    }

    latestQcResult = ns.qc.evaluate(parcelDetails(), latestParcelResult, {
      reduction: latestReductionResult,
      adjustment: latestAdjustmentResult
    });
    renderQualityControl(latestQcResult);
    return latestQcResult;
  }

  function parcelPointsToMapPoints(result) {
    return result.points.map((point) => {
      const converted = ns.converter.gridToWgs(point.easting, point.northing, result.unit);
      return {
        id: point.id,
        lat: converted.lat,
        lon: converted.lon,
        label: `${point.id}: E ${point.easting.toFixed(3)}, N ${point.northing.toFixed(3)} ${result.unit_label}`,
        properties: {
          source: "parcel_workstation",
          beacon: point.id,
          easting: point.easting.toFixed(3),
          northing: point.northing.toFixed(3),
          grid_unit: result.unit_label
        }
      };
    });
  }

  function currentMapIsParcel() {
    return Boolean(latestParcelResult)
      && mappedPoints.length === latestParcelResult.points.length
      && mappedPoints.every((point) => point.properties && point.properties.source === "parcel_workstation");
  }

  async function readParcelText() {
    const file = $("parcel-file").files[0];
    if (file) {
      const text = await file.text();
      $("parcel-coordinates").value = text;
      return text;
    }
    const pasted = $("parcel-coordinates").value.trim();
    if (pasted) return pasted;
    throw new Error("Enter parcel coordinate rows or choose a parcel CSV file first.");
  }

  async function handleParcelCompute() {
    try {
      clearMessage();
      const unit = $("parcel-unit").value;
      const text = await readParcelText();
      const points = ns.parcel.parsePoints(text, unit);
      const result = ns.parcel.compute(points, unit, {
        referenceRowMode: $("reference-row-mode").value
      });
      const mapPoints = parcelPointsToMapPoints(result);

      latestParcelResult = result;
      setParcelSummary(result);
      renderParcelOutput(result);
      refreshHistoryPreview();
      refreshQualityControl();
      $("download-parcel-csv").disabled = false;
      $("download-kml").disabled = false;
      $("download-kmz").disabled = false;
      $("download-dxf").disabled = false;
      $("download-computation-sheet").disabled = false;
      $("download-workbook").disabled = false;
      $("download-report").disabled = false;
      $("download-manifest").disabled = false;
      $("copy-history").disabled = false;
      setMappedPoints(mapPoints);
      ns.map.plotParcel(mapPoints, `${result.points.length} parcel beacons, ${result.area_acres.toFixed(4)} acres`);
      setReview({
        mode: "Parcel Workstation",
        count: result.points.length,
        unit: result.unit_label,
        status: "OK"
      });
      const notices = ["Parcel computation complete."];
      if (result.reference_point_count) {
        notices.push(`${result.reference_point_count} reference row${result.reference_point_count === 1 ? "" : "s"} excluded from area/perimeter computation.`);
      }
      if (result.closing_point_removed) {
        notices.push("Repeated closing row was excluded from computation.");
      }
      showMessage(notices.join(" "), "info");
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  function handleSampleParcel() {
    $("project-name").value = "Akatichua Parcel Survey";
    $("parcel-locality").value = "Akatichua";
    $("parcel-district").value = "Mfantsiman Municipal";
    $("parcel-client").value = "Sample Client";
    $("parcel-regional-number").value = "SGC. N612/21";
    $("parcel-cors-id").value = "CORS-CC01";
    $("survey-date").value = "2026-08-12";
    $("issue-date").value = "";
    $("prepared-by").value = "Airban Engineering Surveyor";
    $("checked-by").value = "";
    $("report-revision").value = "";
    $("report-status").value = "";
    $("project-notes").value = "Sample workstation project generated for beta testing.";
    $("parcel-unit").value = "gold_coast_foot";
    $("reference-row-mode").value = "auto";
    $("parcel-boundary").value = "the width road given in the diagram of survey with reference to the cardinal north";
    $("history-purpose").value = "prepare a cadastral site plan";
    $("history-acreage").value = "";
    $("history-hectares").value = "";
    $("history-override").value = "";
    $("parcel-file").value = "";
    $("parcel-coordinates").value = [
      "id,easting,northing,remarks,computation_sheet_no,description_no,page,beacon_remarks",
      "P01,833356.39,180404.48,Adjoining access road,CS-01,D-01,1,Existing pillar",
      "P02,833317.35,180452.99,Adjoining family land,CS-01,D-02,1,Concrete beacon",
      "P03,833381.82,180518.39,Adjoining developed plot,CS-01,D-03,1,Iron pin",
      "P04,833438.90,180461.06,Adjoining reserve land,CS-01,D-04,1,New pillar"
    ].join("\n");
    setParcelSource(parcelSource("sample", "Sample parcel coordinates", "Built-in Akatichua sample parcel beacons."));
    handleParcelCompute();
  }

  function handleDownloadParcelCsv() {
    if (!latestParcelResult) {
      showMessage("Compute a parcel before downloading CSV output.", "error");
      return;
    }

    const filenames = {
      plan: "airban-plan-data.csv",
      schedule: "airban-bearing-distance-schedule.csv",
      beacon: "airban-beacon-index.csv",
      geometry: "airban-geometry-review.csv",
      area: "airban-area-computation.csv",
      audit: "airban-calculation-audit.csv"
    };
    const rows = parcelExportRows(activeParcelOutput, latestParcelResult);
    downloadTextFile(filenames[activeParcelOutput] || filenames.plan, ns.csv.rowsToCsv(rows), "text/csv;charset=utf-8", "\ufeff");
  }

  function handleDownloadWorkbook() {
    if (!latestParcelResult) {
      showMessage("Compute a parcel before downloading the workbook.", "error");
      return;
    }

    try {
      refreshHistoryPreview();
      const qc = refreshQualityControl();
      const generatedAt = new Date().toISOString();
      const xml = ns.report.buildSurveyWorkbookXml(parcelDetails(), latestParcelResult, {
        generatedAt,
        reduction: latestReductionResult,
        adjustment: latestAdjustmentResult,
        qc,
        observationImport: latestObservationImport,
        parcelSource: latestParcelSource
      });
      downloadTextFile("airban-survey-workbook.xls", xml, "application/vnd.ms-excel;charset=utf-8", "\ufeff");
      showMessage("Survey workbook downloaded.", "info");
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  function handleDownloadComputationSheet() {
    if (!latestParcelResult) {
      showMessage("Compute a parcel before downloading the computation sheet.", "error");
      return;
    }

    try {
      refreshHistoryPreview();
      const details = parcelDetails();
      const xml = ns.report.buildComputationSheetXml(details, latestParcelResult, {
        generatedAt: new Date().toISOString(),
        parcelSource: latestParcelSource
      });
      const filename = `${ns.project.slugify(details.projectName || details.locality || "airban-computation-sheet")}-computation-sheet.xls`;
      downloadTextFile(filename, xml, "application/vnd.ms-excel;charset=utf-8", "\ufeff");
      showMessage("Computation sheet downloaded.", "info");
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  function handleDownloadDxf() {
    if (!latestParcelResult) {
      showMessage("Compute a parcel before downloading DXF.", "error");
      return;
    }

    try {
      refreshHistoryPreview();
      const generatedAt = new Date().toISOString();
      const details = parcelDetails();
      const dxf = ns.parcel.toDxf(latestParcelResult, {
        details,
        parcelSource: latestParcelSource,
        generatedAt
      });
      const filename = `${ns.project.slugify(details.projectName || details.locality || "airban-parcel-plan")}.dxf`;
      downloadTextFile(filename, dxf, "application/dxf;charset=utf-8");
      showMessage("Parcel DXF downloaded.", "info");
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  function handleDownloadKml() {
    if (!latestParcelResult) {
      showMessage("Compute a parcel before downloading KML.", "error");
      return;
    }

    try {
      refreshHistoryPreview();
      const generatedAt = new Date().toISOString();
      const details = parcelDetails();
      const kml = ns.parcel.toKml(latestParcelResult, {
        details,
        parcelSource: latestParcelSource,
        generatedAt
      });
      const filename = `${ns.project.slugify(details.projectName || details.locality || "airban-parcel-map")}.kml`;
      downloadTextFile(filename, kml, "application/vnd.google-earth.kml+xml;charset=utf-8");
      showMessage("Parcel KML downloaded.", "info");
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  function handleDownloadKmz() {
    if (!latestParcelResult) {
      showMessage("Compute a parcel before downloading KMZ.", "error");
      return;
    }

    try {
      refreshHistoryPreview();
      const generatedAt = new Date().toISOString();
      const details = parcelDetails();
      const kmz = ns.parcel.toKmz(latestParcelResult, {
        details,
        parcelSource: latestParcelSource,
        generatedAt
      });
      const filename = `${ns.project.slugify(details.projectName || details.locality || "airban-parcel-map")}.kmz`;
      downloadBinaryFile(filename, kmz, "application/vnd.google-earth.kmz");
      showMessage("Parcel KMZ downloaded.", "info");
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  function handleDownloadReport() {
    if (!latestParcelResult) {
      showMessage("Compute a parcel before downloading the report.", "error");
      return;
    }

    try {
      refreshHistoryPreview();
      const qc = refreshQualityControl();
      const generatedAt = new Date().toISOString();
      const logoUrl = new URL("src/assets/airban-full-logo.jpg", document.baseURI).href;
      const html = ns.report.buildSurveyReportHtml(parcelDetails(), latestParcelResult, {
        logoUrl,
        generatedAt,
        reduction: latestReductionResult,
        adjustment: latestAdjustmentResult,
        qc,
        observationImport: latestObservationImport,
        parcelSource: latestParcelSource
      });
      downloadTextFile("airban-survey-report.html", html, "text/html;charset=utf-8");
      showMessage("Survey report downloaded.", "info");
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  function handleDownloadManifest() {
    if (!latestParcelResult) {
      showMessage("Compute a parcel before downloading the package manifest.", "error");
      return;
    }

    try {
      refreshHistoryPreview();
      const qc = refreshQualityControl();
      const generatedAt = new Date().toISOString();
      const details = parcelDetails();
      const manifest = ns.report.buildSurveyPackageManifest(details, latestParcelResult, {
        generatedAt,
        reduction: latestReductionResult,
        adjustment: latestAdjustmentResult,
        qc,
        observationImport: latestObservationImport,
        parcelSource: latestParcelSource
      });
      const filename = `${ns.project.slugify(details.projectName || details.locality || "airban-survey-package")}-manifest.md`;
      downloadTextFile(filename, manifest, "text/markdown;charset=utf-8", "\ufeff");
      showMessage("Survey package manifest downloaded.", "info");
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  async function handleCopyHistory() {
    refreshHistoryPreview();
    if (!latestHistoryText.trim()) {
      showMessage("Enter History of Survey details before copying.", "error");
      return;
    }

    try {
      await copyText(latestHistoryText);
      showMessage("History of Survey copied.", "info");
    } catch (error) {
      showMessage("Could not copy history in this browser.", "error");
    }
  }

  function handleDownloadHistoryDoc() {
    refreshHistoryPreview();
    if (!latestHistoryText.trim()) {
      showMessage("Enter History of Survey details before exporting.", "error");
      return;
    }

    try {
      const details = parcelDetails();
      const generatedAt = new Date().toISOString();
      const html = ns.report.buildHistoryWordDocumentHtml(details, latestParcelResult, { generatedAt });
      const filename = `${ns.project.slugify(details.projectName || details.locality || "history-of-survey")}-history-of-survey.doc`;
      downloadTextFile(filename, html, "application/msword;charset=utf-8", "\ufeff");
      showMessage("History of Survey Word document downloaded.", "info");
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  async function handleCsvConvert() {
    try {
      clearMessage();
      const file = $("csv-file").files[0];
      if (!file) throw new Error("Choose a CSV file first.");
      convertedCsv = [];
      $("download-csv").disabled = true;
      setMappedPoints([]);
      const mode = $("csv-mode").value;
      const unit = $("csv-unit").value;
      const csvUtmZone = $("csv-utm-zone").value;
      const csvUtmOutputUnit = $("csv-utm-output-unit").value;
      const text = await file.text();
      const parsed = ns.csv.parse(text, mode);
      const pointsToPlot = [];
      let outsideGhanaCount = 0;

      convertedCsv = parsed.rows.map((row, index) => {
        const sourceRow = parsed.hasHeader ? index + 2 : index + 1;
        const pointId = ns.csv.getColumn(row, ["id", "point", "pointid", "name"]) || `Row ${sourceRow}`;

        if (mode === "grid_to_wgs") {
          const easting = ns.utils.parseNumber(ns.csv.getColumn(row, ["easting", "eastings", "east", "x"]), `Row ${sourceRow} easting`);
          const northing = ns.utils.parseNumber(ns.csv.getColumn(row, ["northing", "northings", "north", "y"]), `Row ${sourceRow} northing`);
          const { lat, lon } = ns.converter.gridToWgs(easting, northing, unit);
          const utm = ns.converter.wgsToUtm(lat, lon, csvUtmZone);
          const reviewStatus = ns.utils.inGhanaBounds(lat, lon) ? "OK" : "Outside Ghana rough bounds";
          if (reviewStatus !== "OK") outsideGhanaCount += 1;
          const outputRow = {
            ...row,
            latitude: lat.toFixed(8),
            longitude: lon.toFixed(8),
            latitude_dms: ns.dms.decimalToDms(lat, "lat"),
            longitude_dms: ns.dms.decimalToDms(lon, "lon"),
            ghana_grid_input_unit: ns.units.label(unit),
            ...utmCsvColumns(utm, csvUtmOutputUnit),
            review_status: reviewStatus
          };
          pointsToPlot.push({
            id: String(pointId),
            lat,
            lon,
            label: `${pointId}: ${lat.toFixed(6)}, ${lon.toFixed(6)}`,
            properties: outputRow
          });
          return outputRow;
        }

        if (mode === "grid_to_utm") {
          const easting = ns.utils.parseNumber(ns.csv.getColumn(row, ["easting", "eastings", "east", "x"]), `Row ${sourceRow} easting`);
          const northing = ns.utils.parseNumber(ns.csv.getColumn(row, ["northing", "northings", "north", "y"]), `Row ${sourceRow} northing`);
          const { lat, lon } = ns.converter.gridToWgs(easting, northing, unit);
          const utm = ns.converter.wgsToUtm(lat, lon, csvUtmZone);
          const reviewStatus = ns.utils.inGhanaBounds(lat, lon) ? "OK" : "Outside Ghana rough bounds";
          if (reviewStatus !== "OK") outsideGhanaCount += 1;
          const outputRow = {
            ...row,
            latitude: lat.toFixed(8),
            longitude: lon.toFixed(8),
            latitude_dms: ns.dms.decimalToDms(lat, "lat"),
            longitude_dms: ns.dms.decimalToDms(lon, "lon"),
            ghana_grid_input_unit: ns.units.label(unit),
            ...utmCsvColumns(utm, csvUtmOutputUnit),
            review_status: reviewStatus
          };
          pointsToPlot.push({
            id: String(pointId),
            lat,
            lon,
            label: `${pointId}: UTM ${utm.zone} E ${utm.easting.toFixed(3)}, N ${utm.northing.toFixed(3)}`,
            properties: outputRow
          });
          return outputRow;
        }

        if (mode === "utm_to_grid") {
          const utmEasting = ns.utils.parseNumber(ns.csv.getColumn(row, ["utm_easting", "utmeasting", "easting", "eastings", "east", "x"]), `Row ${sourceRow} UTM easting`);
          const utmNorthing = ns.utils.parseNumber(ns.csv.getColumn(row, ["utm_northing", "utmnorthing", "northing", "northings", "north", "y"]), `Row ${sourceRow} UTM northing`);
          const zone = getCsvUtmZone(row, csvUtmZone, sourceRow, false);
          const result = ns.converter.utmToGrid(utmEasting, utmNorthing, zone, unit);
          const reviewStatus = ns.utils.inGhanaBounds(result.lat, result.lon) ? "OK" : "Outside Ghana rough bounds";
          if (reviewStatus !== "OK") outsideGhanaCount += 1;
          const outputRow = {
            ...row,
            latitude: result.lat.toFixed(8),
            longitude: result.lon.toFixed(8),
            latitude_dms: ns.dms.decimalToDms(result.lat, "lat"),
            longitude_dms: ns.dms.decimalToDms(result.lon, "lon"),
            ...gridCsvColumns(result.easting, result.northing, unit),
            ...utmCsvColumns({ easting: utmEasting, northing: utmNorthing, zone, crs: result.crs }, csvUtmOutputUnit),
            review_status: reviewStatus
          };
          pointsToPlot.push({
            id: String(pointId),
            lat: result.lat,
            lon: result.lon,
            label: `${pointId}: Grid E ${result.easting.toFixed(3)}, N ${result.northing.toFixed(3)}`,
            properties: outputRow
          });
          return outputRow;
        }

        const lat = ns.utils.parseNumber(ns.csv.getColumn(row, ["latitude", "lat", "y"]), `Row ${sourceRow} latitude`);
        const lon = ns.utils.parseNumber(ns.csv.getColumn(row, ["longitude", "lon", "lng", "x"]), `Row ${sourceRow} longitude`);
        if (lat < -90 || lat > 90) throw new Error(`Row ${sourceRow} latitude must be between -90 and 90.`);
        if (lon < -180 || lon > 180) throw new Error(`Row ${sourceRow} longitude must be between -180 and 180.`);
        const { easting, northing } = ns.converter.wgsToGrid(lat, lon, unit);
        const utm = ns.converter.wgsToUtm(lat, lon, csvUtmZone);
        const reviewStatus = ns.utils.inGhanaBounds(lat, lon) ? "OK" : "Outside Ghana rough bounds";
        if (reviewStatus !== "OK") outsideGhanaCount += 1;
        const outputRow = {
          ...row,
          ...gridCsvColumns(easting, northing, unit),
          ...utmCsvColumns(utm, csvUtmOutputUnit),
          review_status: reviewStatus
        };
        pointsToPlot.push({
          id: String(pointId),
          lat,
          lon,
          label: `${pointId}: ${lat.toFixed(6)}, ${lon.toFixed(6)}`,
          properties: outputRow
        });
        return outputRow;
      });

      renderCsvTable(convertedCsv);
      $("download-csv").disabled = false;
      setMappedPoints(pointsToPlot);
      ns.map.plotPoints(pointsToPlot);
      setReview({
        mode: {
          grid_to_wgs: "CSV Grid to WGS84",
          wgs_to_grid: "CSV WGS84 to Grid",
          utm_to_grid: "CSV UTM to Grid",
          grid_to_utm: "CSV Grid to UTM"
        }[mode] || "CSV conversion",
        count: convertedCsv.length,
        unit: `${ns.units.label(unit)} / UTM ${ns.units.metricLabel(csvUtmOutputUnit)}`,
        status: outsideGhanaCount ? `${outsideGhanaCount} outside rough Ghana bounds` : "OK"
      });
      showMessage(`${convertedCsv.length} CSV row${convertedCsv.length === 1 ? "" : "s"} converted and plotted.`, "info");
    } catch (error) {
      showMessage(error.message, "error");
    }
  }

  function handleDownloadCsv() {
    const csv = ns.csv.rowsToCsv(convertedCsv);
    downloadTextFile("airban-coordinate-conversions.csv", csv, "text/csv;charset=utf-8", "\ufeff");
  }

  async function handleCopyResults() {
    if (!latestResult || !Number.isFinite(latestResult.lat) || !Number.isFinite(latestResult.lon)) return;
    const lines = [
      `Airban Converter v${ns.constants.appVersion}`,
      `Latitude: ${latestResult.lat.toFixed(8)}`,
      `Longitude: ${latestResult.lon.toFixed(8)}`,
      `DMS: ${ns.dms.decimalToDms(latestResult.lat, "lat")}, ${ns.dms.decimalToDms(latestResult.lon, "lon")}`
    ];

    if (Number.isFinite(latestResult.easting) && Number.isFinite(latestResult.northing)) {
      lines.push(`Ghana Grid: ${formatGrid(latestResult.easting, latestResult.northing, latestResult.unit, currentGridResultUnit())}`);
    }
    if (latestResult.utm) {
      lines.push(`WGS84 UTM: ${formatUtm(latestResult.utm, currentUtmResultUnit())}`);
    }

    try {
      await copyText(lines.join("\n"));
      showMessage("Results copied.", "info");
    } catch (error) {
      showMessage("Could not copy results in this browser.", "error");
    }
  }

  function handleDownloadGeoJson() {
    if (!mappedPoints.length) {
      showMessage("Convert a point or CSV batch before exporting GeoJSON.", "error");
      return;
    }

    if (currentMapIsParcel()) {
      const generatedAt = new Date().toISOString();
      const details = parcelDetails();
      const featureCollection = ns.parcel.toGeoJson(latestParcelResult, {
        details,
        parcelSource: latestParcelSource,
        generatedAt
      });
      const filename = `${ns.project.slugify(details.projectName || details.locality || "airban-parcel")}-geometry.geojson`;
      downloadTextFile(
        filename,
        JSON.stringify(featureCollection, null, 2),
        "application/geo+json;charset=utf-8"
      );
      showMessage("Parcel geometry GeoJSON downloaded.", "info");
      return;
    }

    const featureCollection = {
      type: "FeatureCollection",
      name: "Airban Converter points",
      metadata: {
        app: "Airban Converter",
        version: ns.constants.appVersion,
        transform: ns.constants.transformLabel,
        generated_at: new Date().toISOString()
      },
      features: mappedPoints.map((point) => {
        const grid = ns.converter.wgsToGrid(point.lat, point.lon, currentGridResultUnit());
        const source = point.properties && point.properties.source;
        const useSingleZone = source === "single_grid_to_wgs84"
          || source === "single_wgs84_to_grid"
          || source === "single_utm_to_grid"
          || source === "dms_to_decimal";
        const utmZone = useSingleZone ? currentSingleUtmZone() : (point.properties && point.properties.utm_zone) || "auto";
        const utm = ns.converter.wgsToUtm(point.lat, point.lon, utmZone);
        return {
          type: "Feature",
          properties: {
            id: point.id || "",
            label: point.label || "",
            ...(point.properties || {}),
            ...gridCsvColumns(grid.easting, grid.northing, currentGridResultUnit()),
            ...utmCsvColumns(utm, currentUtmResultUnit())
          },
          geometry: {
            type: "Point",
            coordinates: [Number(point.lon), Number(point.lat)]
          }
        };
      })
    };

    downloadTextFile(
      "airban-converter-points.geojson",
      JSON.stringify(featureCollection, null, 2),
      "application/geo+json;charset=utf-8"
    );
    showMessage("Point GeoJSON downloaded.", "info");
  }

  function openAbout() {
    $("about-modal").hidden = false;
    document.body.classList.add("modal-open");
  }

  function closeAbout() {
    $("about-modal").hidden = true;
    document.body.classList.remove("modal-open");
  }

  function activateTab(tabId) {
    document.querySelectorAll(".tab-button").forEach((button) => {
      const isActive = button.dataset.tab === tabId;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });
    document.querySelectorAll(".tab-panel").forEach((panel) => {
      panel.classList.toggle("is-active", panel.id === tabId);
    });
  }

  function bindEvents() {
    document.querySelectorAll(".tab-button").forEach((button) => {
      button.addEventListener("click", () => activateTab(button.dataset.tab));
    });

    $("convert-grid").addEventListener("click", handleGridConvert);
    $("convert-wgs").addEventListener("click", handleWgsConvert);
    $("convert-utm").addEventListener("click", handleUtmConvert);
    $("convert-dms").addEventListener("click", handleDmsConvert);
    $("export-project").addEventListener("click", handleExportProject);
    $("import-project").addEventListener("click", handleImportProject);
    $("save-browser-draft").addEventListener("click", handleSaveBrowserDraft);
    $("restore-browser-draft").addEventListener("click", handleRestoreBrowserDraft);
    $("clear-browser-draft").addEventListener("click", handleClearBrowserDraft);
    $("import-observations").addEventListener("click", handleImportObservations);
    $("sample-observations").addEventListener("click", handleSampleObservations);
    $("use-observations-for-parcel").addEventListener("click", handleUseObservationsForParcel);
    $("reduce-observations").addEventListener("click", handleReduceObservations);
    $("adjust-reduction").addEventListener("click", handleAdjustReduction);
    $("sample-reduction").addEventListener("click", handleSampleReduction);
    $("reduce-angular-observations").addEventListener("click", handleReduceAngularObservations);
    $("sample-angular").addEventListener("click", handleSampleAngular);
    $("use-reduction-for-parcel").addEventListener("click", handleUseReductionForParcel);
    $("use-adjusted-reduction-for-parcel").addEventListener("click", handleUseAdjustedReductionForParcel);
    $("download-reduction-csv").addEventListener("click", handleDownloadReductionCsv);
    $("observation-filter").addEventListener("input", () => {
      if (!latestObservationImport) return;
      const filter = $("observation-filter").value.trim();
      const accepted = ns.observations.filterPoints(latestObservationImport.points, filter);
      latestObservationImport = { ...latestObservationImport, accepted, filter };
      setObservationSummary(latestObservationImport, accepted, latestObservationImport.unit);
      renderObservationTable(accepted, latestObservationImport.rejected);
      $("use-observations-for-parcel").disabled = accepted.length < 3;
      const mapPoints = observationPointsToMapPoints(accepted, latestObservationImport.unit);
      setMappedPoints(mapPoints);
      if (mapPoints.length) {
        ns.map.plotPoints(mapPoints, `${accepted.length} imported observation point${accepted.length === 1 ? "" : "s"} plotted`);
      } else {
        ns.map.clearBatch();
        $("map-meta").textContent = "No imported observation points accepted";
      }
      setReview({
        mode: "Observation Import",
        count: accepted.length,
        unit: ns.units.label(latestObservationImport.unit),
        status: latestObservationImport.rejected.length ? `${latestObservationImport.rejected.length} rejected` : "OK"
      });
    });
    $("compute-parcel").addEventListener("click", handleParcelCompute);
    $("sample-parcel").addEventListener("click", handleSampleParcel);
    $("parcel-file").addEventListener("change", () => {
      if ($("parcel-file").files.length) {
        setParcelSource(parcelSource("parcel_csv", "Parcel CSV upload", "Parcel coordinates were loaded from a parcel CSV file."));
      }
    });
    $("parcel-coordinates").addEventListener("input", () => {
      setParcelSource(parcelSource("manual", "Manual / edited coordinates", "Parcel coordinates were typed or edited directly."));
    });
    $("parcel-unit").addEventListener("change", () => {
      if ($("parcel-coordinates").value.trim() || $("parcel-file").files.length) handleParcelCompute();
    });
    $("reference-row-mode").addEventListener("change", () => {
      if ($("parcel-coordinates").value.trim() || $("parcel-file").files.length) handleParcelCompute();
    });
    $("download-parcel-csv").addEventListener("click", handleDownloadParcelCsv);
    $("download-kml").addEventListener("click", handleDownloadKml);
    $("download-kmz").addEventListener("click", handleDownloadKmz);
    $("download-dxf").addEventListener("click", handleDownloadDxf);
    $("download-computation-sheet").addEventListener("click", handleDownloadComputationSheet);
    $("download-workbook").addEventListener("click", handleDownloadWorkbook);
    $("download-report").addEventListener("click", handleDownloadReport);
    $("download-manifest").addEventListener("click", handleDownloadManifest);
    $("copy-history").addEventListener("click", handleCopyHistory);
    $("download-history-doc").addEventListener("click", handleDownloadHistoryDoc);
    $("refresh-history").addEventListener("click", () => {
      refreshHistoryPreview();
      showMessage("History of Survey preview refreshed.", "info");
    });
    document.querySelectorAll("[data-parcel-output]").forEach((button) => {
      button.addEventListener("click", () => activateParcelOutput(button.dataset.parcelOutput));
    });
    [
      "parcel-locality",
      "parcel-district",
      "parcel-client",
      "parcel-regional-number",
      "parcel-cors-id",
      "survey-date",
      "issue-date",
      "prepared-by",
      "checked-by",
      "report-revision",
      "parcel-boundary",
      "history-purpose",
      "history-acreage",
      "history-hectares",
      "history-override"
    ].forEach((id) => $(id).addEventListener("input", () => {
      refreshHistoryPreview();
      refreshQualityControl();
    }));
    $("report-status").addEventListener("change", () => {
      refreshHistoryPreview();
      refreshQualityControl();
    });
    $("convert-csv").addEventListener("click", handleCsvConvert);
    $("download-csv").addEventListener("click", handleDownloadCsv);
    $("download-geojson").addEventListener("click", handleDownloadGeoJson);
    $("copy-results").addEventListener("click", handleCopyResults);
    $("grid-result-unit").addEventListener("change", refreshResultUnits);
    $("single-utm-zone").addEventListener("change", refreshResultUnits);
    $("utm-result-unit").addEventListener("change", refreshResultUnits);
    $("csv-mode").addEventListener("change", updateCsvGridUnitLabel);
    $("about-app").addEventListener("click", openAbout);
    $("close-about").addEventListener("click", closeAbout);
    document.querySelector("[data-close-about]").addEventListener("click", closeAbout);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !$("about-modal").hidden) closeAbout();
    });

    $("sample-grid").addEventListener("click", () => {
      $("grid-easting").value = "833356.39";
      $("grid-northing").value = "180404.48";
      $("grid-unit").value = "gold_coast_foot";
      handleGridConvert();
    });

    $("sample-wgs").addEventListener("click", () => {
      $("wgs-lat").value = "5.603717";
      $("wgs-lon").value = "-0.186964";
      $("wgs-output-unit").value = "gold_coast_foot";
      handleWgsConvert();
    });

    $("sample-utm").addEventListener("click", () => {
      $("utm-easting").value = "701403.709";
      $("utm-northing").value = "571392.732";
      $("utm-zone").value = "30N";
      $("utm-output-unit").value = "gold_coast_foot";
      handleUtmConvert();
    });

    $("sample-dms").addEventListener("click", () => {
      $("freeform-dms").value = "5 deg 10' 0.575\" N, 1 deg 10' 58.808\" W";
      handleDmsConvert();
    });

    updateCsvGridUnitLabel();
    setProjectStatus(ns.project.hasDraft() ? "Browser draft available on this device." : "No browser draft restored yet.");
  }

  window.addEventListener("load", () => {
    bindEvents();
    ns.map.init();
    $("sample-grid").click();
  });
})(window.GhanaGrid = window.GhanaGrid || {});
