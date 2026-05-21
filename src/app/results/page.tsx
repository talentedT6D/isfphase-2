import type { Metadata } from "next";
import { LEADERBOARD } from "@/lib/leaderboard";

export const metadata: Metadata = {
  title: "ISF 2026 — Full Leaderboard",
  description: "Indian Scroll Festival 2026 results, ranked by average score.",
};

const medalColor = (rank: number) => {
  if (rank === 1) return "#e8d44d";
  if (rank === 2) return "#d9d9d9";
  if (rank === 3) return "#cd7f32";
  return "rgba(232,212,77,0.55)";
};

export default function ResultsPage() {
  return (
    <div className="min-h-screen bg-[#5a0404] relative overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 110% 90% at 50% 30%, #d41414 0%, #a80c0c 45%, #6a0606 80%, #3a0202 100%)",
        }}
      />
      <div className="absolute inset-0 grain-overlay opacity-10" />

      <header className="relative z-10 flex items-center justify-between px-4 sm:px-10 pt-4 sm:pt-6 pb-2 sm:pb-3">
        <img
          src="/isf-horizontal-logo.png"
          alt="Indian Scroll Festival"
          className="h-7 sm:h-10 w-auto"
        />
        <div
          className="text-white text-lg sm:text-2xl tracking-[0.2em]"
          style={{
            fontFamily: '"obviously-wide", "obviously", sans-serif',
            fontWeight: 500,
          }}
        >
          LEADERBOARD
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        <div className="text-center pt-6 pb-8">
          <h1
            className="text-[#e8d44d] text-2xl sm:text-4xl tracking-[0.15em]"
            style={{
              fontFamily: '"obviously-wide", "obviously", sans-serif',
              fontWeight: 600,
            }}
          >
            ISF 2026 — FULL LEADERBOARD
          </h1>
          <p className="text-[#e8d44d]/70 text-xs sm:text-sm tracking-[0.25em] mt-2">
            RANKED BY AVG SCORE
          </p>
        </div>

        {/* Column headers (desktop) */}
        <div className="hidden md:grid grid-cols-[3rem_3.5rem_1fr_12rem_7rem_5rem_5rem] gap-3 px-4 pb-2 text-[#e8d44d]/60 text-[11px] tracking-[0.2em] uppercase">
          <span>Rank</span>
          <span>Reel</span>
          <span>Title</span>
          <span>Creator</span>
          <span>Category</span>
          <span className="text-right">Votes</span>
          <span className="text-right">Avg</span>
        </div>

        <ol className="space-y-2">
          {LEADERBOARD.map((entry) => (
            <li key={entry.rank}>
              <a
                href={entry.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="grid grid-cols-[2.5rem_1fr_4rem] md:grid-cols-[3rem_3.5rem_1fr_12rem_7rem_5rem_5rem] gap-2 md:gap-3 items-center
                           px-4 py-3 rounded-2xl border border-[#e8d44d]/20 bg-black/20 backdrop-blur-sm
                           hover:border-[#e8d44d]/60 hover:bg-black/30 transition-colors"
              >
                <span
                  className="text-lg sm:text-xl tabular-nums font-semibold"
                  style={{ color: medalColor(entry.rank) }}
                >
                  {entry.rank}
                </span>

                <span className="hidden md:block text-[#e8d44d]/70 text-sm tabular-nums">
                  #{entry.reel}
                </span>

                <span className="min-w-0">
                  <span className="block text-white text-sm sm:text-base truncate">
                    {entry.title}
                  </span>
                  {/* mobile-only meta */}
                  <span className="md:hidden block text-[#e8d44d]/70 text-xs truncate">
                    {entry.creator} · {entry.category} · #{entry.reel}
                  </span>
                </span>

                <span className="hidden md:block text-[#e8d44d]/90 text-sm truncate">
                  {entry.creator}
                </span>

                <span className="hidden md:block text-[#e8d44d]/70 text-xs tracking-wider uppercase truncate">
                  {entry.category}
                </span>

                <span className="hidden md:block text-right text-white text-sm tabular-nums">
                  {entry.totalVotes}
                </span>

                <span className="text-right text-[#e8d44d] text-sm sm:text-base tabular-nums font-semibold">
                  {entry.avgScore !== null ? entry.avgScore.toFixed(1) : "N/A"}
                </span>
              </a>
            </li>
          ))}
        </ol>

        <p className="text-center text-[#e8d44d]/50 text-xs tracking-[0.2em] mt-8">
          TAP ANY ENTRY TO WATCH THE REEL
        </p>
      </main>
    </div>
  );
}
