/* Prueba conexión Supabase: node scripts/verify-supabase.cjs
 * Carga .env.local desde la carpeta del proyecto (no usa el CWD de npm).
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function finish(code) {
  // Evita en Windows/Node: UV_HANDLE_CLOSING (async cerrando mientras process.exit mata el proceso)
  setTimeout(() => process.exit(code), 80);
}

const envPath = path.resolve(path.join(__dirname, "..", ".env.local"));
if (!fs.existsSync(envPath)) {
  console.error("No existe:", envPath);
  process.exit(1);
}
let raw = fs.readFileSync(envPath, "utf8");
if (raw.charCodeAt(0) === 0xfeff) {
  raw = raw.slice(1);
}

function loadEnvBlock(text) {
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const i = trimmed.indexOf("=");
    if (i === -1) {
      continue;
    }
    const k = trimmed.slice(0, i).trim();
    const v = trimmed.slice(i + 1);
    if (k) {
      process.env[k] = v.trim();
    }
  }
}

loadEnvBlock(raw);

let url = (process.env.SUPABASE_URL || "").trim();
let key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

if (!url || !key) {
  const mUrl = raw.match(/^\s*SUPABASE_URL=(\S*)\s*$/m);
  const mKey = raw.match(/^\s*SUPABASE_SERVICE_ROLE_KEY=(.*)$/m);
  if (mUrl && mUrl[1]) {
    url = mUrl[1].trim();
  }
  if (mKey && mKey[1]) {
    key = mKey[1].trim();
  }
}

if (!url || !key) {
  const st = fs.statSync(envPath);
  console.error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  console.error("Archivo leído:", envPath);
  console.error("Tamaño (bytes):", st.size);
  const hasNameUrl = /^\s*SUPABASE_URL\s*=/m.test(raw);
  const hasNameKey = /^\s*SUPABASE_SERVICE_ROLE_KEY\s*=/m.test(raw);
  console.error("Línea SUPABASE_URL presente:", hasNameUrl);
  console.error("Línea SUPABASE_SERVICE_ROLE_KEY presente:", hasNameKey);
  if (hasNameUrl) {
    const line = raw.split(/\r?\n/).find((l) => /^\s*SUPABASE_URL\s*=/.test(l));
    if (line) {
      const afterEq = line.replace(/^\s*SUPABASE_URL\s*=\s*/, "");
      console.error("Longitud del valor de SUPABASE_URL (caracteres):", afterEq.length);
    }
  }
  if (hasNameKey) {
    const line = raw.split(/\r?\n/).find((l) => /^\s*SUPABASE_SERVICE_ROLE_KEY\s*=/.test(l));
    if (line) {
      const afterEq = line.replace(/^\s*SUPABASE_SERVICE_ROLE_KEY\s*=\s*/, "");
      console.error("Longitud del valor de SUPABASE_SERVICE_ROLE_KEY (caracteres):", afterEq.length);
    }
  }
  if (hasNameUrl && hasNameKey) {
    const u = raw.split(/\r?\n/).find((l) => /^\s*SUPABASE_URL\s*=/.test(l));
    const k = raw.split(/\r?\n/).find((l) => /^\s*SUPABASE_SERVICE_ROLE_KEY\s*=/.test(l));
    if (u && k && u.replace(/^\s*SUPABASE_URL\s*=\s*/, "").length === 0) {
      console.error(
        "\nAviso: en el .env.local GUARDADO en disco, SUPABASE_URL y la service role están vacías (solo 'clave=' sin texto después del =)."
      );
      console.error("Pega el valor en la misma línea, sin comillas, y guarda el archivo (Ctrl+S), luego vuelve a ejecutar.\n");
    }
  }
  finish(1);
}

const BUCKET_KEY = "SUPABASE_STORAGE_BUCKET=";

function readBucketNameFromFile(text) {
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (t.startsWith(BUCKET_KEY)) {
      return t.slice(BUCKET_KEY.length).trim();
    }
  }
  return "";
}

// 1) Misma lectura explícita que usas tú (evita regres raros, BOM, o cosas inyectadas en process.env)
// 2) Tras `loadEnvBlock` ya rellenó process.env; respaldo
// 3) defecto group-media
const bucketFromFile = readBucketNameFromFile(raw);
const bucketFromEnv = (process.env.SUPABASE_STORAGE_BUCKET || "").trim();
const bucketExpected = bucketFromFile || bucketFromEnv || "group-media";

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false }
});

supabase.storage
  .listBuckets()
  .then(({ data, error }) => {
    if (error) {
      console.error("Error API:", error.message);
      return finish(1);
    }
    const names = (data || []).map((b) => b.name);
    console.log("Conexión OK — buckets:", names.length ? names.join(", ") : "(ninguno)");
    console.log("Bucket comprobado (env/archivo):", bucketExpected);
    const has = names.some((n) => n === bucketExpected || n.toLowerCase() === bucketExpected.toLowerCase());
    if (has) {
      console.log("Bucket OK:", bucketExpected, "(igual que SUPABASE_STORAGE_BUCKET o por defecto group-media)");
    } else {
      console.warn(
        "Aviso: no existe un bucket llamado",
        JSON.stringify(bucketExpected) + "."
      );
      console.warn(
        "Crealo en Storage o añade en .env.local: SUPABASE_STORAGE_BUCKET=NombreDeTuBucket (ej. NitroGroups)"
      );
    }
    return finish(0);
  })
  .catch((e) => {
    console.error("Fallo:", e.message);
    return finish(1);
  });
