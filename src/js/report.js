(function (ns) {
  function xmlEscape(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function htmlEscape(value) {
    return xmlEscape(value).replace(/'/g, "&#039;");
  }

  function detailValue(value, fallback) {
    const textValue = String(value || "").trim();
    return textValue || fallback;
  }

  function text(value, style, options) {
    return { value, type: "String", style, ...(options || {}) };
  }

  function number(value, style, options) {
    return { value: Number(value), type: "Number", style, ...(options || {}) };
  }

  function formulaCell(value, formula, style, type) {
    return {
      value,
      formula,
      style,
      type: type || (typeof value === "number" ? "Number" : "String")
    };
  }

  function blank(style, options) {
    return { value: "", type: "String", style, ...(options || {}) };
  }

  function cell(config) {
    const value = config && config.value !== undefined ? config.value : "";
    const type = config && config.type ? config.type : (typeof value === "number" ? "Number" : "String");
    const style = config && config.style ? ` ss:StyleID="${xmlEscape(config.style)}"` : "";
    const formula = config && config.formula ? ` ss:Formula="${xmlEscape(config.formula)}"` : "";
    const mergeAcross = config && Number(config.mergeAcross) > 0 ? ` ss:MergeAcross="${Number(config.mergeAcross)}"` : "";
    if (value === null || value === undefined || value === "") return `<Cell${style}${formula}${mergeAcross}/>`;
    return `<Cell${style}${formula}${mergeAcross}><Data ss:Type="${type}">${xmlEscape(value)}</Data></Cell>`;
  }

  function row(cells, height) {
    const rowHeight = height ? ` ss:Height="${height}"` : "";
    return `<Row${rowHeight}>${cells.map(cell).join("")}</Row>`;
  }

  function column(width) {
    return `<Column ss:Width="${Number(width)}"/>`;
  }

  function worksheet(name, rows, columns) {
    const columnXml = Array.isArray(columns) && columns.length
      ? columns.map(column).join("\n")
      : "";
    return `
      <Worksheet ss:Name="${xmlEscape(name)}">
        <Table>
          ${columnXml}
          ${rows.join("\n")}
        </Table>
      </Worksheet>`;
  }

  function precisionText(value) {
    if (!Number.isFinite(value)) return "Closed";
    return `1:${Math.round(value).toLocaleString()}`;
  }

  function traverseEvidenceText(reduction, adjustment) {
    if (!reduction) return "No traverse reduction attached";
    const source = reduction.source_mode === "angular_traverse" ? "Angular traverse reduction" : "Bearing/distance reduction";
    const close = `${reduction.close_error.toFixed(6)} ${reduction.unit_label}`;
    const precision = precisionText(reduction.precision);
    const adjusted = adjustment
      ? `adjusted close ${adjustment.close_error_after.toFixed(6)} ${adjustment.unit_label}`
      : "not adjusted";
    return `${source}; close ${close}; precision ${precision}; ${adjusted}.`;
  }

  function qcEvidenceText(qc) {
    if (!qc) return "Not run";
    return `${qc.summary}; ${qc.counts.errors} error${qc.counts.errors === 1 ? "" : "s"}, ${qc.counts.warnings} warning${qc.counts.warnings === 1 ? "" : "s"}, ${qc.counts.ok} OK.`;
  }

  function observationEvidenceText(observationImport) {
    if (!observationImport) return "No coordinate observation import attached";
    const accepted = observationImport.accepted ? observationImport.accepted.length : 0;
    const total = observationImport.points ? observationImport.points.length : accepted;
    const rejected = observationImport.rejected ? observationImport.rejected.length : 0;
    const filter = observationImport.filter ? `; filter "${observationImport.filter}"` : "";
    return `${accepted} accepted of ${total} parsed point${total === 1 ? "" : "s"}; ${rejected} rejected row${rejected === 1 ? "" : "s"}${filter}.`;
  }

  function observationHeaderMapText(observationImport) {
    if (!observationImport) return "Not attached";
    if (!observationImport.hasHeader) return observationImport.coordinate_order_label || observationImport.format || "No header row";
    const headerMap = observationImport.header_map || {};
    return [
      `Point ID: ${detailValue(headerMap.id, "Auto-generated")}`,
      `Easting: ${detailValue(headerMap.easting, "Not mapped")}`,
      `Northing: ${detailValue(headerMap.northing, "Not mapped")}`,
      `Elevation: ${detailValue(headerMap.elevation, "Not mapped")}`,
      `Code: ${detailValue(headerMap.code, "Not mapped")}`
    ].join("; ");
  }

  function parcelSourceText(parcelSource) {
    return detailValue(parcelSource && parcelSource.label, "Manual / pasted coordinates");
  }

  function parcelSourceDetail(parcelSource) {
    return detailValue(parcelSource && parcelSource.detail, "Parcel coordinate source detail was not recorded.");
  }

  function closingRowText(result) {
    if (!result || !result.closing_point_removed) return "No repeated closing row detected";
    const closing = result.closing_point || {};
    const row = closing.source_row ? `row ${closing.source_row}` : "the final row";
    const id = closing.id ? ` (${closing.id})` : "";
    return `${row}${id} repeated the first beacon coordinate and was excluded from computation.`;
  }

  function referenceRowsText(result) {
    if (!result || !result.reference_point_count) {
      return result && result.reference_row_mode === "include_all"
        ? "Reference row handling set to include every row."
        : "No CORS/reference rows excluded.";
    }
    const rows = result.reference_points.map((point) => {
      const row = point.source_row ? `row ${point.source_row}` : point.position;
      return `${row} (${point.id})`;
    }).join("; ");
    return `${result.reference_point_count} CORS/reference row${result.reference_point_count === 1 ? "" : "s"} excluded before parcel area/perimeter computation: ${rows}.`;
  }

  function computationSummaryRows(details, result, reduction, adjustment, qc, observationImport, parcelSource, generatedAt) {
    const project = details || {};
    return [
      { field: "Product", value: "Airban Converter - The Land Surveyors Workstation" },
      { field: "Version", value: ns.constants.appVersion },
      { field: "Generated", value: generatedAt || new Date().toISOString() },
      { field: "Project", value: detailValue(project.projectName, "Survey Computation Report") },
      { field: "Locality", value: detailValue(project.locality, "[LOCALITY]") },
      { field: "District", value: detailValue(project.district, "[DISTRICT]") },
      { field: "Client", value: detailValue(project.client, "[CLIENT NAME]") },
      { field: "Regional Number", value: detailValue(project.regionalNumber, "[REGIONAL NUMBER]") },
      { field: "Reference CORS ID", value: detailValue(project.corsId, "[CORS ID]") },
      { field: "Survey Date", value: detailValue(project.surveyDate, "Not recorded") },
      { field: "Issue Date", value: detailValue(project.issueDate, "Not recorded") },
      { field: "Prepared By", value: detailValue(project.preparedBy, "Not recorded") },
      { field: "Checked By", value: detailValue(project.checkedBy, "Not recorded") },
      { field: "Revision / Issue", value: detailValue(project.reportRevision, "Draft") },
      { field: "Report Status", value: detailValue(project.reportStatus, "Draft") },
      { field: "Coordinate Reference", value: `${ns.constants.projectionLabel} (${ns.constants.ghanaGrid})` },
      { field: "Transformation Set", value: ns.constants.transformLabel },
      { field: "Native Grid Unit", value: "Gold Coast foot" },
      { field: "Working Grid Unit", value: result.unit_label },
      { field: "Parcel Coordinate Source", value: parcelSourceText(parcelSource) },
      { field: "Input Coordinate Rows", value: String(result.input_point_count || result.points.length) },
      { field: "Reference Rows", value: referenceRowsText(result) },
      { field: "Beacon Count", value: String(result.points.length) },
      { field: "Repeated Closing Row", value: closingRowText(result) },
      { field: "Perimeter", value: `${result.perimeter.toFixed(3)} ${result.unit_label}` },
      { field: "Area", value: `${result.area_acres.toFixed(4)} acres / ${result.area_hectares.toFixed(4)} hectares` },
      { field: "Observation Evidence", value: observationEvidenceText(observationImport) },
      { field: "Traverse Evidence", value: traverseEvidenceText(reduction, adjustment) },
      { field: "Quality Control", value: qcEvidenceText(qc) },
      { field: "Export Contents", value: "Computation Summary, Field Notes and Evidence, Beacon Index, Bearing and Distance Schedule, Plan Data, Geometry Review, Calculation Audit, Quality Control, Traverse Adjustment when available, Area Computation, History of Survey." }
    ];
  }

  function computationSummaryWorkbookRows(details, result, reduction, adjustment, qc, observationImport, parcelSource, generatedAt) {
    const rows = computationSummaryRows(details, result, reduction, adjustment, qc, observationImport, parcelSource, generatedAt);
    return [
      row([blank(), text("COMPUTATION SUMMARY", "Title"), blank(), blank()]),
      row([text("Field", "Header"), text("Value", "Header"), blank("Header"), blank("Header")]),
      ...rows.map((item) => row([text(item.field, "Label"), text(item.value), blank(), blank()])),
      row([blank(), blank(), blank(), blank()]),
      row([text("Review Note", "Label"), text("Confirm final submission standards, field records, and authority requirements before cadastral lodging.", "Note"), blank(), blank()])
    ];
  }

  function fieldEvidenceRows(details, result, observationImport, reduction, adjustment, parcelSource, generatedAt) {
    const project = details || {};
    const hasObservation = Boolean(observationImport);
    const accepted = hasObservation && observationImport.accepted ? observationImport.accepted.length : 0;
    const parsed = hasObservation && observationImport.points ? observationImport.points.length : accepted;
    const rejected = hasObservation && observationImport.rejected ? observationImport.rejected.length : 0;
    const duplicateIds = hasObservation && observationImport.duplicateIds ? observationImport.duplicateIds : [];
    return [
      { item: "Generated", detail: generatedAt || new Date().toISOString() },
      { item: "Project Notes", detail: detailValue(project.projectNotes, "No project notes entered.") },
      { item: "Survey Date", detail: detailValue(project.surveyDate, "Not recorded") },
      { item: "Issue Date", detail: detailValue(project.issueDate, "Not recorded") },
      { item: "Prepared By", detail: detailValue(project.preparedBy, "Not recorded") },
      { item: "Checked By", detail: detailValue(project.checkedBy, "Not recorded") },
      { item: "Revision / Issue", detail: detailValue(project.reportRevision, "Draft") },
      { item: "Report Status", detail: detailValue(project.reportStatus, "Draft") },
      { item: "Parcel Coordinate Source", detail: parcelSourceText(parcelSource) },
      { item: "Parcel Source Detail", detail: parcelSourceDetail(parcelSource) },
      { item: "Input Coordinate Rows", detail: String(result.input_point_count || result.points.length) },
      { item: "Reference Rows", detail: referenceRowsText(result) },
      { item: "Computed Beacons", detail: String(result.points.length) },
      { item: "Repeated Closing Row", detail: closingRowText(result) },
      { item: "Observation Import", detail: observationEvidenceText(observationImport) },
      { item: "Observation Format", detail: hasObservation ? observationImport.format : "Not attached" },
      { item: "Observation Column Order", detail: hasObservation ? (observationImport.coordinate_order_label || observationImport.format || "Not recorded") : "Not attached" },
      { item: "Observation Header Map", detail: observationHeaderMapText(observationImport) },
      { item: "Observation Delimiter", detail: hasObservation ? observationImport.delimiter : "Not attached" },
      { item: "Observation Unit", detail: hasObservation ? ns.units.label(observationImport.unit) : "Not attached" },
      { item: "Observation Filter", detail: hasObservation ? (observationImport.filter || "None") : "Not attached" },
      { item: "Parsed Points", detail: String(parsed) },
      { item: "Accepted Points", detail: String(accepted) },
      { item: "Rejected Rows", detail: String(rejected) },
      { item: "Duplicate Observation IDs", detail: duplicateIds.length ? duplicateIds.join(", ") : "None reported" },
      { item: "Traverse Reduction", detail: traverseEvidenceText(reduction, adjustment) },
      { item: "Adjustment Method", detail: adjustment ? adjustment.method : "No adjustment attached" }
    ];
  }

  function fieldEvidenceWorkbookRows(details, result, observationImport, reduction, adjustment, parcelSource, generatedAt) {
    const rows = fieldEvidenceRows(details, result, observationImport, reduction, adjustment, parcelSource, generatedAt);
    return [
      row([blank(), text("FIELD NOTES AND EVIDENCE", "Title"), blank()]),
      row([text("Item", "Header"), text("Detail", "Header"), blank("Header")]),
      ...rows.map((item) => row([text(item.item, "Label"), text(item.detail), blank()])),
      row([blank(), blank(), blank()]),
      row([text("Note", "Label"), text("This section records project notes and import/reduction evidence available at export time.", "Note"), blank()])
    ];
  }

  function planRows(result) {
    const rows = ns.parcel.toPlanRows(result);
    return [
      row([blank(), blank(), text("PLAN DATA", "Title"), blank(), blank(), blank(), blank()]),
      row([text("FROM", "Header"), text("TO", "Header"), text("BEARING", "Header"), blank("Header"), blank("Header"), text("DISTANCE", "Header"), text("REMARKS", "Header")]),
      row([blank("SubHeader"), blank("SubHeader"), text("deg.", "SubHeader"), text("min", "SubHeader"), text("sec", "SubHeader"), text(result.unit_label, "SubHeader"), blank("SubHeader")]),
      ...rows.map((item) => row([
        text(item.from),
        text(item.to),
        number(item.bearing_deg),
        number(item.bearing_min),
        number(item.bearing_sec),
        number(item.distance),
        text(item.remarks || "")
      ])),
      row([blank(), blank(), blank(), blank(), blank(), blank(), blank()]),
      row([blank(), blank(), blank(), blank(), blank(), text("AREA=", "Label"), number(result.area_acres.toFixed(4)), text("ACRE")]),
      row([blank(), blank(), blank(), blank(), blank(), blank(), number(result.area_hectares.toFixed(4)), text("HA")])
    ];
  }

  function bearingDistanceScheduleWorkbookRows(result) {
    const rows = ns.parcel.toBearingDistanceRows(result);
    return [
      row([blank(), blank(), text("BEARING AND DISTANCE SCHEDULE", "Title"), blank(), blank(), blank(), blank(), blank(), blank(), blank()]),
      row([
        text("No.", "Header"),
        text("From", "Header"),
        text("To", "Header"),
        text("Bearing", "Header"),
        text("Bearing Decimal", "Header"),
        text("Distance", "Header"),
        text("Unit", "Header"),
        text("dE", "Header"),
        text("dN", "Header"),
        text("Remarks", "Header")
      ]),
      ...rows.map((item) => row([
        number(item.course_no),
        text(item.from),
        text(item.to),
        text(item.bearing),
        number(item.bearing_decimal),
        number(item.distance),
        text(item.distance_unit),
        number(item.delta_easting),
        number(item.delta_northing),
        text(item.remarks || "")
      ])),
      row([blank(), blank(), blank(), blank(), text("PERIMETER", "Label"), number(result.perimeter.toFixed(3)), text(result.unit_label), blank(), blank(), blank()]),
      row([blank(), blank(), blank(), blank(), text("AREA", "Label"), number(result.area_acres.toFixed(4)), text("acres"), number(result.area_hectares.toFixed(4)), text("hectares"), blank()])
    ];
  }

  function beaconRows(result) {
    const rows = ns.parcel.toBeaconIndexRows(result);
    return [
      row([blank(), blank(), text("BEACON INDEX", "Title"), blank(), blank(), blank(), blank()]),
      row([text("Beacon", "Header"), text("Co-ordinates", "Header"), blank("Header"), text("Comptn.", "Header"), text("Description", "Header"), blank("Header"), text("Remarks", "Header")]),
      row([blank("SubHeader"), text("X", "SubHeader"), text("Y", "SubHeader"), text("Sheet No.", "SubHeader"), text("No.", "SubHeader"), text("Page", "SubHeader"), blank("SubHeader")]),
      ...rows.map((item) => row([
        text(item.beacon),
        number(item.x),
        number(item.y),
        text(item.computation_sheet_no),
        text(item.description_no),
        text(item.page),
        text(item.remarks)
      ]))
    ];
  }

  function areaRows(result) {
    const area = ns.parcel.toAreaComputationRows(result);
    return [
      row([blank(), blank(), text("AREA COMPUTATION", "Title"), blank(), blank(), blank()]),
      row([text("STATION", "Header"), text("X", "Header"), text("Y", "Header"), text("Y(I)*(X(I+1)-X(I))", "Header"), text("X(I)*(Y(I+1)-Y(I))", "Header"), text("UNIT", "Header")]),
      ...area.rows.map((item) => row([
        text(item.station),
        number(item.x),
        number(item.y),
        number(item.y_times_delta_x),
        number(item.x_times_delta_y),
        text(item.unit)
      ])),
      row([blank(), blank(), text("SUM", "Label"), number(area.summary.sum_forward.toFixed(3)), number(area.summary.sum_backward.toFixed(3)), text(area.summary.area_unit)]),
      row([blank(), blank(), text("DOUBLE AREA =", "Label"), number(area.summary.double_area.toFixed(3)), text(area.summary.area_unit), blank()]),
      row([blank(), blank(), text("AREA =", "Label"), number(area.summary.area.toFixed(3)), text(area.summary.area_unit), blank()]),
      row([blank(), blank(), text("AREA =", "Label"), number(area.summary.area_acres.toFixed(4)), text("acres"), blank()]),
      row([blank(), blank(), text("AREA =", "Label"), number(area.summary.area_hectares.toFixed(4)), text("hectares"), blank()])
    ];
  }

  function geometryReviewWorkbookRows(result) {
    const rows = ns.parcel.toGeometryReviewRows(result);
    return [
      row([blank(), text("GEOMETRY REVIEW", "Title"), blank(), blank()]),
      row([text("Item", "Header"), text("Value", "Header"), text("Unit", "Header"), text("Note", "Header")]),
      ...rows.map((item) => row([
        text(item.item, "Label"),
        text(item.value),
        text(item.unit),
        text(item.note)
      ])),
      row([blank(), blank(), blank(), blank()]),
      row([text("Review Note", "Label"), text("Use this geometry review to catch unusual side lengths, orientation, extents, and centroid placement before final issue.", "Note"), blank(), blank()])
    ];
  }

  function calculationAuditWorkbookRows(result) {
    const audit = ns.parcel.toCalculationAuditRows(result);
    const area = ns.parcel.toAreaComputationRows(result);
    const signedDoubleArea = area.summary.sum_forward - area.summary.sum_backward;
    return [
      row([blank(), blank(), blank(), text("CALCULATION AUDIT", "Title"), blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank()]),
      row([
        text("No.", "Header"),
        text("From", "Header"),
        text("To", "Header"),
        text("Start E", "Header"),
        text("Start N", "Header"),
        text("End E", "Header"),
        text("End N", "Header"),
        text("dE", "Header"),
        text("dN", "Header"),
        text("Bearing", "Header"),
        text("Distance", "Header"),
        text("Unit", "Header"),
        text("Remarks", "Header"),
        text("Y*dX", "Header"),
        text("X*dY", "Header"),
        text("Signed 2A Part", "Header"),
        text("Signed A Part", "Header"),
        text("Area Unit", "Header")
      ]),
      ...audit.map((item) => row([
        number(item.course_no),
        text(item.from),
        text(item.to),
        number(item.start_easting),
        number(item.start_northing),
        number(item.end_easting),
        number(item.end_northing),
        number(item.delta_easting),
        number(item.delta_northing),
        text(item.bearing),
        number(item.distance),
        text(item.distance_unit),
        text(item.remarks || ""),
        number(item.y_times_delta_x),
        number(item.x_times_delta_y),
        number(item.signed_double_area_part),
        number(item.signed_area_part),
        text(item.area_unit)
      ])),
      row([
        text("SUM", "Label"),
        blank(),
        blank(),
        blank(),
        blank(),
        blank(),
        blank(),
        blank(),
        blank(),
        blank(),
        blank(),
        blank(),
        blank(),
        number(area.summary.sum_forward.toFixed(3)),
        number(area.summary.sum_backward.toFixed(3)),
        number(signedDoubleArea.toFixed(3)),
        number((signedDoubleArea / 2).toFixed(3)),
        text(area.summary.area_unit)
      ]),
      row([text("AREA", "Label"), blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank(), number(result.area_acres.toFixed(4)), text("acres"), blank(), blank(), blank(), blank(), number(result.area_hectares.toFixed(4)), text("hectares")])
    ];
  }

  function traverseWorkbookRows(reduction, adjustment) {
    const rows = ns.survey.traverseRows(reduction, adjustment);
    return [
      row([blank(), blank(), text("TRAVERSE ADJUSTMENT", "Title"), blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank()]),
      row([text("Method", "Label"), text(adjustment ? adjustment.method : "Raw bearing/distance reduction"), blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank()]),
      row([text("Total distance", "Label"), number(reduction.total_distance.toFixed(3)), text(reduction.unit_label), blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank()]),
      row([text("Close before", "Label"), number(reduction.close_error.toFixed(6)), text(reduction.unit_label), blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank()]),
      row([text("Precision", "Label"), text(Number.isFinite(reduction.precision) ? `1:${Math.round(reduction.precision)}` : "Closed"), blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank()]),
      row([text("Adjusted close", "Label"), adjustment ? number(adjustment.close_error_after.toFixed(6)) : blank(), adjustment ? text(adjustment.unit_label) : blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank()]),
      row([blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank()]),
      row([
        text("No.", "Header"),
        text("From", "Header"),
        text("To", "Header"),
        text("Obs. Angle", "Header"),
        text("Angle Mode", "Header"),
        text("Bearing", "Header"),
        text("Distance", "Header"),
        text("Raw E", "Header"),
        text("Raw N", "Header"),
        text("Corr. E", "Header"),
        text("Corr. N", "Header"),
        text("Adj. E", "Header"),
        text("Adj. N", "Header")
      ]),
      ...rows.map((item) => row([
        number(item.no),
        text(item.from),
        text(item.to),
        text(item.observed_angle_dms || ""),
        text(item.angle_mode || ""),
        text(item.bearing_dms),
        number(item.distance),
        number(item.raw_easting),
        number(item.raw_northing),
        item.correction_easting === "" ? blank() : number(item.correction_easting),
        item.correction_northing === "" ? blank() : number(item.correction_northing),
        item.adjusted_easting === "" ? blank() : number(item.adjusted_easting),
        item.adjusted_northing === "" ? blank() : number(item.adjusted_northing)
      ]))
    ];
  }

  function qcWorkbookRows(qc) {
    const rows = ns.qc.toRows(qc);
    return [
      row([blank(), blank(), text("QUALITY CONTROL", "Title"), blank(), blank()]),
      row([text("Status", "Label"), text(qc.summary), blank(), blank(), blank()]),
      row([text("Errors", "Label"), number(qc.counts.errors), text("Warnings", "Label"), number(qc.counts.warnings), text(`OK ${qc.counts.ok}`)]),
      row([blank(), blank(), blank(), blank(), blank()]),
      row([text("No.", "Header"), text("Category", "Header"), text("Check", "Header"), text("Status", "Header"), text("Detail", "Header")]),
      ...rows.map((item) => row([
        number(item.no),
        text(item.category),
        text(item.check),
        text(item.status),
        text(item.detail)
      ]))
    ];
  }

  function detailsRows(details, result, generatedAt) {
    const history = ns.parcel.historyText(details, result);
    return [
      row([text("HISTORY OF SURVEY", "Title")]),
      row([text("Airban Converter Survey Workstation", "SubHeader")]),
      row([text(`Version ${ns.constants.appVersion}`)]),
      row([text(`Generated ${generatedAt || new Date().toISOString()}`)]),
      row([blank()]),
      ...history.split("\n\n").map((paragraph) => row([text(paragraph, "Note")], 62))
    ];
  }

  function cleanWorkbookStylesXml() {
    return `
    <Style ss:ID="Default" ss:Name="Normal">
      <Font ss:FontName="Calibri" ss:Size="11"/>
      <Alignment ss:Vertical="Center"/>
    </Style>
    <Style ss:ID="Title">
      <Font ss:FontName="Calibri" ss:Size="14" ss:Bold="1"/>
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0B6B3A"/>
      </Borders>
    </Style>
    <Style ss:ID="Header">
      <Font ss:Bold="1"/>
    </Style>
    <Style ss:ID="Label">
      <Font ss:Bold="1"/>
    </Style>
    <Style ss:ID="Value">
      <Font ss:Bold="1"/>
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
    </Style>
    <Style ss:ID="CenterValue">
      <Font ss:Bold="1"/>
      <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
    </Style>
    <Style ss:ID="RefText">
      <Font ss:Color="#FF0000"/>
    </Style>
    <Style ss:ID="RefValue">
      <Font ss:Color="#FF0000" ss:Bold="1"/>
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
    </Style>
    <Style ss:ID="RefHeader">
      <Font ss:Color="#FF0000" ss:Bold="1"/>
    </Style>
    <Style ss:ID="SectionGap">
      <Alignment ss:Vertical="Center"/>
    </Style>`;
  }

  function cleanWorkbookXml(sheetXml) {
    return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook
  xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:html="http://www.w3.org/TR/REC-html40">
  <Styles>
    ${cleanWorkbookStylesXml()}
  </Styles>
  ${sheetXml}
</Workbook>`;
  }

  function planDistanceHeader(result) {
    return result.unit === "metre" ? "METRES" : "FEET";
  }

  function formalBeaconIndexRows(result) {
    return [
      row([text("BEACON INDEX", "Title", { mergeAcross: 2 })], 22),
      row([text("BEACON", "Header"), text("X", "Header"), text("Y", "Header")]),
      ...ns.parcel.toComputationBeaconRows(result).map((item) => {
        const isReference = item.is_reference === "yes";
        return row([
          text(item.beacon, isReference ? "RefText" : undefined),
          number(item.x, isReference ? "RefValue" : undefined),
          number(item.y, isReference ? "RefValue" : undefined)
        ]);
      })
    ];
  }

  function formalBearingDistanceFromCoordinatesRows(result) {
    const courses = ns.parcel.toComputationCourseRows(result);
    const rows = [
      row([text("BEARING AND DISTANCE FROM COORDINATES", "Title", { mergeAcross: 8 })], 22)
    ];

    courses.forEach((course, index) => {
      const fromBeaconRow = course.from_sequence + 2;
      const toBeaconRow = course.to_sequence + 2;
      const fromStyle = course.from_is_reference ? "RefHeader" : "Value";
      const toStyle = course.to_is_reference ? "RefHeader" : "Value";
      const fromNumberStyle = course.from_is_reference ? "RefValue" : "Value";
      const toNumberStyle = course.to_is_reference ? "RefValue" : "Value";

      rows.push(
        row([
          text("FROM(A)", "Label"),
          blank(),
          formulaCell(course.from, `='BEACON INDEX'!R${fromBeaconRow}C1`, fromStyle, "String"),
          blank(),
          blank(),
          text("TO(B)", "Label"),
          blank(),
          formulaCell(course.to, `='BEACON INDEX'!R${toBeaconRow}C1`, toStyle, "String"),
          blank()
        ]),
        row([
          text("XA"),
          blank(),
          formulaCell(Number(course.xa), `='BEACON INDEX'!R${fromBeaconRow}C2`, fromNumberStyle),
          blank(),
          blank(),
          text("YA"),
          blank(),
          formulaCell(Number(course.ya), `='BEACON INDEX'!R${fromBeaconRow}C3`, fromNumberStyle),
          blank()
        ]),
        row([
          text("XB"),
          blank(),
          formulaCell(Number(course.xb), `='BEACON INDEX'!R${toBeaconRow}C2`, toNumberStyle),
          blank(),
          blank(),
          text("YB"),
          blank(),
          formulaCell(Number(course.yb), `='BEACON INDEX'!R${toBeaconRow}C3`, toNumberStyle),
          blank()
        ]),
        row([
          text("DX"),
          blank(),
          formulaCell(Number(course.dx), "=R[-1]C-R[-2]C", "Value"),
          blank(),
          blank(),
          text("DY"),
          blank(),
          formulaCell(Number(course.dy), "=R[-1]C-R[-2]C", "Value"),
          blank()
        ]),
        row([blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank()], 10),
        row([
          text("BEARING"),
          text(course.bearing_deg, "CenterValue"),
          text(course.bearing_min, "CenterValue"),
          text(course.bearing_sec, "CenterValue"),
          blank(),
          text("DISTANCE"),
          blank(),
          formulaCell(Number(course.distance), "=SQRT(R[-2]C[-5]^2+R[-2]C^2)", "Value"),
          blank()
        ])
      );

      if (index < courses.length - 1) {
        rows.push(row([blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank()], 12));
      }
    });

    return rows;
  }

  function formalPlanDataRows(result) {
    const courses = ns.parcel.toComputationCourseRows(result);
    return [
      row([text("PLAN DATA", "Title", { mergeAcross: 4 })], 22),
      row([
        text("TRAVERSE STATIONS", "Header", { mergeAcross: 1 }),
        text("BEARING", "Header", { mergeAcross: 1 }),
        text("DISTANCE", "Header")
      ]),
      row([
        text("FROM", "Header"),
        text("TO", "Header"),
        text("DEG", "Header"),
        text("MIN", "Header"),
        text(planDistanceHeader(result), "Header")
      ]),
      ...courses.map((course) => row([
        text(course.from, course.from_is_reference ? "RefText" : undefined),
        text(course.to, course.to_is_reference ? "RefText" : undefined),
        text(course.plan_bearing_deg, "CenterValue"),
        text(course.plan_bearing_min, "CenterValue"),
        number(course.plan_distance, "Value")
      ])),
      row([blank(), blank(), blank(), blank(), blank()], 10),
      row([
        text("AREA IN ACREAGE", "Label", { mergeAcross: 1 }),
        number(result.area_acres.toFixed(3), "CenterValue", { mergeAcross: 1 }),
        blank()
      ]),
      row([blank(), blank(), blank(), blank(), blank()], 10),
      row([
        text("AREA IN HECTARE", "Label", { mergeAcross: 1 }),
        number(result.area_hectares.toFixed(3), "CenterValue", { mergeAcross: 1 }),
        blank()
      ])
    ];
  }

  function cleanSurveyComputationSheets(result) {
    return [
      worksheet("BEACON INDEX", formalBeaconIndexRows(result), [150, 120, 120]),
      worksheet("BRG AND DISTANCE", formalBearingDistanceFromCoordinatesRows(result), [92, 44, 130, 44, 62, 92, 44, 130, 44]),
      worksheet("PLAN DATA", formalPlanDataRows(result), [170, 170, 52, 52, 92])
    ].join("");
  }

  function bearingDistanceCoordinateRows(result) {
    const plan = ns.parcel.toPlanRows(result);
    const beaconStartRow = 4;
    const rows = [
      row([blank(), blank(), text("BEARING   AND  DISTANCE  FROM  COORDINATES", "Title"), blank(), blank(), blank(), blank(), blank(), blank(), blank()])
    ];

    result.lines.forEach((line, index) => {
      const start = result.points[index];
      const end = result.points[(index + 1) % result.points.length];
      const bearing = plan[index];
      const startRow = beaconStartRow + index;
      const endRow = beaconStartRow + ((index + 1) % result.points.length);
      const startEasting = ns.units.fromNative(start.nativeEasting, result.unit);
      const startNorthing = ns.units.fromNative(start.nativeNorthing, result.unit);
      const endEasting = ns.units.fromNative(end.nativeEasting, result.unit);
      const endNorthing = ns.units.fromNative(end.nativeNorthing, result.unit);

      rows.push(
        row([blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank()]),
        row([
          text("From Point", "Label"),
          formulaCell(line.from, `='BEACON INDEX'!R${startRow}C1`, "SubHeader"),
          blank("SubHeader"),
          text("(A)", "Label"),
          blank(),
          blank(),
          text("To Point", "Label"),
          formulaCell(line.to, `='BEACON INDEX'!R${endRow}C1`, "SubHeader"),
          blank("SubHeader"),
          text("(B)", "Label")
        ]),
        row([
          blank(),
          text("Xa =", "Label"),
          formulaCell(Number(startEasting.toFixed(3)), `='BEACON INDEX'!R${startRow}C2`),
          blank(),
          blank(),
          blank(),
          blank(),
          text("Ya =", "Label"),
          formulaCell(Number(startNorthing.toFixed(3)), `='BEACON INDEX'!R${startRow}C3`),
          blank()
        ]),
        row([
          blank(),
          text("Xb =", "Label"),
          formulaCell(Number(endEasting.toFixed(3)), `='BEACON INDEX'!R${endRow}C2`),
          blank(),
          blank(),
          blank(),
          blank(),
          text("Yb =", "Label"),
          formulaCell(Number(endNorthing.toFixed(3)), `='BEACON INDEX'!R${endRow}C3`),
          blank()
        ]),
        row([
          blank(),
          text("Delta X =", "Label"),
          formulaCell(Number(line.delta_easting.toFixed(3)), "=R[-1]C-R[-2]C"),
          blank(),
          blank(),
          blank(),
          blank(),
          text("Delta Y =", "Label"),
          formulaCell(Number(line.delta_northing.toFixed(3)), "=R[-1]C-R[-2]C"),
          blank()
        ]),
        row([
          text("Actual Bearing =", "Label"),
          blank(),
          formulaCell(Number(bearing.bearing_deg), "=TRUNC(MOD(DEGREES(ATAN2(R[-1]C[6],R[-1]C)),360))"),
          formulaCell(Number(bearing.bearing_min), "=TRUNC(MOD(MOD(DEGREES(ATAN2(R[-1]C[5],R[-1]C[-1])),360)*60,60))"),
          formulaCell(Number(bearing.bearing_sec), "=ROUND(MOD(MOD(DEGREES(ATAN2(R[-1]C[4],R[-1]C[-2])),360)*3600,60),0)"),
          blank(),
          blank(),
          text("Distance =", "Label"),
          formulaCell(Number(line.distance.toFixed(3)), "=SQRT(R[-1]C[-6]^2+R[-1]C^2)"),
          text(result.unit_label)
        ])
      );
    });

    return rows;
  }

  function formalPlanRows(result) {
    const rows = ns.parcel.toPlanRows(result);
    const beaconStartRow = 4;
    const bearingBlockSize = 6;
    const bearingTitleRows = 1;
    const bearingActualRow = (index) => bearingTitleRows + (index * bearingBlockSize) + 6;
    const areaDataStartRow = 3;
    const areaAcreRow = areaDataStartRow + result.points.length + 3;
    const areaHectareRow = areaDataStartRow + result.points.length + 4;
    return [
      row([blank(), blank(), text("PLAN DATA", "Title"), blank(), blank(), blank(), blank(), blank(), blank()]),
      row([text("FROM", "Header"), text("TO", "Header"), text("BEARING", "Header"), blank("Header"), blank("Header"), text("DISTANCE", "Header"), text("REMARKS", "Header"), blank(), blank()]),
      row([blank("SubHeader"), blank("SubHeader"), text("deg.", "SubHeader"), text("min", "SubHeader"), text("sec", "SubHeader"), text(result.unit_label, "SubHeader"), blank("SubHeader"), blank(), blank()]),
      ...rows.map((item, index) => {
        const startRow = beaconStartRow + index;
        const endRow = beaconStartRow + ((index + 1) % result.points.length);
        const actualRow = bearingActualRow(index);
        return row([
        formulaCell(item.from, `='BEACON INDEX'!R${startRow}C1`),
        formulaCell(item.to, `='BEACON INDEX'!R${endRow}C1`),
        formulaCell(Number(item.bearing_deg), `='BRG N DIST COORD'!R${actualRow}C3`),
        formulaCell(Number(item.bearing_min), `='BRG N DIST COORD'!R${actualRow}C4`),
        formulaCell(Number(item.bearing_sec), `='BRG N DIST COORD'!R${actualRow}C5`),
        formulaCell(Number(item.distance), `='BRG N DIST COORD'!R${actualRow}C9`),
        text(item.remarks || ""),
        blank(),
        blank()
      ]);
      }),
      row([blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank(), blank()]),
      row([blank(), blank(), blank(), blank(), blank(), blank(), text("AREA=", "Label"), formulaCell(Number(result.area_acres.toFixed(4)), `='AREA COMPUTATION'!R${areaAcreRow}C4`), text("ACRE")]),
      row([blank(), blank(), blank(), blank(), blank(), blank(), blank(), formulaCell(Number(result.area_hectares.toFixed(4)), `='AREA COMPUTATION'!R${areaHectareRow}C4`), text("HA")])
    ];
  }

  function areaAcreFormula(unit) {
    if (unit === "metre") return "=R[-1]C/4046.8564224";
    if (unit === "international_foot") return "=R[-1]C/43560";
    return `=R[-1]C*${(ns.constants.goldCoastFootToMetre ** 2).toFixed(15)}/4046.8564224`;
  }

  function areaHectareFormula(unit) {
    if (unit === "metre") return "=R[-2]C/10000";
    if (unit === "international_foot") return `=R[-2]C*${(ns.constants.internationalFootToMetre ** 2).toFixed(8)}/10000`;
    return `=R[-2]C*${(ns.constants.goldCoastFootToMetre ** 2).toFixed(15)}/10000`;
  }

  function formalAreaRows(result) {
    const area = ns.parcel.toAreaComputationRows(result);
    const dataStartRow = 3;
    const dataEndRow = dataStartRow + area.rows.length - 1;

    return [
      row([blank(), blank(), text("AREA COMPUTATION", "Title"), blank(), blank(), blank()]),
      row([text("STATION", "Header"), text("X", "Header"), text("Y", "Header"), text("Y(I)*(X(I+1)-X(I))", "Header"), text("X(I)*(Y(I+1)-Y(I))", "Header"), text("UNIT", "Header")]),
      ...area.rows.map((item, index) => {
        const beaconRow = 4 + index;
        const isLast = index === area.rows.length - 1;
        const forwardFormula = isLast
          ? `=RC[-1]*(R${dataStartRow}C2-RC[-2])`
          : "=RC[-1]*(R[1]C[-2]-RC[-2])";
        const backwardFormula = isLast
          ? `=RC[-3]*(R${dataStartRow}C3-RC[-2])`
          : "=RC[-3]*(R[1]C[-2]-RC[-2])";
        return row([
          formulaCell(item.station, `='BEACON INDEX'!R${beaconRow}C1`),
          formulaCell(Number(item.x), `='BEACON INDEX'!R${beaconRow}C2`),
          formulaCell(Number(item.y), `='BEACON INDEX'!R${beaconRow}C3`),
          formulaCell(Number(item.y_times_delta_x), forwardFormula),
          formulaCell(Number(item.x_times_delta_y), backwardFormula),
          text(item.unit)
        ]);
      }),
      row([blank(), blank(), text("SUM", "Label"), formulaCell(Number(area.summary.sum_forward.toFixed(3)), `=SUM(R${dataStartRow}C:R${dataEndRow}C)`), formulaCell(Number(area.summary.sum_backward.toFixed(3)), `=SUM(R${dataStartRow}C:R${dataEndRow}C)`), text(area.summary.area_unit)]),
      row([blank(), blank(), text("DOUBLE AREA =", "Label"), formulaCell(Number(area.summary.double_area.toFixed(3)), "=ABS(R[-1]C-R[-1]C[1])"), text(area.summary.area_unit), blank()]),
      row([blank(), blank(), text("AREA =", "Label"), formulaCell(Number(area.summary.area.toFixed(3)), "=R[-1]C/2"), text(area.summary.area_unit), blank()]),
      row([blank(), blank(), text("AREA =", "Label"), formulaCell(Number(area.summary.area_acres.toFixed(4)), areaAcreFormula(result.unit)), text("acres"), blank()]),
      row([blank(), blank(), text("AREA =", "Label"), formulaCell(Number(area.summary.area_hectares.toFixed(4)), areaHectareFormula(result.unit)), text("hectares"), blank()])
    ];
  }

  function computationSheetFormulaCount(result) {
    const pointCount = result && result.points ? result.points.length : 0;
    return (23 * pointCount) + 8;
  }

  function computationReviewRows(details, result, options) {
    const project = details || {};
    const reportOptions = options || {};
    const generatedAt = reportOptions.generatedAt || new Date().toISOString();
    const parcelSource = reportOptions.parcelSource || project.parcelSource || {};
    const sheetNames = [
      "COMPUTATION REVIEW",
      "BEACON INDEX",
      "BRG N DIST COORD",
      "PLAN DATA",
      "AREA COMPUTATION"
    ];

    return [
      row([blank(), text("COMPUTATION SHEET REVIEW", "Title"), blank(), blank()]),
      row([text("Product", "Label"), text("Airban Converter - The Land Surveyors Workstation"), blank(), blank()]),
      row([text("Version", "Label"), text(ns.constants.appVersion), blank(), blank()]),
      row([text("Generated", "Label"), text(generatedAt), blank(), blank()]),
      row([blank(), blank(), blank(), blank()]),
      row([text("Project", "Label"), text(detailValue(project.projectName, "Survey Computation")), blank(), blank()]),
      row([text("Locality", "Label"), text(detailValue(project.locality, "[LOCALITY]")), blank(), blank()]),
      row([text("District", "Label"), text(detailValue(project.district, "[DISTRICT]")), blank(), blank()]),
      row([text("Client", "Label"), text(detailValue(project.client, "[CLIENT NAME]")), blank(), blank()]),
      row([text("Regional Number", "Label"), text(detailValue(project.regionalNumber, "[REGIONAL NUMBER]")), blank(), blank()]),
      row([text("Reference CORS ID", "Label"), text(detailValue(project.corsId, "[CORS ID]")), blank(), blank()]),
      row([text("Prepared By", "Label"), text(detailValue(project.preparedBy, "Not recorded")), text("Checked By", "Label"), text(detailValue(project.checkedBy, "Not recorded"))]),
      row([blank(), blank(), blank(), blank()]),
      row([text("Coordinate Reference", "Label"), text(`${ns.constants.projectionLabel} (${ns.constants.ghanaGrid})`), blank(), blank()]),
      row([text("Transformation Set", "Label"), text(ns.constants.transformLabel), blank(), blank()]),
      row([text("Grid Unit", "Label"), text(result.unit_label), blank(), blank()]),
      row([text("Parcel Coordinate Source", "Label"), text(parcelSourceText(parcelSource)), blank(), blank()]),
      row([text("Parcel Source Detail", "Label"), text(parcelSourceDetail(parcelSource)), blank(), blank()]),
      row([blank(), blank(), blank(), blank()]),
      row([text("Input Coordinate Rows", "Label"), number(result.input_point_count || result.points.length), text("Computed Beacons", "Label"), number(result.points.length)]),
      row([text("Reference Rows", "Label"), text(referenceRowsText(result)), blank(), blank()]),
      row([text("Repeated Closing Row", "Label"), text(closingRowText(result)), blank(), blank()]),
      row([text("Perimeter", "Label"), number(result.perimeter.toFixed(3)), text("Unit", "Label"), text(result.unit_label)]),
      row([text("Area", "Label"), number(result.area_acres.toFixed(4)), text("acres", "Label"), blank()]),
      row([text("Area", "Label"), number(result.area_hectares.toFixed(4)), text("hectares", "Label"), blank()]),
      row([blank(), blank(), blank(), blank()]),
      row([text("Worksheets", "Label"), number(sheetNames.length), text("Formula Cells", "Label"), number(computationSheetFormulaCount(result))]),
      row([text("Formula Coverage", "Label"), text("Bearing/distance, plan data references, shoelace products, sums, double area, area, acres, and hectares."), blank(), blank()], 48),
      row([text("Sheets Included", "Label"), text(sheetNames.join(", ")), blank(), blank()], 42),
      row([text("Review Note", "Label"), text("Confirm control, transformation method, field evidence, and office submission standards before final issue."), blank(), blank()], 48)
    ];
  }

  function buildComputationSheetXml(details, result, options) {
    if (!result) throw new Error("Compute a parcel before exporting the computation sheet.");
    return cleanWorkbookXml(cleanSurveyComputationSheets(result));
  }

  function markdownEscape(value) {
    return String(value ?? "")
      .replace(/\r?\n/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\|/g, "\\|");
  }

  function markdownTable(headers, rows) {
    return [
      `| ${headers.map((header) => markdownEscape(header.label)).join(" | ")} |`,
      `| ${headers.map(() => "---").join(" | ")} |`,
      ...rows.map((item) => `| ${headers.map((header) => markdownEscape(item[header.key])).join(" | ")} |`)
    ].join("\n");
  }

  function projectDetailStatus(details) {
    const project = details || {};
    const required = [
      ["locality", "Parcel locality"],
      ["district", "District"],
      ["client", "Client name"],
      ["regionalNumber", "Regional number"],
      ["corsId", "Reference CORS ID"]
    ];
    const missing = required
      .filter(([key]) => !String(project[key] || "").trim())
      .map(([, label]) => label);
    return missing.length ? `Review needed: missing ${missing.join(", ")}` : "Complete";
  }

  function signOffStatus(details) {
    const project = details || {};
    const required = [
      ["surveyDate", "Survey date"],
      ["issueDate", "Issue date"],
      ["preparedBy", "Prepared by"],
      ["checkedBy", "Checked by"],
      ["reportRevision", "Revision / issue"]
    ];
    const missing = required
      .filter(([key]) => !String(project[key] || "").trim())
      .map(([, label]) => label);
    return missing.length ? `Review needed: missing ${missing.join(", ")}` : "Complete";
  }

  function packageChecklistRows(details, result, reduction, adjustment, qc, observationImport, parcelSource) {
    const formalCourses = ns.parcel.toComputationCourseRows(result);
    const formalBeacons = ns.parcel.toComputationBeaconRows(result);
    return [
      {
        item: "Project details",
        status: projectDetailStatus(details),
        notes: "Used in History of Survey, report cover, workbook, KML, DXF, and GeoJSON metadata."
      },
      {
        item: "Parcel coordinates",
        status: "Included",
        notes: `${result.points.length} computed beacon${result.points.length === 1 ? "" : "s"} from ${result.input_point_count || result.points.length} input row${(result.input_point_count || result.points.length) === 1 ? "" : "s"}; ${referenceRowsText(result)} ${closingRowText(result)}.`
      },
      {
        item: "Reference departure and closure",
        status: result.reference_point_count ? "Included in output trail" : "No reference rows detected",
        notes: result.reference_point_count ? `${result.reference_point_count} reference row${result.reference_point_count === 1 ? "" : "s"} excluded from area/perimeter, then shown in Beacon Index, Bearing and Distance, and Plan Data.` : referenceRowsText(result)
      },
      {
        item: "Beacon Index",
        status: "Included",
        notes: `${formalBeacons.length} coordinate row${formalBeacons.length === 1 ? "" : "s"} generated, including reference rows where available.`
      },
      {
        item: "Plan Data",
        status: "Included",
        notes: `${formalCourses.length} course${formalCourses.length === 1 ? "" : "s"} generated with reference departure and closure ties where available.`
      },
      {
        item: "Bearing and Distance from Coordinates",
        status: "Included",
        notes: `${formalCourses.length} course${formalCourses.length === 1 ? "" : "s"} with XA, YA, XB, YB, DX, DY, bearing, and distance.`
      },
      {
        item: "History of Survey",
        status: "Draft included",
        notes: "Review wording before submission."
      },
      {
        item: "Area values",
        status: "Included in Plan Data",
        notes: `${result.area_acres.toFixed(4)} acres / ${result.area_hectares.toFixed(4)} hectares from enclosed parcel beacons only.`
      },
      {
        item: "Geometry exports",
        status: "Available",
        notes: "Download KML/KMZ for Google Earth/mobile review, DXF for CAD, and GeoJSON for GIS."
      }
    ];
  }

  function recommendedExportRows() {
    return [
      { file: "Airban project file", purpose: "Reopen the job with details, inputs, and workstation state." },
      { file: "Survey workbook (.xls)", purpose: "Clean Beacon Index, Bearing and Distance from Coordinates, and Plan Data sheets." },
      { file: "Survey report (.html)", purpose: "Branded review report with parcel sketch, survey narrative, Beacon Index, Bearing and Distance, and Plan Data." },
      { file: "Parcel KML (.kml)", purpose: "Google Earth and mobile map review." },
      { file: "Parcel KMZ (.kmz)", purpose: "Compressed Google Earth parcel package containing doc.kml." },
      { file: "Parcel DXF (.dxf)", purpose: "CAD boundary, beacon, label, and note layers." },
      { file: "Parcel GeoJSON (.geojson)", purpose: "GIS polygon, boundary course, and beacon point features." },
      { file: "Active CSV", purpose: "Current table view: Plan Data, Bearing and Distance, Beacon Index, or Area Computation." },
      { file: "Survey Package Manifest (.md)", purpose: "Human-readable handoff checklist for the computed package." }
    ];
  }

  function buildSurveyPackageManifest(details, result, options) {
    if (!result) throw new Error("Compute a parcel before exporting the package manifest.");
    const reportOptions = options || {};
    const parcelSource = reportOptions.parcelSource || (details && details.parcelSource);
    const generatedAt = reportOptions.generatedAt || new Date().toISOString();
    const history = ns.parcel.historyText(details || {}, result);
    const courses = ns.parcel.toComputationCourseRows(result);
    const plan = ns.parcel.toComputationPlanRows(result);
    const beacons = ns.parcel.toComputationBeaconRows(result);

    const sections = [
      "# Survey Package Manifest",
      "",
      `Product: Airban Converter - The Land Surveyors Workstation`,
      `Version: ${ns.constants.appVersion}`,
      `Project: ${detailValue(details && details.projectName, "Survey Computation Report")}`,
      `Generated: ${generatedAt}`,
      "",
      "## Package Review",
      markdownTable([
        { key: "item", label: "Item" },
        { key: "status", label: "Status" },
        { key: "notes", label: "Notes" }
      ], packageChecklistRows(details, result, null, null, null, null, parcelSource)),
      "",
      "## Recommended Export Set",
      markdownTable([
        { key: "file", label: "File" },
        { key: "purpose", label: "Purpose" }
      ], recommendedExportRows()),
      "",
      "## Beacon Index Review",
      markdownTable([
        { key: "beacon", label: "Beacon" },
        { key: "x", label: "X" },
        { key: "y", label: "Y" },
        { key: "unit", label: "Unit" },
        { key: "is_reference", label: "Reference" }
      ], beacons),
      "",
      "## Bearing and Distance from Coordinates",
      markdownTable([
        { key: "course_no", label: "No." },
        { key: "from", label: "From" },
        { key: "to", label: "To" },
        { key: "xa", label: "XA" },
        { key: "ya", label: "YA" },
        { key: "xb", label: "XB" },
        { key: "yb", label: "YB" },
        { key: "dx", label: "DX" },
        { key: "dy", label: "DY" },
        { key: "bearing", label: "Bearing" },
        { key: "distance", label: "Distance" },
        { key: "distance_unit", label: "Unit" }
      ], courses),
      "",
      "## Plan Data",
      markdownTable([
        { key: "from", label: "From" },
        { key: "to", label: "To" },
        { key: "bearing_deg", label: "Deg" },
        { key: "bearing_min", label: "Min" },
        { key: "distance", label: "Distance" },
        { key: "distance_unit", label: "Unit" }
      ], plan),
      "",
      "## History of Survey",
      history,
      "",
      "## Review Note",
      "Confirm final submission standards, field records, cadastral requirements, and the required transformation method before lodging or issuing the survey package."
    ];

    return `${sections.join("\n")}\n`;
  }

  function buildSurveyWorkbookXml(details, result, options) {
    if (!result) throw new Error("Compute a parcel before exporting the workbook.");
    return cleanWorkbookXml(cleanSurveyComputationSheets(result));
  }

  function tableHtml(headers, rows) {
    return `
      <table>
        <thead>
          <tr>${headers.map((header) => `<th>${htmlEscape(header.label)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows.map((item) => `<tr>${headers.map((header) => `<td>${htmlEscape(item[header.key])}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
    `;
  }

  function tableCell(value, className) {
    const classAttribute = className ? ` class="${className}"` : "";
    return `<td${classAttribute}>${htmlEscape(value)}</td>`;
  }

  function beaconIndexHtml(rows) {
    return `
      <table>
        <thead><tr><th>Beacon</th><th>X</th><th>Y</th></tr></thead>
        <tbody>
          ${rows.map((item) => `
            <tr>
              ${tableCell(item.beacon, item.is_reference ? "ref-cell" : "")}
              ${tableCell(item.x, item.is_reference ? "ref-cell numeric" : "numeric")}
              ${tableCell(item.y, item.is_reference ? "ref-cell numeric" : "numeric")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  function bearingDistanceCoordinateHtml(rows) {
    return `
      <table>
        <thead>
          <tr>
            <th>From</th><th>To</th><th>XA</th><th>YA</th><th>XB</th><th>YB</th><th>DX</th><th>DY</th><th>Bearing</th><th>Distance</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((item) => `
            <tr>
              ${tableCell(item.from, item.from_is_reference ? "ref-cell" : "")}
              ${tableCell(item.to, item.to_is_reference ? "ref-cell" : "")}
              ${tableCell(item.xa, item.from_is_reference ? "ref-cell numeric" : "numeric")}
              ${tableCell(item.ya, item.from_is_reference ? "ref-cell numeric" : "numeric")}
              ${tableCell(item.xb, item.to_is_reference ? "ref-cell numeric" : "numeric")}
              ${tableCell(item.yb, item.to_is_reference ? "ref-cell numeric" : "numeric")}
              ${tableCell(item.dx, "numeric")}
              ${tableCell(item.dy, "numeric")}
              ${tableCell(item.bearing)}
              ${tableCell(`${item.distance} ${item.distance_unit}`, "numeric")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  function planDataHtml(rows) {
    return `
      <table>
        <thead><tr><th>From</th><th>To</th><th>Deg</th><th>Min</th><th>Distance</th><th>Unit</th></tr></thead>
        <tbody>
          ${rows.map((item) => `
            <tr>
              ${tableCell(item.from, item.from_is_reference ? "ref-cell" : "")}
              ${tableCell(item.to, item.to_is_reference ? "ref-cell" : "")}
              ${tableCell(item.bearing_deg, "numeric")}
              ${tableCell(item.bearing_min, "numeric")}
              ${tableCell(item.distance, "numeric")}
              ${tableCell(item.distance_unit)}
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  function buildHistoryWordDocumentHtml(details, result, options) {
    const reportOptions = options || {};
    const generatedAt = reportOptions.generatedAt || new Date().toISOString();
    const history = ns.parcel.historyText(details || {}, result);
    const paragraphs = history
      .split(/\n\s*\n/)
      .map((paragraph) => `<p>${htmlEscape(paragraph)}</p>`)
      .join("\n");

    return `<!doctype html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>History of Survey</title>
  <style>
    @page Section1 { size: 8.5in 11in; margin: 1in 1in 1in 1in; }
    div.Section1 { page: Section1; }
    body {
      color: #000000;
      font-family: "Times New Roman", Times, serif;
      font-size: 12pt;
      line-height: 1.5;
    }
    h1 {
      margin: 0 0 42pt;
      text-align: center;
      font-size: 14pt;
      font-weight: 700;
      text-decoration: underline;
    }
    p {
      margin: 0 0 20pt;
      text-align: justify;
    }
    .meta {
      margin-top: 34pt;
      color: #666666;
      font-size: 8pt;
      text-align: left;
    }
  </style>
</head>
<body>
  <div class="Section1">
    <h1>HISTORY OF SURVEY</h1>
    ${paragraphs}
    <p class="meta">Generated by Airban Converter v${htmlEscape(ns.constants.appVersion)} on ${htmlEscape(generatedAt)}.</p>
  </div>
</body>
</html>`;
  }

  function parcelSketchSvg(result) {
    const width = 640;
    const height = 420;
    const pad = 58;
    const nativePoints = result.points.map((point) => ({
      id: point.id,
      x: point.nativeEasting,
      y: point.nativeNorthing
    }));
    const xs = nativePoints.map((point) => point.x);
    const ys = nativePoints.map((point) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const rangeX = Math.max(maxX - minX, 1);
    const rangeY = Math.max(maxY - minY, 1);
    const scale = Math.min((width - pad * 2) / rangeX, (height - pad * 2) / rangeY);
    const offsetX = (width - rangeX * scale) / 2;
    const offsetY = (height - rangeY * scale) / 2;
    const projected = nativePoints.map((point) => ({
      id: point.id,
      x: offsetX + (point.x - minX) * scale,
      y: height - (offsetY + (point.y - minY) * scale)
    }));
    const polygon = projected.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");

    return `
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Parcel sketch">
        <rect width="${width}" height="${height}" fill="#f7faf8"/>
        <line x1="${width - 72}" y1="52" x2="${width - 72}" y2="108" stroke="#182027" stroke-width="2"/>
        <path d="M ${width - 72} 42 L ${width - 82} 60 L ${width - 62} 60 Z" fill="#182027"/>
        <text x="${width - 72}" y="32" text-anchor="middle" font-size="18" font-weight="700" fill="#182027">N</text>
        <polygon points="${polygon}" fill="rgba(60,174,73,0.16)" stroke="#23752e" stroke-width="3"/>
        ${projected.map((point) => `
          <circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="5.5" fill="#0f766e" stroke="#ffffff" stroke-width="2"/>
          <text x="${(point.x + 9).toFixed(1)}" y="${(point.y - 9).toFixed(1)}" font-size="15" font-weight="700" fill="#173f1d">${htmlEscape(point.id)}</text>
        `).join("")}
      </svg>
    `;
  }

  function traverseSectionHtml(reduction, adjustment) {
    if (!reduction) return "";
    const rows = ns.survey.traverseRows(reduction, adjustment);
    return `
      <section>
        <h2>Traverse Adjustment</h2>
        <div class="summary-grid">
          <div class="summary-card"><span>Method</span><strong>${htmlEscape(adjustment ? adjustment.method : "Raw reduction")}</strong></div>
          <div class="summary-card"><span>Total Distance</span><strong>${reduction.total_distance.toFixed(3)} ${htmlEscape(reduction.unit_label)}</strong></div>
          <div class="summary-card"><span>Close Before</span><strong>${reduction.close_error.toFixed(6)} ${htmlEscape(reduction.unit_label)}</strong></div>
          <div class="summary-card"><span>Precision</span><strong>${htmlEscape(Number.isFinite(reduction.precision) ? `1:${Math.round(reduction.precision)}` : "Closed")}</strong></div>
          <div class="summary-card"><span>Adjusted Close</span><strong>${adjustment ? `${adjustment.close_error_after.toFixed(6)} ${htmlEscape(adjustment.unit_label)}` : "Not applied"}</strong></div>
        </div>
        ${tableHtml([
          { key: "no", label: "No." },
          { key: "from", label: "From" },
          { key: "to", label: "To" },
          { key: "observed_angle_dms", label: "Obs. Angle" },
          { key: "angle_mode", label: "Angle Mode" },
          { key: "bearing_dms", label: "Bearing" },
          { key: "distance", label: `Distance (${reduction.unit_label})` },
          { key: "raw_easting", label: "Raw E" },
          { key: "raw_northing", label: "Raw N" },
          { key: "correction_easting", label: "Corr. E" },
          { key: "correction_northing", label: "Corr. N" },
          { key: "adjusted_easting", label: "Adj. E" },
          { key: "adjusted_northing", label: "Adj. N" }
        ], rows)}
        <p class="note">Traverse adjustment is included as calculation evidence. Confirm the method and accepted closure standard before final cadastral submission.</p>
      </section>
    `;
  }

  function qcSectionHtml(qc) {
    if (!qc) return "";
    return `
      <section>
        <h2>Quality Control</h2>
        <div class="summary-grid">
          <div class="summary-card"><span>Status</span><strong>${htmlEscape(qc.summary)}</strong></div>
          <div class="summary-card"><span>Errors</span><strong>${qc.counts.errors}</strong></div>
          <div class="summary-card"><span>Warnings</span><strong>${qc.counts.warnings}</strong></div>
          <div class="summary-card"><span>OK Checks</span><strong>${qc.counts.ok}</strong></div>
        </div>
        ${tableHtml([
          { key: "category", label: "Category" },
          { key: "check", label: "Check" },
          { key: "status", label: "Status" },
          { key: "detail", label: "Detail" }
        ], ns.qc.toRows(qc))}
        <p class="note">Quality Control is a workstation readiness review. Confirm final submission standards, field notes, and authority requirements before cadastral lodging.</p>
      </section>
    `;
  }

  function fieldEvidenceSectionHtml(details, result, observationImport, reduction, adjustment, parcelSource, generatedAt) {
    return `
      <section>
        <h2>Field Notes and Evidence</h2>
        ${tableHtml([
          { key: "item", label: "Item" },
          { key: "detail", label: "Detail" }
        ], fieldEvidenceRows(details, result, observationImport, reduction, adjustment, parcelSource, generatedAt))}
        <p class="note">This section records the project notes and the import/reduction evidence available at the moment of export.</p>
      </section>
    `;
  }

  function computationSummarySectionHtml(details, result, reduction, adjustment, qc, observationImport, parcelSource, generatedAt) {
    return `
      <section>
        <h2>Computation Summary</h2>
        ${tableHtml([
          { key: "field", label: "Field" },
          { key: "value", label: "Value" }
        ], computationSummaryRows(details, result, reduction, adjustment, qc, observationImport, parcelSource, generatedAt))}
        <p class="note">This summary identifies the computation package, coordinate reference, units, area/perimeter totals, attached traverse evidence, and Quality Control status for review.</p>
      </section>
    `;
  }

  function buildSurveyReportHtml(details, result, options) {
    if (!result) throw new Error("Compute a parcel before exporting the report.");

    const reportOptions = options || {};
    const plan = ns.parcel.toComputationPlanRows(result);
    const schedule = ns.parcel.toComputationCourseRows(result);
    const beacons = ns.parcel.toComputationBeaconRows(result);
    const history = ns.parcel.historyText(details || {}, result);
    const parcelSource = reportOptions.parcelSource || (details && details.parcelSource);
    const generatedAt = reportOptions.generatedAt || new Date().toISOString();
    const logoUrl = reportOptions.logoUrl || "src/assets/airban-full-logo.jpg";
    const projectName = detailValue(details && details.projectName, "Survey Computation Report");
    const locality = detailValue(details && details.locality, "[LOCALITY]");
    const district = detailValue(details && details.district, "[DISTRICT]");
    const client = detailValue(details && details.client, "[CLIENT NAME]");
    const regionalNumber = detailValue(details && details.regionalNumber, "[REGIONAL NUMBER]");
    const corsId = detailValue(details && details.corsId, "[CORS ID]");
    const surveyDate = detailValue(details && details.surveyDate, "Not recorded");
    const preparedBy = detailValue(details && details.preparedBy, "Not recorded");

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Airban Survey Report</title>
  <style>
    :root {
      --ink: #151b22;
      --muted: #5c6975;
      --line: #cbd8df;
      --soft: #f4f7f8;
      --accent: #3cae49;
      --accent-dark: #23752e;
      --metal: #18232e;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #eef3f1;
      color: var(--ink);
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1.45;
    }
    .page {
      width: min(1040px, calc(100% - 28px));
      margin: 18px auto;
      background: #fff;
      box-shadow: 0 18px 48px rgba(16, 24, 40, 0.16);
    }
    header {
      display: grid;
      grid-template-columns: 260px 1fr;
      gap: 22px;
      align-items: center;
      padding: 24px 28px;
      background: linear-gradient(135deg, rgba(60,174,73,0.18), transparent 36%), linear-gradient(180deg, var(--metal), #090d12);
      color: #fff;
      border-bottom: 5px solid var(--accent);
    }
    .logo {
      width: 100%;
      aspect-ratio: 1568 / 672;
      object-fit: contain;
      border-radius: 7px;
      background: #000;
      border: 1px solid rgba(255,255,255,0.18);
    }
    h1, h2, h3, p { margin: 0; }
    h1 { font-size: 28px; line-height: 1.15; }
    header p { margin-top: 6px; color: #c9d4dd; }
    main { padding: 26px 28px 34px; }
    section { margin-top: 26px; break-inside: avoid; }
    section:first-child { margin-top: 0; }
    h2 {
      padding-bottom: 7px;
      border-bottom: 2px solid var(--accent);
      color: var(--metal);
      font-size: 18px;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      margin-top: 14px;
    }
    .summary-card {
      padding: 12px;
      border: 1px solid var(--line);
      background: var(--soft);
      border-radius: 6px;
    }
    .summary-card span {
      display: block;
      color: var(--muted);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .summary-card strong {
      display: block;
      margin-top: 4px;
      overflow-wrap: anywhere;
      font-size: 15px;
    }
    .history p {
      margin-top: 13px;
      text-align: justify;
    }
    .sketch {
      margin-top: 14px;
      border: 1px solid var(--line);
      border-radius: 6px;
      overflow: hidden;
    }
    table {
      width: 100%;
      margin-top: 12px;
      border-collapse: collapse;
      font-size: 12px;
    }
    th, td {
      padding: 7px 8px;
      border-bottom: 1px solid #e4ebef;
      text-align: left;
      vertical-align: top;
      overflow-wrap: anywhere;
    }
    th {
      background: #d9ead3;
      color: #21313a;
      font-weight: 700;
    }
    .numeric {
      text-align: right;
    }
    .ref-cell {
      color: #d60000;
      font-weight: 700;
    }
    .note {
      margin-top: 18px;
      padding: 12px;
      border-left: 4px solid var(--accent);
      background: #f4faf6;
      color: #35434d;
      font-size: 12px;
    }
    footer {
      padding: 14px 28px 20px;
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-size: 11px;
    }
    @media print {
      body { background: #fff; }
      .page { width: 100%; margin: 0; box-shadow: none; }
      section { break-inside: avoid; }
    }
    @media (max-width: 760px) {
      header { grid-template-columns: 1fr; }
      .summary-grid { grid-template-columns: 1fr 1fr; }
    }
  </style>
</head>
<body>
  <article class="page">
    <header>
      <img class="logo" src="${htmlEscape(logoUrl)}" alt="Airban Engineering">
      <div>
        <h1>${htmlEscape(projectName)}</h1>
        <p>Survey Computation Report | The Land Surveyors Workstation</p>
        <p>Generated ${htmlEscape(generatedAt)} with Airban Converter v${htmlEscape(ns.constants.appVersion)}</p>
      </div>
    </header>
    <main>
      <section>
        <h2>Project Summary</h2>
        <div class="summary-grid">
          <div class="summary-card"><span>Project</span><strong>${htmlEscape(projectName)}</strong></div>
          <div class="summary-card"><span>Locality</span><strong>${htmlEscape(locality)}</strong></div>
          <div class="summary-card"><span>District</span><strong>${htmlEscape(district)}</strong></div>
          <div class="summary-card"><span>Client</span><strong>${htmlEscape(client)}</strong></div>
          <div class="summary-card"><span>Regional No.</span><strong>${htmlEscape(regionalNumber)}</strong></div>
          <div class="summary-card"><span>CORS ID</span><strong>${htmlEscape(corsId)}</strong></div>
          <div class="summary-card"><span>Survey Date</span><strong>${htmlEscape(surveyDate)}</strong></div>
          <div class="summary-card"><span>Prepared By</span><strong>${htmlEscape(preparedBy)}</strong></div>
          <div class="summary-card"><span>Beacons</span><strong>${result.points.length}</strong></div>
          <div class="summary-card"><span>Perimeter</span><strong>${result.perimeter.toFixed(3)} ${htmlEscape(result.unit_label)}</strong></div>
          <div class="summary-card"><span>Area</span><strong>${result.area_acres.toFixed(4)} acres</strong></div>
          <div class="summary-card"><span>Area</span><strong>${result.area_hectares.toFixed(4)} hectares</strong></div>
          <div class="summary-card"><span>Coordinate Source</span><strong>${htmlEscape(parcelSourceText(parcelSource))}</strong></div>
        </div>
      </section>
      <section>
        <h2>Parcel Sketch</h2>
        <div class="sketch">${parcelSketchSvg(result)}</div>
        <p class="note">Sketch is a schematic coordinate preview generated from the parcel beacon coordinates. Use the app map preview and your formal plan drawing for final map presentation.</p>
      </section>
      <section class="history">
        <h2>History of Survey</h2>
        ${history.split("\n\n").map((paragraph) => `<p>${htmlEscape(paragraph)}</p>`).join("")}
      </section>
      <section>
        <h2>Beacon Index</h2>
        ${beaconIndexHtml(beacons)}
      </section>
      <section>
        <h2>Bearing and Distance from Coordinates</h2>
        ${bearingDistanceCoordinateHtml(schedule)}
        <p class="note">Reference rows are shown as departure and closure ties for the computation trail. Parcel area remains calculated from the enclosed parcel beacons only.</p>
      </section>
      <section>
        <h2>Plan Data</h2>
        ${planDataHtml(plan)}
      </section>
    </main>
    <footer>
      Airban Converter v${htmlEscape(ns.constants.appVersion)}. Ghana Grid computations should be checked against required authority transformation and known control before production submission.
    </footer>
  </article>
</body>
</html>`;
  }

  function calculationAuditSectionHtml(result) {
    return `
      <section>
        <h2>Calculation Audit</h2>
        ${tableHtml([
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
          { key: "distance", label: `Distance (${result.unit_label})` },
          { key: "remarks", label: "Remarks" },
          { key: "y_times_delta_x", label: "Y*dX" },
          { key: "x_times_delta_y", label: "X*dY" },
          { key: "signed_double_area_part", label: "Signed 2A Part" },
          { key: "signed_area_part", label: "Signed A Part" }
        ], ns.parcel.toCalculationAuditRows(result))}
        <p class="note">Calculation Audit combines each boundary course with coordinate deltas, computed bearing/distance, and signed shoelace area contribution for line-by-line review.</p>
      </section>
    `;
  }

  function signOffSectionHtml(preparedBy, checkedBy, reportRevision, reportStatus, generatedAt) {
    return `
      <section>
        <h2>Issue Control</h2>
        <div class="summary-grid">
          <div class="summary-card"><span>Prepared By</span><strong>${htmlEscape(preparedBy)}</strong></div>
          <div class="summary-card"><span>Checked By</span><strong>${htmlEscape(checkedBy)}</strong></div>
          <div class="summary-card"><span>Revision / Issue</span><strong>${htmlEscape(reportRevision)}</strong></div>
          <div class="summary-card"><span>Status</span><strong>${htmlEscape(reportStatus)}</strong></div>
        </div>
        <p class="note">Generated ${htmlEscape(generatedAt)}. Final issue should be signed and checked according to the surveyor's office procedure and applicable authority requirements.</p>
      </section>
    `;
  }

  ns.report = {
    buildSurveyWorkbookXml,
    buildComputationSheetXml,
    buildSurveyReportHtml,
    buildHistoryWordDocumentHtml,
    buildSurveyPackageManifest
  };
})(window.GhanaGrid = window.GhanaGrid || {});
