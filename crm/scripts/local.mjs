#!/usr/bin/env node
/**
 * =============================================================================
 *  MODE LOCAL SANS DOCKER
 * =============================================================================
 *  Lance le CRM avec seulement Node.js installé :
 *   - PostgreSQL 16 « embarqué » (paquet npm embedded-postgres : vrai PostgreSQL,
 *     même version que l'image Docker, rien à installer sur le système) ;
 *   - migrations Prisma + référentiels ;
 *   - build de production Next.js (refait seulement si le code a changé) ;
 *   - ouverture du navigateur.
 *
 *  Données : dossier ./local-data (base PostgreSQL + pièces jointes).
 *  Une copie de sauvegarde de la base est faite à chaque démarrage dans
 *  ./backups/auto (les 5 dernières sont conservées).
 *
 *  Utilisation (depuis le dossier crm/) :
 *    node scripts/local.mjs          démarre (Ctrl+C pour arrêter proprement)
 *    node scripts/local.mjs demo     ajoute les données de démonstration (base vide)
 *    node scripts/local.mjs backup   sauvegarde manuelle (application arrêtée)
 *
 *  Le code de l'application est strictement le même qu'avec Docker : seule la
 *  façon de fournir PostgreSQL change. On peut passer de l'un à l'autre via
 *  une sauvegarde / restauration (voir README).
 * =============================================================================
 */
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(ROOT);

const DATA_DIR = path.join(ROOT, "local-data");
const PG_DIR = path.join(DATA_DIR, "postgres");
const STORAGE_DIR = path.join(DATA_DIR, "storage");
const SECRET_FILE = path.join(DATA_DIR, "pg-password");
const BACKUP_DIR = path.join(ROOT, "backups");
const AUTO_BACKUPS_KEPT = 5;
const PG_PORT = Number(process.env.LOCAL_PG_PORT ?? 5433);
const APP_PORT = Number(process.env.LOCAL_APP_PORT ?? process.env.APP_PORT ?? 3000);
const IS_WINDOWS = process.platform === "win32";

const info = (m) => console.log(`\x1b[1;34m▶ ${m}\x1b[0m`);
const ok = (m) => console.log(`\x1b[1;32m✔ ${m}\x1b[0m`);
function fail(m) {
  console.error(`\x1b[1;31m✖ ${m}\x1b[0m`);
  process.exit(1);
}

// -----------------------------------------------------------------------------
// Utilitaires
// -----------------------------------------------------------------------------

function stamp() {
  return new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
}

function pgPassword() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(SECRET_FILE)) {
    fs.writeFileSync(SECRET_FILE, randomBytes(16).toString("hex"), { mode: 0o600 });
  }
  return fs.readFileSync(SECRET_FILE, "utf8").trim();
}

function appEnv(extra = {}) {
  const password = pgPassword();
  const binDir = path.join(ROOT, "node_modules", ".bin");
  // Windows nomme la variable « Path » : on réutilise le nom existant pour ne pas la dupliquer.
  const pathKey = Object.keys(process.env).find((k) => k.toUpperCase() === "PATH") ?? "PATH";
  return {
    ...process.env,
    // Comme « npm run » : les outils du projet (tsx, prisma…) sont trouvés sans installation globale.
    [pathKey]: `${binDir}${path.delimiter}${process.env[pathKey] ?? ""}`,
    DATABASE_URL: `postgresql://crm:${password}@127.0.0.1:${PG_PORT}/crm?schema=public`,
    STORAGE_DRIVER: "local",
    STORAGE_LOCAL_DIR: STORAGE_DIR,
    NEXT_TELEMETRY_DISABLED: "1",
    ...extra,
  };
}

/** Exécute un binaire de node_modules/.bin (prisma, next) et échoue proprement. */
function runBin(bin, args, env, label) {
  const cmd = path.join(ROOT, "node_modules", ".bin", IS_WINDOWS ? `${bin}.cmd` : bin);
  const result = spawnSync(cmd, args, { stdio: "inherit", env, shell: IS_WINDOWS });
  // On lève une erreur (et non process.exit) pour que PostgreSQL soit arrêté proprement.
  if (result.status !== 0) throw new Error(`${label} a échoué (voir les messages ci-dessus).`);
}

function portIsFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(port, "127.0.0.1");
  });
}

function lanAddress() {
  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const a of addresses ?? []) {
      if (a.family === "IPv4" && !a.internal && !a.address.startsWith("169.254")) return a.address;
    }
  }
  return null;
}

function openBrowser(url) {
  const [cmd, args] =
    process.platform === "darwin"
      ? ["open", [url]]
      : IS_WINDOWS
        ? ["cmd", ["/c", "start", "", url]]
        : ["xdg-open", [url]];
  spawn(cmd, args, { stdio: "ignore", detached: true })
    .on("error", () => {})
    .unref();
}

/** Date de modification la plus récente d'une arborescence (pour savoir s'il faut rebuilder). */
function latestMtime(target) {
  if (!fs.existsSync(target)) return 0;
  const stat = fs.statSync(target);
  if (!stat.isDirectory()) return stat.mtimeMs;
  let max = stat.mtimeMs;
  for (const entry of fs.readdirSync(target))
    max = Math.max(max, latestMtime(path.join(target, entry)));
  return max;
}

// -----------------------------------------------------------------------------
// Pré-requis : version de Node et dépendances npm
// -----------------------------------------------------------------------------

function checkNodeVersion() {
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major < 20 || (major === 20 && minor < 18)) {
    fail(
      `Node.js ${process.versions.node} est trop ancien : installez la version LTS (22) depuis https://nodejs.org`,
    );
  }
}

/** Lance « npm install » au premier démarrage ou si package-lock.json a changé (mise à jour du code). */
function ensureDependencies() {
  const marker = path.join(ROOT, "node_modules", ".package-lock.json");
  const lock = path.join(ROOT, "package-lock.json");
  if (fs.existsSync(marker) && fs.statSync(marker).mtimeMs >= fs.statSync(lock).mtimeMs) return;
  info("Installation des dépendances (npm install, quelques minutes la première fois)…");
  const result = spawnSync(IS_WINDOWS ? "npm.cmd" : "npm", ["install", "--no-audit", "--no-fund"], {
    stdio: "inherit",
    shell: IS_WINDOWS,
  });
  if (result.status !== 0) fail("npm install a échoué (connexion Internet ?).");
}

// -----------------------------------------------------------------------------
// PostgreSQL embarqué
// -----------------------------------------------------------------------------

async function createPostgres() {
  let EmbeddedPostgres;
  try {
    ({ default: EmbeddedPostgres } = await import("embedded-postgres"));
  } catch {
    fail("Dépendances manquantes : lancez d'abord « npm install » dans le dossier crm.");
  }
  return new EmbeddedPostgres({
    databaseDir: PG_DIR,
    user: "crm",
    password: pgPassword(),
    port: PG_PORT,
    persistent: true,
    // PostgreSQL refuse de tourner en root (Linux) : un utilisateur dédié est alors créé.
    createPostgresUser: typeof process.getuid === "function" && process.getuid() === 0,
    postgresFlags: ["-c", "listen_addresses=127.0.0.1", "-c", "timezone=UTC"],
    onLog: () => {},
  });
}

/** Copie à froid du dossier de la base (PostgreSQL arrêté → copie cohérente). */
function coldBackup(targetRoot) {
  if (!fs.existsSync(path.join(PG_DIR, "PG_VERSION"))) return null;
  const target = path.join(targetRoot, `local-data-${stamp()}`);
  fs.mkdirSync(targetRoot, { recursive: true });
  fs.cpSync(DATA_DIR, target, {
    recursive: true,
    filter: (src) => !src.endsWith("postmaster.pid"),
  });
  return target;
}

function pruneAutoBackups() {
  const dir = path.join(BACKUP_DIR, "auto");
  if (!fs.existsSync(dir)) return;
  const entries = fs
    .readdirSync(dir)
    .filter((e) => e.startsWith("local-data-"))
    .sort();
  for (const old of entries.slice(0, Math.max(0, entries.length - AUTO_BACKUPS_KEPT))) {
    fs.rmSync(path.join(dir, old), { recursive: true, force: true });
  }
}

/**
 * Arrête une base restée active après une fermeture brutale (fenêtre fermée, PC en veille…).
 * Ne touche qu'à la base de CE dossier (fichier postmaster.pid), jamais à un autre PostgreSQL.
 */
async function stopOrphanPostgres() {
  if (!fs.existsSync(path.join(PG_DIR, "postmaster.pid"))) return;
  // Binaire fourni par le paquet de la plateforme (@embedded-postgres/windows-x64, darwin-arm64…).
  const pgCtl = path.join(
    ROOT,
    "node_modules",
    "@embedded-postgres",
    `${process.platform === "win32" ? "windows" : process.platform}-${process.arch}`,
    "native",
    "bin",
    IS_WINDOWS ? "pg_ctl.exe" : "pg_ctl",
  );
  if (!fs.existsSync(pgCtl)) return;
  info("Une base locale est restée active (arrêt précédent incomplet) : arrêt…");
  const asRoot = typeof process.getuid === "function" && process.getuid() === 0;
  const args = ["-D", PG_DIR, "stop", "-m", "fast", "-w"];
  // En root (Linux), embedded-postgres fait tourner PostgreSQL sous l'utilisateur « postgres ».
  if (asRoot) spawnSync("su", ["postgres", "-c", [pgCtl, ...args].join(" ")], { stdio: "ignore" });
  else spawnSync(pgCtl, args, { stdio: "ignore" });
}

async function startPostgres() {
  if (!(await portIsFree(PG_PORT))) await stopOrphanPostgres();
  if (!(await portIsFree(PG_PORT))) {
    fail(
      `Le port ${PG_PORT} est déjà utilisé : l'application est peut-être déjà lancée ` +
        `(sinon, choisissez un autre port avec la variable LOCAL_PG_PORT).`,
    );
  }
  const pg = await createPostgres();
  const firstRun = !fs.existsSync(path.join(PG_DIR, "PG_VERSION"));
  if (firstRun) {
    info("Premier lancement : initialisation de la base PostgreSQL locale…");
    await pg.initialise();
  } else {
    const backup = coldBackup(path.join(BACKUP_DIR, "auto"));
    if (backup) pruneAutoBackups();
  }
  info(`Démarrage de PostgreSQL (port ${PG_PORT}, accessible uniquement depuis ce PC)…`);
  await pg.start();
  if (firstRun) await pg.createDatabase("crm");
  return pg;
}

// -----------------------------------------------------------------------------
// Commandes
// -----------------------------------------------------------------------------

function prepareDatabase(seedDemo) {
  info("Migrations de la base…");
  runBin("prisma", ["migrate", "deploy"], appEnv(), "La migration");
  info(
    seedDemo
      ? "Données de démonstration…"
      : "Référentiels (tags, cibles de démo, vecteurs de contact)…",
  );
  runBin(
    "prisma",
    ["db", "seed"],
    appEnv({ SEED_DEMO_DATA: seedDemo ? "true" : "false" }),
    "Le seed",
  );
}

function buildIfNeeded() {
  const buildId = path.join(ROOT, ".next", "BUILD_ID");
  const standaloneServer = path.join(ROOT, ".next", "standalone", "server.js");
  const builtAt =
    fs.existsSync(buildId) && fs.existsSync(standaloneServer) ? fs.statSync(buildId).mtimeMs : 0;
  const sourcesAt = Math.max(
    ...["src", "public", "prisma", "package.json", "next.config.ts"].map((p) =>
      latestMtime(path.join(ROOT, p)),
    ),
  );
  if (builtAt > sourcesAt) return;
  info("Construction de l'application (quelques minutes la première fois)…");
  runBin("next", ["build"], appEnv(), "Le build");
  // Le serveur « standalone » a besoin des fichiers statiques à côté de lui.
  const standalone = path.join(ROOT, ".next", "standalone");
  fs.cpSync(path.join(ROOT, ".next", "static"), path.join(standalone, ".next", "static"), {
    recursive: true,
  });
  fs.cpSync(path.join(ROOT, "public"), path.join(standalone, "public"), { recursive: true });
}

function startServer() {
  const server = spawn(process.execPath, [path.join(ROOT, ".next", "standalone", "server.js")], {
    stdio: ["ignore", "inherit", "inherit"],
    env: appEnv({ NODE_ENV: "production", PORT: String(APP_PORT), HOSTNAME: "0.0.0.0" }),
    cwd: path.join(ROOT, ".next", "standalone"),
  });
  return server;
}

async function waitForApp(url) {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${url}/manifest.webmanifest`);
      if (res.ok) return true;
    } catch {
      /* pas encore prêt */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function start() {
  if (!(await portIsFree(APP_PORT))) {
    fail(
      `Le port ${APP_PORT} est déjà utilisé : le CRM est sans doute déjà ouvert dans une autre fenêtre ` +
        `(fermez-la, ou redémarrez le PC). Autre application sur ce port : utilisez LOCAL_APP_PORT=3001.`,
    );
  }
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
  const pg = await startPostgres();

  let server = null;
  let stopping = false;
  const shutdown = async (code = 0) => {
    if (stopping) return;
    stopping = true;
    info("Arrêt en cours…");
    if (server && server.exitCode === null) server.kill();
    await pg.stop().catch(() => {});
    ok("Application et base arrêtées proprement.");
    process.exit(code);
  };
  // SIGHUP : fermeture de la fenêtre de console (Windows) ou du terminal.
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(signal, () => void shutdown());

  try {
    prepareDatabase(false);
    buildIfNeeded();
  } catch (error) {
    console.error(`\x1b[1;31m✖ ${error instanceof Error ? error.message : error}\x1b[0m`);
    await shutdown(1);
    return;
  }

  server = startServer();
  server.on("exit", (code) => {
    if (!stopping) {
      console.error("Le serveur s'est arrêté de façon inattendue.");
      void shutdown(code ?? 1);
    }
  });

  const url = `http://localhost:${APP_PORT}`;
  if (!(await waitForApp(url))) {
    console.error("L'application ne répond pas (voir les messages ci-dessus).");
    await shutdown(1);
    return;
  }
  ok(`Application disponible : ${url}`);
  const ip = lanAddress();
  if (ip) ok(`Depuis un téléphone sur le même Wi-Fi : http://${ip}:${APP_PORT}`);
  console.log("\n  Laissez cette fenêtre ouverte. Ctrl+C (ou fermer la fenêtre) pour arrêter.\n");
  if (!process.env.NO_BROWSER) openBrowser(url);
}

async function demo() {
  const pg = await startPostgres();
  try {
    prepareDatabase(true);
    ok("Données de démonstration ajoutées (si la base était vide).");
  } catch (error) {
    console.error(`\x1b[1;31m✖ ${error instanceof Error ? error.message : error}\x1b[0m`);
    process.exitCode = 1;
  } finally {
    await pg.stop();
  }
}

async function backup() {
  if (!(await portIsFree(PG_PORT))) fail("Arrêtez d'abord l'application (Ctrl+C dans sa fenêtre).");
  const target = coldBackup(BACKUP_DIR);
  if (!target) fail("Aucune base locale à sauvegarder.");
  ok(`Sauvegarde : ${target}`);
}

const command = process.argv[2] ?? "start";
const commands = { start, demo, backup };
if (!commands[command]) fail(`Commande inconnue : ${command} (start, demo, backup)`);
checkNodeVersion();
ensureDependencies();
await commands[command]();
