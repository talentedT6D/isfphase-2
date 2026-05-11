// Probes every .mp4 under public/submissions(-set-*) with ffprobe and
// writes scripts/durations.json — a map from the file's web URL (the
// same string used in playlist.generated.ts) to its duration in
// seconds (float, 3 decimals).
//
// The generator reads that JSON and bakes durations into each Video,
// so Vercel doesn't need ffmpeg at build time.
//
// Re-run when videos are added or replaced:
//   node scripts/probe-durations.mjs

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const SUB_DIRS = [
  "public/submissions",
  "public/submissions-set-2",
  "public/submissions-set-3",
  "public/submissions-set-4",
];
const OUT = "scripts/durations.json";

function listVideos(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const folder of fs.readdirSync(dir)) {
    const full = path.join(dir, folder);
    if (!fs.statSync(full).isDirectory()) continue;
    for (const f of fs.readdirSync(full)) {
      if (/\.mp4$/i.test(f)) {
        const fsPath = path.join(full, f);
        const urlBase = dir.replace(/^public\//, "");
        const url = `/${urlBase
          .split("/")
          .map(encodeURIComponent)
          .join("/")}/${encodeURIComponent(folder)}/${encodeURIComponent(f)}`;
        out.push({ fsPath, url });
      }
    }
  }
  return out;
}

function probeSeconds(fsPath) {
  try {
    const stdout = execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=nw=1:nk=1",
        fsPath,
      ],
      { encoding: "utf8" }
    );
    const s = parseFloat(stdout.trim());
    return Number.isFinite(s) ? Math.round(s * 1000) / 1000 : null;
  } catch (err) {
    console.warn(`[durations] ffprobe failed for ${fsPath}: ${err.message}`);
    return null;
  }
}

const all = SUB_DIRS.flatMap(listVideos);
console.log(`[durations] probing ${all.length} files`);

const existing = fs.existsSync(OUT)
  ? JSON.parse(fs.readFileSync(OUT, "utf8"))
  : {};
const out = { ...existing };

let probed = 0;
let cached = 0;
for (const { fsPath, url } of all) {
  if (typeof out[url] === "number") {
    cached++;
    continue;
  }
  const s = probeSeconds(fsPath);
  if (s != null) {
    out[url] = s;
    probed++;
  }
}

// Drop entries for files no longer in the tree
const liveUrls = new Set(all.map((a) => a.url));
let pruned = 0;
for (const k of Object.keys(out)) {
  if (!liveUrls.has(k)) {
    delete out[k];
    pruned++;
  }
}

fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
console.log(
  `[durations] wrote ${OUT} — probed ${probed}, cached ${cached}, pruned ${pruned}, total ${Object.keys(out).length}`
);
