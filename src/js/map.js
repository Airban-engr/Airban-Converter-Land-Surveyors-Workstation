(function (ns) {
  let map;
  let latestMarker;
  let batchLayer;

  function renderFallback(lat, lon, label, points) {
    const mapEl = ns.utils.byId("map");
    const bounds = ns.constants.ghanaBounds;
    const validPoints = (points || [{ lat, lon, label }]).filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon));
    const pointsMarkup = validPoints.map((point) => {
      const left = ns.utils.clampPercent(((point.lon - bounds.west) / (bounds.east - bounds.west)) * 100);
      const top = ns.utils.clampPercent((1 - ((point.lat - bounds.south) / (bounds.north - bounds.south))) * 100);
      const pointId = point.id ? `<span class="fallback-point-id" style="left: ${left}%; top: ${top}%">${ns.utils.escapeHtml(point.id)}</span>` : "";
      return `
        <span class="fallback-point" title="${ns.utils.escapeHtml(point.label || `${point.lat.toFixed(6)}, ${point.lon.toFixed(6)}`)}" style="left: ${left}%; top: ${top}%"></span>
        ${pointId}
      `;
    }).join("");
    const osmUrl = `https://www.openstreetmap.org/?mlat=${encodeURIComponent(lat)}&mlon=${encodeURIComponent(lon)}#map=14/${encodeURIComponent(lat)}/${encodeURIComponent(lon)}`;
      const summary = label || (validPoints.length > 1 ? `${validPoints.length} points plotted` : "Point");
    mapEl.classList.add("fallback-active");
    mapEl.innerHTML = `
      <div class="fallback-map-card" role="img" aria-label="Fallback map preview for ${lat.toFixed(6)}, ${lon.toFixed(6)}">
        ${pointsMarkup}
        <div class="fallback-label">
          ${ns.utils.escapeHtml(summary)}<br>
          ${lat.toFixed(6)}, ${lon.toFixed(6)}<br>
          <a href="${osmUrl}" target="_blank" rel="noopener">Open in OpenStreetMap</a>
        </div>
      </div>
    `;
  }

  function clearBatch() {
    if (batchLayer) batchLayer.clearLayers();
  }

  function clearLatest() {
    if (latestMarker) {
      latestMarker.remove();
      latestMarker = null;
    }
  }

  ns.map = {
    init() {
      if (!window.L) {
        renderFallback(7.9465, -1.0232, "Interactive map unavailable");
        return;
      }

      try {
        map = window.L.map("map", {
          zoomControl: true,
          scrollWheelZoom: true
        }).setView([7.9465, -1.0232], 7);

        window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap contributors"
        }).addTo(map);

        batchLayer = window.L.layerGroup().addTo(map);
        setTimeout(() => map && map.invalidateSize(), 120);
        setTimeout(() => map && map.invalidateSize(), 600);
      } catch (error) {
        map = null;
        renderFallback(7.9465, -1.0232, "Interactive map unavailable");
      }
    },

    clearBatch,

    updatePoint(lat, lon, label) {
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
      ns.utils.byId("map-meta").textContent = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;

      if (!map || !window.L) {
        renderFallback(lat, lon, label);
        return;
      }

      try {
        if (!latestMarker) {
          latestMarker = window.L.circleMarker([lat, lon], {
            radius: 8,
            color: "#ffffff",
            weight: 3,
            fillColor: "#b42318",
            fillOpacity: 1
          }).addTo(map);
        } else {
          latestMarker.setLatLng([lat, lon]);
        }
        latestMarker.bindPopup(ns.utils.escapeHtml(label || `${lat.toFixed(6)}, ${lon.toFixed(6)}`)).openPopup();
        map.setView([lat, lon], 13);
        setTimeout(() => map && map.invalidateSize(), 80);
      } catch (error) {
        map = null;
        renderFallback(lat, lon, label);
      }
    },

    plotPoints(points, label) {
      const validPoints = points.filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon));
      if (!validPoints.length) return;

      clearLatest();
      ns.utils.byId("map-meta").textContent = label || `${validPoints.length} CSV point${validPoints.length === 1 ? "" : "s"} plotted`;

      if (!map || !window.L) {
        renderFallback(validPoints[0].lat, validPoints[0].lon, label || `${validPoints.length} CSV points plotted`, validPoints);
        return;
      }

      if (!batchLayer) batchLayer = window.L.layerGroup().addTo(map);
      clearBatch();
      const bounds = [];
      validPoints.forEach((point) => {
        const marker = window.L.circleMarker([point.lat, point.lon], {
          radius: validPoints.length > 60 ? 4 : 6,
          color: "#ffffff",
          weight: 2,
          fillColor: "#047857",
          fillOpacity: 0.95
        }).bindPopup(ns.utils.escapeHtml(point.label || `${point.lat.toFixed(6)}, ${point.lon.toFixed(6)}`));

        if (point.id) {
          marker.bindTooltip(ns.utils.escapeHtml(point.id), {
            permanent: true,
            direction: "top",
            offset: [0, -7],
            className: "point-id-label",
            opacity: 1
          });
        }
        marker.addTo(batchLayer);
        bounds.push([point.lat, point.lon]);
      });

      if (bounds.length === 1) {
        map.setView(bounds[0], 13);
      } else {
        map.fitBounds(bounds, { padding: [28, 28], maxZoom: 15 });
      }
      setTimeout(() => map && map.invalidateSize(), 80);
    },

    plotParcel(points, label) {
      const validPoints = points.filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon));
      if (!validPoints.length) return;

      clearLatest();
      ns.utils.byId("map-meta").textContent = label || `${validPoints.length} parcel beacon${validPoints.length === 1 ? "" : "s"} plotted`;

      if (!map || !window.L) {
        renderFallback(validPoints[0].lat, validPoints[0].lon, label || `${validPoints.length} parcel beacons plotted`, validPoints);
        return;
      }

      if (!batchLayer) batchLayer = window.L.layerGroup().addTo(map);
      clearBatch();
      const latLngs = validPoints.map((point) => [point.lat, point.lon]);
      if (latLngs.length >= 3) {
        window.L.polygon(latLngs, {
          color: "#23752e",
          weight: 3,
          fillColor: "#3cae49",
          fillOpacity: 0.16
        }).addTo(batchLayer);
      }

      validPoints.forEach((point) => {
        const marker = window.L.circleMarker([point.lat, point.lon], {
          radius: 6,
          color: "#ffffff",
          weight: 2,
          fillColor: "#0f766e",
          fillOpacity: 0.95
        }).bindPopup(ns.utils.escapeHtml(point.label || `${point.id}: ${point.lat.toFixed(6)}, ${point.lon.toFixed(6)}`));

        if (point.id) {
          marker.bindTooltip(ns.utils.escapeHtml(point.id), {
            permanent: true,
            direction: "top",
            offset: [0, -7],
            className: "point-id-label",
            opacity: 1
          });
        }
        marker.addTo(batchLayer);
      });

      if (latLngs.length === 1) {
        map.setView(latLngs[0], 13);
      } else {
        map.fitBounds(latLngs, { padding: [28, 28], maxZoom: 17 });
      }
      setTimeout(() => map && map.invalidateSize(), 80);
    }
  };
})(window.GhanaGrid = window.GhanaGrid || {});
