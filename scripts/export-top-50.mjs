// Pulls every rating from Supabase, joins it against the generated
// playlist, and writes the top 50 entries (highest average score) to
// top-50.csv at the repo root.
//
// Usage:
//   node scripts/export-top-50.mjs
//
// Reads SUPABASE_URL / SUPABASE_ANON_KEY (or NEXT_PUBLIC_*) from env.
// Falls back to the hard-coded values in src/lib/supabase.ts.
//
// Sort order: average_score DESC, then vote_count DESC, then title ASC.
// All entries are exported (top 50 capped); ties broken deterministically.

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const SESSION_ID = "session-1";
const TOP_N = 50;
const OUT = "top-50.csv";

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://qvbsmpwvyrxkgzptwyhj.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2YnNtcHd2eXJ4a2d6cHR3eWhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNDQxMTMsImV4cCI6MjA5MDkyMDExM30.g7lPGRaW8sdQ9LFACdvc9UWgAhGGOazIIKB4ZWJyxGE";

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function loadPlaylist() {
  // Make sure the playlist module is fresh before importing.
  const playlistPath = path.resolve("src/lib/playlist.generated.ts");
  if (!fs.existsSync(playlistPath)) {
    throw new Error(
      `Playlist not generated. Run: node scripts/generate-playlist.mjs`
    );
  }
  // The generated file is TypeScript — parse the JSON arrays out of it
  // directly so we don't need a TS toolchain in the script.
  const src = fs.readFileSync(playlistPath, "utf8");
  const sets = [
    { name: "PLAYLIST_SET_1", label: "Set 1" },
    { name: "PLAYLIST_SET_2", label: "Set 2" },
    { name: "PLAYLIST_SET_3", label: "Set 3" },
  ];
  const all = [];
  for (const { name, label } of sets) {
    const re = new RegExp(
      `export const ${name}: Video\\[\\] = (\\[[\\s\\S]*?\\]);`,
      "m"
    );
    const m = src.match(re);
    if (!m) {
      console.warn(`[top-50] could not parse ${name} from playlist`);
      continue;
    }
    const arr = JSON.parse(m[1]);
    for (const v of arr) {
      all.push({ ...v, set: label });
    }
  }
  return all;
}

async function fetchAllRatings(client) {
  // Page through every rating row for the session.
  const PAGE = 1000;
  const out = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client
      .from("ratings")
      .select("video_id, rating")
      .eq("session_id", SESSION_ID)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Supabase error: ${error.message}`);
    if (!data || data.length === 0) break;
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

function aggregate(ratings) {
  const byVideo = new Map();
  for (const r of ratings) {
    const cur = byVideo.get(r.video_id) || { sum: 0, count: 0 };
    cur.sum += Number(r.rating) || 0;
    cur.count += 1;
    byVideo.set(r.video_id, cur);
  }
  const out = {};
  for (const [id, { sum, count }] of byVideo) {
    out[id] = {
      averageRating: count > 0 ? sum / count : 0,
      voteCount: count,
    };
  }
  return out;
}

async function main() {
  const playlist = loadPlaylist();
  console.log(`[top-50] loaded ${playlist.length} videos from playlist`);

  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const ratings = await fetchAllRatings(client);
  console.log(`[top-50] fetched ${ratings.length} rating rows`);

  const stats = aggregate(ratings);

  const rows = playlist.map((v) => {
    const s = stats[v.id] || { averageRating: 0, voteCount: 0 };
    return {
      id: v.id,
      title: v.title,
      creator: v.creator || "",
      name: v.name || "",
      phone: v.phone || "",
      email: v.email || "",
      category: v.category || "",
      set: v.set,
      average_score: Math.round(s.averageRating * 100) / 100,
      vote_count: s.voteCount,
      url: v.url,
    };
  });

  rows.sort((a, b) => {
    if (b.average_score !== a.average_score)
      return b.average_score - a.average_score;
    if (b.vote_count !== a.vote_count) return b.vote_count - a.vote_count;
    return a.title.localeCompare(b.title);
  });

  const top = rows.slice(0, TOP_N);

  const header = [
    "rank",
    "title",
    "name",
    "phone",
    "creator",
    "category",
    "set",
    "average_score",
    "vote_count",
    "email",
    "video_id",
    "url",
  ];
  const lines = [header.join(",")];
  top.forEach((r, i) => {
    lines.push(
      [
        i + 1,
        r.title,
        r.name ?? "",
        r.phone ?? "",
        r.creator,
        r.category ?? "",
        r.set,
        r.average_score,
        r.vote_count,
        r.email ?? "",
        r.id,
        r.url,
      ]
        .map(csvEscape)
        .join(",")
    );
  });

  fs.writeFileSync(OUT, lines.join("\n") + "\n");
  console.log(`[top-50] wrote ${top.length} rows to ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
