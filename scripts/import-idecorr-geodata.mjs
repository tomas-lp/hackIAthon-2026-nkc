import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import https from "node:https";
import { createClient } from "@supabase/supabase-js";

const SOURCE_URLS = {
  barrios:
    "https://geoportal.corrientes.gob.ar/geoserver/planeamiento_urbano_ide/ows",
  health_centers: "https://geoportal.corrientes.gob.ar/geoserver/salud_ide/ows",
};

const HEALTH_LAYERS = ["Hospital", "CAPS", "SAPS"];
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(scriptDirectory, "..");

function printHelp() {
  console.log(`
Importador local de datos IDECorr

Uso:
  npm run import:idecorr -- --dataset barrios --insecure-source
  npm run import:idecorr -- --dataset health_centers --insecure-source
  npm run import:idecorr -- --dataset all --from-local --stage

Opciones:
  --dataset barrios|health_centers|all  Dataset a descargar. Default: all
  --output <directorio>                Directorio de salida. Default: data/idecorr
  --insecure-source                    Solo para la fuente IDECorr con certificado roto
  --from-local                         Usa GeoJSON ya descargados en --output
  --stage                              Carga el resultado a Supabase staging
  --help                               Muestra esta ayuda

Variables requeridas solo con --stage:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
`);
}

function optionValue(args, name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function buildWfsUrl(baseUrl, typeName) {
  const url = new URL(baseUrl);
  url.search = new URLSearchParams({
    service: "WFS",
    version: "1.0.0",
    request: "GetFeature",
    typeName,
    outputFormat: "application/json",
  }).toString();
  return url;
}

async function readResponse(response, url) {
  const chunks = [];
  for await (const chunk of response) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString("utf8");
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`IDECorr respondió ${response.statusCode} para ${url}`);
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`IDECorr no devolvió JSON válido para ${url}`);
  }
}

async function fetchJson(url, allowInsecureSource) {
  if (!allowInsecureSource) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`IDECorr respondió ${response.status} para ${url}`);
    }
    return response.json();
  }

  return new Promise((resolveResponse, reject) => {
    const request = https.get(
      url,
      { rejectUnauthorized: false },
      (response) => {
        readResponse(response, url).then(resolveResponse).catch(reject);
      }
    );
    request.on("error", reject);
  });
}

function ensureFeatureCollection(payload, sourceUrl) {
  if (
    payload?.type !== "FeatureCollection" ||
    !Array.isArray(payload.features)
  ) {
    throw new Error(`Respuesta GeoJSON inválida para ${sourceUrl}`);
  }
  return payload;
}

async function fetchDataset(dataset, allowInsecureSource) {
  if (dataset === "barrios") {
    const url = buildWfsUrl(
      SOURCE_URLS.barrios,
      "planeamiento_urbano_ide:Barrios_por_Municipio"
    );
    const payload = ensureFeatureCollection(
      await fetchJson(url, allowInsecureSource),
      url
    );
    return [{ name: "barrios.geojson", url: String(url), payload }];
  }

  const layers = [];
  for (const layer of HEALTH_LAYERS) {
    const url = buildWfsUrl(SOURCE_URLS.health_centers, `salud_ide:${layer}`);
    const payload = ensureFeatureCollection(
      await fetchJson(url, allowInsecureSource),
      url
    );
    layers.push({
      name: `${layer.toLowerCase()}.geojson`,
      url: String(url),
      payload,
    });
  }
  return layers;
}

function stringValue(value) {
  if (typeof value !== "string") return null;
  const result = value.trim();
  return result.length > 0 ? result : null;
}

function numberValue(value) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeGeometry(geometry) {
  if (!geometry) return null;
  if (geometry.type === "MultiPolygon") return geometry;
  if (geometry.type === "Polygon") {
    return { type: "MultiPolygon", coordinates: [geometry.coordinates] };
  }
  return null;
}

function mapBarrio(feature, index) {
  const properties = feature.properties ?? {};
  const geometry = normalizeGeometry(feature.geometry);
  const nombre = stringValue(properties.Nombre);
  const localidad = stringValue(properties.Localidad);
  if (!nombre || !localidad || !geometry) return null;

  return {
    fuente_id: String(feature.id ?? `Barrios_por_Municipio.${index}`),
    nombre,
    localidad,
    area_ha:
      numberValue(properties["Área_Ha"]) ??
      numberValue(properties["�rea_Ha"]) ??
      numberValue(properties.area_ha),
    geometry,
    properties,
  };
}

function mapHealth(feature, layer, index) {
  const properties = feature.properties ?? {};
  const rawType = stringValue(properties.tipo)?.toUpperCase();
  const type =
    rawType === "HOSPITAL"
      ? "Hospital"
      : rawType === "CAPS"
        ? "CAPS"
        : rawType === "SAPS"
          ? "SAPS"
          : null;
  const coordinates = feature.geometry?.coordinates;
  const lon = Array.isArray(coordinates) ? numberValue(coordinates[0]) : null;
  const lat = Array.isArray(coordinates) ? numberValue(coordinates[1]) : null;

  if (
    !stringValue(properties.nombre) ||
    !["Hospital", "CAPS", "SAPS"].includes(type) ||
    lat === null ||
    lon === null ||
    feature.geometry?.type !== "Point"
  ) {
    return null;
  }

  return {
    fuente_id: String(feature.id ?? `${layer}.${index}`),
    nombre: stringValue(properties.nombre),
    tipo: type,
    departamento: stringValue(properties.depto),
    municipio: stringValue(properties.municipio),
    localidad: stringValue(properties.localidad),
    direccion: stringValue(properties.direccion),
    categoria: stringValue(properties.categoria),
    lat,
    lon,
    properties,
  };
}

function mapRows(dataset, layers) {
  if (dataset === "barrios") {
    return layers[0].payload.features
      .map((feature, index) => mapBarrio(feature, index))
      .filter(Boolean);
  }

  return layers.flatMap(({ name, payload }) => {
    const layer = name.replace(".geojson", "").toUpperCase();
    return payload.features
      .map((feature, index) => mapHealth(feature, layer, index))
      .filter(Boolean);
  });
}

async function writeDownloads(outputDirectory, dataset, layers) {
  const datasetDirectory = join(outputDirectory, dataset);
  await mkdir(datasetDirectory, { recursive: true });
  for (const layer of layers) {
    await writeFile(
      join(datasetDirectory, layer.name),
      JSON.stringify(layer.payload, null, 2),
      "utf8"
    );
  }
  return datasetDirectory;
}

async function readDownloads(outputDirectory, dataset) {
  const datasetDirectory = join(outputDirectory, dataset);
  const names =
    dataset === "barrios"
      ? ["barrios.geojson"]
      : ["hospital.geojson", "caps.geojson", "saps.geojson"];
  const layers = [];
  for (const name of names) {
    const filePath = join(datasetDirectory, name);
    let payload;
    try {
      payload = JSON.parse(await readFile(filePath, "utf8"));
    } catch (error) {
      throw new Error(
        `No se pudo leer ${filePath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    layers.push({
      name,
      url: SOURCE_URLS[dataset],
      payload: ensureFeatureCollection(payload, filePath),
    });
  }
  return layers;
}

async function createRun(supabase, dataset) {
  const { data, error } = await supabase
    .from("data_import_runs")
    .insert({
      dataset,
      fuente: "IDECorr",
      url_fuente: SOURCE_URLS[dataset],
      estado: "iniciado",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function stageRows(supabase, dataset, rows) {
  const runId = await createRun(supabase, dataset);
  try {
    const stageRpc =
      dataset === "barrios"
        ? "stage_formal_barrios"
        : "stage_idecorr_health_centers";
    const classifyRpc =
      dataset === "barrios"
        ? "classify_formal_barrios"
        : "classify_idecorr_health_centers";

    const { error: stageError } = await supabase.rpc(stageRpc, {
      p_import_run_id: runId,
      p_rows: rows,
    });
    if (stageError) throw stageError;

    const { data: summary, error: classifyError } = await supabase.rpc(
      classifyRpc,
      { p_import_run_id: runId }
    );
    if (classifyError) throw classifyError;
    return { runId, summary };
  } catch (error) {
    await supabase
      .from("data_import_runs")
      .update({ estado: "fallido", finalizado_at: new Date().toISOString() })
      .eq("id", runId);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    printHelp();
    return;
  }

  const datasetOption = optionValue(args, "--dataset", "all");
  const outputOption = optionValue(
    args,
    "--output",
    join(projectDirectory, "data", "idecorr")
  );
  const outputDirectory = resolve(projectDirectory, outputOption);
  const allowInsecureSource = args.includes("--insecure-source");
  const fromLocal = args.includes("--from-local");
  const shouldStage = args.includes("--stage");
  const datasets =
    datasetOption === "all" ? ["barrios", "health_centers"] : [datasetOption];

  if (!datasets.every((dataset) => dataset in SOURCE_URLS)) {
    throw new Error("--dataset debe ser barrios, health_centers o all");
  }
  if (allowInsecureSource) {
    console.warn(
      "ADVERTENCIA: se desactiva la validación TLS únicamente para descargar IDECorr localmente."
    );
  }

  let supabase = null;
  if (shouldStage) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        "--stage requiere SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en variables de entorno"
      );
    }
    supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  const manifest = {
    fuente: "IDECorr",
    descargado_at: new Date().toISOString(),
    tls_inseguro_solo_local: allowInsecureSource,
    datasets: {},
  };

  for (const dataset of datasets) {
    console.log(`${fromLocal ? "Leyendo" : "Descargando"} ${dataset}...`);
    const layers = fromLocal
      ? await readDownloads(outputDirectory, dataset)
      : await fetchDataset(dataset, allowInsecureSource);
    const rows = mapRows(dataset, layers);
    const directory = fromLocal
      ? join(outputDirectory, dataset)
      : await writeDownloads(outputDirectory, dataset, layers);
    const result = {
      archivos: layers.map((layer) => layer.name),
      features_recibidos: layers.reduce(
        (total, layer) => total + layer.payload.features.length,
        0
      ),
      filas_validas: rows.length,
      directorio: directory,
      urls: layers.map((layer) => layer.url),
    };

    if (shouldStage) {
      const staged = await stageRows(supabase, dataset, rows);
      result.run_id = staged.runId;
      result.summary = staged.summary;
    }

    manifest.datasets[dataset] = result;
    console.log(JSON.stringify(result, null, 2));
  }

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(
    join(outputDirectory, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8"
  );
  console.log(`Manifest guardado en ${join(outputDirectory, "manifest.json")}`);
}

main().catch((error) => {
  console.error(
    `Error: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exitCode = 1;
});
