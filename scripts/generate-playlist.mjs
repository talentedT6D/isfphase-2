// Reads each public/submissions/<folder>/info.txt + an .mp4 file in that
// folder, and writes a generated TypeScript module that the rest of the
// app imports as the PLAYLIST. Runs as a pre-step before `next dev` and
// `next build`.
//
// Two source directories are scanned independently so the app can toggle
// between them:
//   public/submissions         → PLAYLIST_SET_1
//   public/submissions-set-2   → PLAYLIST_SET_2
//
// info.txt is plain text with one "Key: Value" per line, optionally
// surrounded by separator lines like "-------------------".
// Recognised keys: Name, Title, Category, Email, Instagram, Submitted At, Source URL.

import fs from "node:fs";
import path from "node:path";

// Optional roster CSV — used to enrich each entry with the submitter's
// real name and phone number (kept out of the public info.txt files).
// Match is by submission title (lowercased + trimmed). Missing matches
// just leave the fields null.
const ROSTER_CSV = "public/submissions_rows (4200).csv";

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(cur);
      cur = "";
    } else if (c === "\n") {
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
    } else if (c === "\r") {
      // skip
    } else {
      cur += c;
    }
  }
  if (cur.length > 0 || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

function loadRoster() {
  if (!fs.existsSync(ROSTER_CSV)) {
    console.warn(`[playlist] ${ROSTER_CSV} not found — name/phone fields will be empty`);
    return new Map();
  }
  const rows = parseCsv(fs.readFileSync(ROSTER_CSV, "utf8"));
  if (rows.length < 2) return new Map();
  const header = rows[0].map((h) => h.trim());
  const idx = (k) => header.indexOf(k);
  const tIdx = idx("submission_title");
  const nIdx = idx("name");
  const pIdx = idx("contact");
  const eIdx = idx("email");
  const cIdx = idx("category");
  const map = new Map();
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;
    const title = (r[tIdx] || "").trim().toLowerCase();
    if (!title) continue;
    map.set(title, {
      name: (r[nIdx] || "").trim() || null,
      phone: (r[pIdx] || "").trim() || null,
      email: (r[eIdx] || "").trim() || null,
      category: (r[cIdx] || "").trim() || null,
    });
  }
  console.log(`[playlist] loaded ${map.size} roster rows from ${ROSTER_CSV}`);
  return map;
}

const ROSTER = loadRoster();

const SETS = [
  { name: "PLAYLIST_SET_1", dir: "public/submissions" },
  { name: "PLAYLIST_SET_2", dir: "public/submissions-set-2" },
  { name: "PLAYLIST_SET_3", dir: "public/submissions-set-3" },
  { name: "PLAYLIST_SET_4", dir: "public/submissions-set-4" },
];
const OUT = "src/lib/playlist.generated.ts";

function parseInfoTxt(text) {
  const out = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || /^-{3,}$/.test(line)) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key) out[key] = value;
  }
  return out;
}

function pickVideoFile(dir) {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir);
  const mp4 = files.find((f) => /\.mp4$/i.test(f));
  return mp4 ?? null;
}

function buildPlaylist(srcDir) {
  if (!fs.existsSync(srcDir)) {
    console.warn(`[playlist] ${srcDir} does not exist; skipping`);
    return [];
  }
  const folders = fs
    .readdirSync(srcDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  const seenIds = new Set();
  return folders.flatMap((folder) => {
    const dir = path.join(srcDir, folder);
    const infoPath = path.join(dir, "info.txt");
    const videoFile = pickVideoFile(dir);

    if (!fs.existsSync(infoPath)) {
      console.warn(`[playlist] ${srcDir}/${folder}: missing info.txt, skipping`);
      return [];
    }
    if (!videoFile) {
      console.warn(`[playlist] ${srcDir}/${folder}: no .mp4 in folder, skipping`);
      return [];
    }
    const info = parseInfoTxt(fs.readFileSync(infoPath, "utf8"));
    const title = (info.Title || "").trim();
    if (!title) {
      console.warn(`[playlist] ${srcDir}/${folder}: info.txt missing Title, skipping`);
      return [];
    }
    const id = folder;
    if (seenIds.has(id)) {
      console.warn(`[playlist] ${srcDir}/${folder}: duplicate id "${id}", skipping`);
      return [];
    }
    seenIds.add(id);
    const creator =
      (info.Instagram && (info.Instagram.startsWith("@") ? info.Instagram : `@${info.Instagram}`)) ||
      info.Name ||
      null;
    const roster = ROSTER.get(title.toLowerCase()) || null;
    // Strip the "public/" prefix so the URL is web-rooted.
    const urlBase = srcDir.replace(/^public\//, "");
    return [
      {
        id,
        title,
        creator,
        url: `/${urlBase.split("/").map(encodeURIComponent).join("/")}/${encodeURIComponent(folder)}/${encodeURIComponent(videoFile)}`,
        name: roster?.name ?? info.Name ?? null,
        phone: roster?.phone ?? null,
        email: roster?.email ?? info.Email ?? null,
        category: roster?.category ?? info.Category ?? null,
      },
    ];
  });
}

const banner = `// AUTO-GENERATED by scripts/generate-playlist.mjs. Do not edit.\n`;
let body = `import type { Video } from "./videos";\n\n`;
const totals = [];
for (const { name, dir } of SETS) {
  const playlist = buildPlaylist(dir);
  body += `export const ${name}: Video[] = ${JSON.stringify(playlist, null, 2)};\n\n`;
  totals.push(`${name}=${playlist.length}`);
}
// Default PLAYLIST stays as set 1 for backwards compatibility.
body += `export const PLAYLIST: Video[] = PLAYLIST_SET_1;\n`;

fs.writeFileSync(OUT, banner + body);
console.log(`[playlist] wrote ${OUT} (${totals.join(", ")})`);
