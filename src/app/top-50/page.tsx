"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  PLAYLIST_SET_1,
  PLAYLIST_SET_2,
  PLAYLIST_SET_3,
  type Video,
} from "@/lib/videos";
import { useAllVideoRatings } from "@/hooks/useRatings";

interface RankedEntry {
  rank: number;
  video: Video;
  set: "Set 1" | "Set 2" | "Set 3";
  avgScore: number;
  totalVotes: number;
  lastJudgedAt: string | null;
}

const TOP_N = 50;

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildCsv(rows: RankedEntry[]): string {
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
  for (const r of rows) {
    lines.push(
      [
        r.rank,
        r.video.title,
        r.video.name ?? "",
        r.video.phone ?? "",
        r.video.creator ?? "",
        r.video.category ?? "",
        r.set,
        r.avgScore,
        r.totalVotes,
        r.video.email ?? "",
        r.video.id,
        r.video.url,
      ]
        .map(csvEscape)
        .join(",")
    );
  }
  return lines.join("\n") + "\n";
}

export default function Top50Page() {
  const { entries, loading } = useAllVideoRatings();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const ranked: RankedEntry[] = useMemo(() => {
    const allVideos = [
      ...PLAYLIST_SET_1.map((v) => ({ video: v, set: "Set 1" as const })),
      ...PLAYLIST_SET_2.map((v) => ({ video: v, set: "Set 2" as const })),
      ...PLAYLIST_SET_3.map((v) => ({ video: v, set: "Set 3" as const })),
    ];
    const byId = new Map(entries.map((e) => [e.videoId, e]));

    const merged = allVideos
      .map(({ video, set }) => {
        const stat = byId.get(video.id);
        return {
          video,
          set,
          avgScore: stat?.avgScore ?? 0,
          totalVotes: stat?.totalVotes ?? 0,
          lastJudgedAt: stat?.lastJudgedAt ?? null,
        };
      })
      .filter((r) => r.totalVotes > 0)
      .sort((a, b) => {
        if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore;
        if (b.totalVotes !== a.totalVotes) return b.totalVotes - a.totalVotes;
        return a.video.title.localeCompare(b.video.title);
      })
      .slice(0, TOP_N)
      .map((r, i) => ({ ...r, rank: i + 1 }));

    return merged;
  }, [entries]);

  const downloadCsv = () => {
    const csv = buildCsv(ranked);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 10);
    a.download = `isf-top-${ranked.length}-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#5a0404] relative">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 110% 90% at 50% 60%, #d41414 0%, #a80c0c 45%, #6a0606 80%, #3a0202 100%)",
        }}
      />
      <div className="absolute inset-0 grain-overlay opacity-10 pointer-events-none" />

      <header className="relative z-10 flex items-center justify-between gap-4 px-4 sm:px-10 pt-4 sm:pt-6 pb-3 flex-wrap">
        <Link href="/" className="shrink-0">
          <img
            src="/isf-horizontal-logo.png"
            alt="Indian Scroll Festival"
            className="h-7 sm:h-10 w-auto"
          />
        </Link>
        <div
          className="text-white text-xl sm:text-3xl tracking-[0.25em] font-black"
          style={{ fontFamily: '"obviously-wide", "obviously", sans-serif' }}
        >
          TOP {TOP_N}
        </div>
        <button
          onClick={downloadCsv}
          disabled={ranked.length === 0}
          className="px-5 py-2.5 rounded-full bg-[#e8d44d] text-[#8b0000] text-[11px] font-black tracking-[0.2em] hover:bg-[#f0dc5a] disabled:opacity-40 transition-colors flex items-center gap-2"
          title="Download top 50 as CSV"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          DOWNLOAD CSV
        </button>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 pb-16">
        <div className="text-[#e8d44d]/70 text-xs tracking-[0.2em] font-bold mb-6">
          {loading
            ? "LOADING…"
            : `SHOWING ${ranked.length} ${ranked.length === 1 ? "ENTRY" : "ENTRIES"} • RANKED BY AVERAGE SCORE`}
        </div>

        {!loading && ranked.length === 0 && (
          <div className="text-center py-20">
            <div className="text-[#e8d44d]/60 text-sm tracking-wider">
              No ratings yet. Once judges start scoring, the top {TOP_N} will appear here.
            </div>
          </div>
        )}

        <ol className="space-y-3">
          {ranked.map((r) => {
            const isOpen = expandedId === r.video.id;
            return (
              <li
                key={r.video.id}
                className="border border-[#e8d44d]/20 rounded-lg bg-black/30 backdrop-blur-sm overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(isOpen ? null : r.video.id)}
                  className="w-full flex items-center gap-3 sm:gap-5 px-3 sm:px-5 py-3 sm:py-4 text-left hover:bg-[#e8d44d]/5 transition-colors"
                >
                  <div className="text-[#e8d44d] text-2xl sm:text-3xl font-black tabular-nums w-10 sm:w-14 shrink-0 italic">
                    {String(r.rank).padStart(2, "0")}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-white text-base sm:text-lg font-black tracking-wide truncate">
                        {r.video.title}
                      </h3>
                      <span className="text-[9px] sm:text-[10px] tracking-[0.15em] font-bold px-2 py-0.5 rounded-full border border-[#e8d44d]/40 text-[#e8d44d]/80 shrink-0">
                        {r.set.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-white/70 text-xs font-bold tracking-wider mt-0.5 truncate">
                      {r.video.name ?? r.video.creator ?? "—"}
                      {r.video.phone ? (
                        <span className="text-[#e8d44d]/70 ml-2 font-mono">
                          · {r.video.phone}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-[#e8d44d] text-2xl sm:text-3xl font-black tabular-nums leading-none">
                      {r.avgScore}
                      <span className="text-[#e8d44d]/50 text-sm font-bold">/100</span>
                    </div>
                    <div className="text-[#e8d44d]/60 text-[10px] tracking-[0.15em] font-bold mt-1">
                      {r.totalVotes} {r.totalVotes === 1 ? "VOTE" : "VOTES"}
                    </div>
                  </div>

                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={`text-[#e8d44d]/60 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {isOpen && (
                  <div className="border-t border-[#e8d44d]/15 px-3 sm:px-5 py-4 grid gap-4 sm:grid-cols-[auto_1fr] sm:gap-6 bg-black/20">
                    <div className="w-full sm:w-[180px] aspect-[9/16] bg-black rounded-md overflow-hidden mx-auto sm:mx-0">
                      <video
                        src={r.video.url}
                        className="w-full h-full object-contain"
                        controls
                        playsInline
                        preload="metadata"
                      />
                    </div>
                    <dl className="text-sm space-y-2 self-start">
                      <InfoRow label="Title" value={r.video.title} />
                      <InfoRow label="Name" value={r.video.name ?? "—"} />
                      <InfoRow
                        label="Phone"
                        value={
                          r.video.phone ? (
                            <a
                              href={`tel:${r.video.phone}`}
                              className="text-[#e8d44d] underline font-mono"
                            >
                              {r.video.phone}
                            </a>
                          ) : (
                            "—"
                          )
                        }
                      />
                      <InfoRow
                        label="Email"
                        value={
                          r.video.email ? (
                            <a
                              href={`mailto:${r.video.email}`}
                              className="text-[#e8d44d] underline break-all"
                            >
                              {r.video.email}
                            </a>
                          ) : (
                            "—"
                          )
                        }
                      />
                      <InfoRow label="Instagram" value={r.video.creator ?? "—"} />
                      <InfoRow label="Category" value={r.video.category ?? "—"} />
                      <InfoRow label="Set" value={r.set} />
                      <InfoRow label="Average score" value={`${r.avgScore} / 100`} />
                      <InfoRow label="Vote count" value={String(r.totalVotes)} />
                      <InfoRow label="Video ID" value={r.video.id} mono />
                      <InfoRow
                        label="URL"
                        value={
                          <a
                            href={r.video.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#e8d44d] underline break-all"
                          >
                            {r.video.url}
                          </a>
                        }
                      />
                    </dl>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </main>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[110px_1fr] sm:grid-cols-[140px_1fr] gap-3 items-baseline">
      <dt className="text-[#e8d44d]/60 text-[10px] tracking-[0.2em] font-bold uppercase">
        {label}
      </dt>
      <dd className={`text-white/90 ${mono ? "font-mono text-xs" : ""} break-words`}>
        {value}
      </dd>
    </div>
  );
}
