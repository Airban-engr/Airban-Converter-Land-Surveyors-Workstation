(function (ns) {
  const STORAGE_KEY = "airban-survey-workstation-draft";
  const SCHEMA = "airban-survey-project";
  const SCHEMA_VERSION = 9;

  function slugify(value) {
    const slug = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return slug || "airban-survey-project";
  }

  function build(state) {
    return {
      schema: SCHEMA,
      schema_version: SCHEMA_VERSION,
      app: "Airban Converter",
      app_version: ns.constants.appVersion,
      saved_at: new Date().toISOString(),
      project: {
        name: state.name || "",
        details: state.details || {}
      },
      workstation: {
        parcel_unit: state.parcelUnit || "gold_coast_foot",
        reference_row_mode: state.parcelReferenceMode || "auto",
        parcel_coordinates: state.parcelCoordinates || "",
        parcel_source: state.parcelSource || {
          code: "manual",
          label: "Manual / pasted coordinates",
          detail: "Parcel coordinates were entered directly or loaded from a parcel CSV."
        },
        active_output: state.activeOutput || "plan"
      },
      observations: {
        unit: state.observationUnit || "gold_coast_foot",
        coordinate_order: state.observationOrder || "id_easting_northing",
        filter: state.observationFilter || "",
        text: state.observationText || ""
      },
      reduction: {
        start_id: state.reductionStartId || "",
        start_easting: state.reductionStartEasting || "",
        start_northing: state.reductionStartNorthing || "",
        unit: state.reductionUnit || "gold_coast_foot",
        text: state.reductionText || "",
        adjustment_applied: Boolean(state.reductionAdjustmentApplied)
      },
      angular: {
        start_id: state.angularStartId || "",
        start_easting: state.angularStartEasting || "",
        start_northing: state.angularStartNorthing || "",
        unit: state.angularUnit || "gold_coast_foot",
        initial_bearing: state.angularInitialBearing || "",
        angle_mode: state.angularAngleMode || "deflection_right",
        text: state.angularText || "",
        adjustment_applied: Boolean(state.angularAdjustmentApplied)
      },
      notes: state.notes || ""
    };
  }

  function parse(text) {
    let project;
    try {
      project = JSON.parse(text);
    } catch (error) {
      throw new Error("Project file must be valid JSON.");
    }

    if (!project || project.schema !== SCHEMA) {
      throw new Error("This is not an Airban survey project file.");
    }
    if (Number(project.schema_version) > SCHEMA_VERSION) {
      throw new Error("This project file was created by a newer Airban Converter version.");
    }

    return project;
  }

  function filename(project) {
    const parts = [
      project.project && project.project.name,
      project.project && project.project.details && project.project.details.locality,
      project.project && project.project.details && project.project.details.regionalNumber
    ].filter(Boolean);
    return `${slugify(parts.join(" "))}.airban-project.json`;
  }

  function saveDraft(project) {
    if (!window.localStorage) throw new Error("Browser draft storage is not available.");
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  }

  function loadDraft() {
    if (!window.localStorage) throw new Error("Browser draft storage is not available.");
    const text = window.localStorage.getItem(STORAGE_KEY);
    if (!text) throw new Error("No saved browser draft was found.");
    return parse(text);
  }

  function hasDraft() {
    try {
      return Boolean(window.localStorage && window.localStorage.getItem(STORAGE_KEY));
    } catch (error) {
      return false;
    }
  }

  function clearDraft() {
    if (window.localStorage) window.localStorage.removeItem(STORAGE_KEY);
  }

  ns.project = {
    build,
    parse,
    filename,
    saveDraft,
    loadDraft,
    hasDraft,
    clearDraft,
    slugify
  };
})(window.GhanaGrid = window.GhanaGrid || {});
