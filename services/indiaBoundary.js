const path = require("path");
const shapefile = require("shapefile");
const booleanPointInPolygon = require("@turf/boolean-point-in-polygon").default;
const { point } = require("@turf/helpers");
const simplify = require("@turf/simplify").default;

const SHAPEFILE_PATH = path.join(
  __dirname,
  "..",
  "India_Taluk_updated",
  "IND_Taluk.shp"
);
const PDF_STATE_BOUNDARY_PATH = path.join(__dirname, "..", "STATE_BOUNDARY.shp");

let polygonsPromise;
let mapGeoJsonPromise;
let pdfStateBoundaryPromise;

function geometryBounds(geometry) {
  const bounds = [Infinity, Infinity, -Infinity, -Infinity];

  function visit(coordinates) {
    if (typeof coordinates[0] === "number") {
      const [longitude, latitude] = coordinates;
      bounds[0] = Math.min(bounds[0], longitude);
      bounds[1] = Math.min(bounds[1], latitude);
      bounds[2] = Math.max(bounds[2], longitude);
      bounds[3] = Math.max(bounds[3], latitude);
      return;
    }
    coordinates.forEach(visit);
  }

  visit(geometry.coordinates);
  return bounds;
}

async function loadPolygons() {
  const features = [];
  const source = await shapefile.open(SHAPEFILE_PATH);

  while (true) {
    const result = await source.read();
    if (result.done) break;

    const geometry = result.value.geometry;
    if (
      geometry &&
      (geometry.type === "Polygon" || geometry.type === "MultiPolygon")
    ) {
      const feature = { type: "Feature", properties: {}, geometry };
      features.push({ feature, bounds: geometryBounds(feature.geometry) });
    }
  }

  if (features.length === 0) {
    throw new Error(`No polygon geometry found in ${SHAPEFILE_PATH}`);
  }

  console.log(`Loaded ${features.length} India taluk polygons for coordinate validation`);
  return features;
}

function getPolygons() {
  if (!polygonsPromise) {
    polygonsPromise = loadPolygons().catch((error) => {
      polygonsPromise = undefined;
      throw error;
    });
  }
  return polygonsPromise;
}

function parseCoordinates(latitude, longitude) {
  const lat = Number(latitude);
  const lon = Number(longitude);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    return null;
  }

  return { lat, lon };
}

async function isPointInIndia(latitude, longitude) {
  const coordinates = parseCoordinates(latitude, longitude);
  if (!coordinates) return false;

  const { lat, lon } = coordinates;
  const candidatePoint = point([lon, lat]);
  const polygons = await getPolygons();

  return polygons.some(({ feature, bounds }) => {
    if (
      lon < bounds[0] ||
      lat < bounds[1] ||
      lon > bounds[2] ||
      lat > bounds[3]
    ) {
      return false;
    }
    return booleanPointInPolygon(candidatePoint, feature);
  });
}

async function getIndiaGeoJson() {
  if (!mapGeoJsonPromise) {
    mapGeoJsonPromise = getPolygons().then((polygons) => ({
      type: "FeatureCollection",
      // Use the full-resolution polygons for validation and lighter geometry for display.
      features: polygons.map(({ feature }) =>
        simplify(feature, { tolerance: 0.01, highQuality: false })
      ),
    }));
  }
  return mapGeoJsonPromise;
}

async function getPdfStateBoundaryGeoJson() {
  if (!pdfStateBoundaryPromise) {
    pdfStateBoundaryPromise = (async () => {
      const features = [];
      const source = await shapefile.open(PDF_STATE_BOUNDARY_PATH);
      while (true) {
        const result = await source.read();
        if (result.done) break;
        const geometry = result.value.geometry;
        if (geometry && (geometry.type === "Polygon" || geometry.type === "MultiPolygon")) {
          features.push(simplify(
            { type: "Feature", properties: {}, geometry },
            { tolerance: 0.005, highQuality: false }
          ));
        }
      }
      if (features.length === 0) {
        throw new Error(`No polygon geometry found in ${PDF_STATE_BOUNDARY_PATH}`);
      }
      return { type: "FeatureCollection", features };
    })().catch((error) => {
      pdfStateBoundaryPromise = undefined;
      throw error;
    });
  }
  return pdfStateBoundaryPromise;
}

module.exports = {
  getIndiaGeoJson,
  getPdfStateBoundaryGeoJson,
  getPolygons,
  isPointInIndia,
  parseCoordinates,
};
