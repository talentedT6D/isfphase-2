"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PLAYLIST } from "@/lib/videos";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  useAllVideoRatings,
  useJudgesData,
  VideoRatingEntry,
} from "@/hooks/useRatings";

type View = "summary" | "leaderboard" | "submissions" | "judges" | "categories";
const ENTRIES_PER_PAGE = 8;

export default function AdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [activeView, setActiveView] = useState<View>("summary");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expandedJudge, setExpandedJudge] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem("user-role");
    const name = localStorage.getItem("user-name");
    if (role !== "admin") {
      router.replace("/");
    } else {
      setAuthorized(true);
      setAdminName(name || "Admin");
    }
  }, [router]);

  const { entries, loading: ratingsLoading } = useAllVideoRatings();
  const { judges, loading: judgesLoading } = useJudgesData();

  const ratingsMap = useMemo(() => {
    const map: Record<string, VideoRatingEntry> = {};
    for (const e of entries) {
      map[e.videoId] = e;
    }
    return map;
  }, [entries]);

  // For each video: list of judges who scored it (with their scores + timestamps),
  // sorted highest score first.
  const videoVoters = useMemo(() => {
    const map: Record<
      string,
      { userId: string; userName: string; score: number; createdAt: string | null }[]
    > = {};
    for (const judge of judges) {
      for (const r of judge.ratings) {
        if (!map[r.videoId]) map[r.videoId] = [];
        map[r.videoId].push({
          userId: judge.userId,
          userName: judge.userName,
          score: r.score,
          createdAt: r.createdAt,
        });
      }
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => b.score - a.score);
    }
    return map;
  }, [judges]);

  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);

  const allRows = useMemo(() => {
    return PLAYLIST.map((video, index) => {
      const entry = ratingsMap[video.id];
      return {
        index: index + 1,
        videoId: video.id,
        title: video.title,
        url: video.url,
        avgScore: entry?.avgScore ?? null,
        totalVotes: entry?.totalVotes ?? 0,
        lastJudgedAt: entry?.lastJudgedAt ?? null,
        status: entry ? ("submitted" as const) : ("pending" as const),
      };
    });
  }, [ratingsMap]);

  const judgedRows = useMemo(
    () => allRows.filter((r) => r.status === "submitted"),
    [allRows]
  );

  const filteredJudgedRows = useMemo(() => {
    if (!search.trim()) return judgedRows;
    const q = search.toLowerCase();
    return judgedRows.filter((r) => r.title.toLowerCase().includes(q));
  }, [judgedRows, search]);

  const filteredSubmissions = useMemo(() => {
    if (!search.trim()) return allRows;
    const q = search.toLowerCase();
    return allRows.filter((r) => r.title.toLowerCase().includes(q));
  }, [allRows, search]);

  const filteredJudges = useMemo(() => {
    if (!search.trim()) return judges;
    const q = search.toLowerCase();
    return judges.filter((j) => j.userId.toLowerCase().includes(q));
  }, [judges, search]);

  const totalJudged = judgedRows.length;
  const overallAvg =
    totalJudged > 0
      ? Math.round(
          judgedRows.reduce((sum, r) => sum + (r.avgScore ?? 0), 0) /
            totalJudged
        )
      : 0;
  const remaining = PLAYLIST.length - totalJudged;

  const getPaginatedRows = <T,>(rows: T[]) => {
    const tp = Math.max(1, Math.ceil(rows.length / ENTRIES_PER_PAGE));
    const pr = rows.slice(
      (page - 1) * ENTRIES_PER_PAGE,
      page * ENTRIES_PER_PAGE
    );
    return { totalPages: tp, pageRows: pr };
  };

  useEffect(() => {
    setPage(1);
    setSearch("");
  }, [activeView]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const formatDateTime = (iso: string | null) => {
    if (!iso) return { date: "\u2014", time: "" };
    const d = new Date(iso);
    const date = d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const time = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return { date, time };
  };

  const exportCSV = () => {
    const header = "Entry,Title,Avg Score,Total Votes,Last Judged,Status\n";
    const rows = allRows
      .map(
        (r) =>
          `${r.index},"${r.title}",${r.avgScore ?? ""},${r.totalVotes},${r.lastJudgedAt ?? ""},${r.status}`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "judging-summary.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLogout = () => {
    localStorage.removeItem("user-role");
    localStorage.removeItem("user-name");
    router.replace("/");
  };

  if (!authorized) return null;

  const sidebarItems: {
    section: string;
    items: { key: View; label: string }[];
  }[] = [
    {
      section: "OVERVIEW",
      items: [
        { key: "summary", label: "Judging Summary" },
        { key: "leaderboard", label: "Leaderboard" },
      ],
    },
    {
      section: "MANAGE",
      items: [
        { key: "submissions", label: "Submissions" },
        { key: "judges", label: "Judges" },
        { key: "categories", label: "Categories" },
      ],
    },
  ];

  const summaryPagination = getPaginatedRows(filteredJudgedRows);
  const submissionsPagination = getPaginatedRows(filteredSubmissions);
  const judgesPagination = getPaginatedRows(filteredJudges);

  function renderPagination(totalItems: number, totalPages: number) {
    if (totalItems <= ENTRIES_PER_PAGE) return null;
    return (
      <div className="flex items-center justify-between mt-4">
        <span className="text-sm text-[#1a1a1a]/50">
          Showing {(page - 1) * ENTRIES_PER_PAGE + 1}&ndash;
          {Math.min(page * ENTRIES_PER_PAGE, totalItems)} of {totalItems}{" "}
          entries
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-[#1a1a1a]/20 text-[#1a1a1a]/50 hover:bg-[#1a1a1a]/10 disabled:opacity-30 transition-colors text-sm"
          >
            &lsaquo;
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-9 h-9 flex items-center justify-center rounded-full border text-sm transition-colors ${
                p === page
                  ? "bg-[#1a1a1a] text-[#e8d44d] border-[#1a1a1a]"
                  : "border-[#1a1a1a]/20 hover:bg-[#1a1a1a]/10"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="w-9 h-9 flex items-center justify-center rounded-full border border-[#1a1a1a]/20 text-[#1a1a1a]/50 hover:bg-[#1a1a1a]/10 disabled:opacity-30 transition-colors text-sm"
          >
            &rsaquo;
          </button>
        </div>
      </div>
    );
  }

  function renderSummaryView() {
    return (
      <>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl sm:text-5xl font-wide fw-semibold tracking-wider text-white">
              JUDGING SUMMARY
            </h1>
            <p className="text-sm text-white/70 tracking-[0.15em] mt-1 font-wide fw-light">
              {adminName.toUpperCase()}
            </p>
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#1a1a1a] text-[#e8d44d] text-[11px] font-bold tracking-[0.15em] hover:bg-[#333] transition-colors rounded"
          >
            &darr; EXPORT CSV
          </button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-3 gap-3 sm:gap-8 mb-6 sm:mb-8">
          <div>
            <div className="text-[10px] tracking-[0.2em] text-[#e8d44d]/80 mb-2 font-bold">
              TOTAL REELS JUDGED
            </div>
            <div className="text-4xl sm:text-6xl font-wide fw-semibold text-[#e8d44d] tabular-nums">
              {String(totalJudged).padStart(2, "0")}
            </div>
            <div className="text-xs text-[#e8d44d]/60 mt-1 tracking-wider font-bold">
              OF {PLAYLIST.length} ASSIGNED
            </div>
          </div>
          <div>
            <div className="text-[10px] tracking-[0.2em] text-[#e8d44d]/80 mb-2 font-bold">
              AVERAGE SCORE GIVEN
            </div>
            <div className="text-4xl sm:text-6xl font-wide fw-semibold text-[#e8d44d] tabular-nums">
              {String(overallAvg).padStart(2, "0")}
            </div>
            <div className="text-xs text-[#e8d44d]/60 mt-1 tracking-wider font-bold">
              OUT OF 100
            </div>
          </div>
          <div>
            <div className="text-[10px] tracking-[0.2em] text-[#e8d44d]/80 mb-2 font-bold">
              REELS REMAINING
            </div>
            <div className="text-4xl sm:text-6xl font-wide fw-semibold text-[#e8d44d] tabular-nums">
              {String(remaining).padStart(2, "0")}
            </div>
            <div className="text-xs text-[#e8d44d]/60 mt-1 tracking-wider font-bold">
              REMAINING
            </div>
          </div>
        </div>

        {/* Judged Entries - yellow panel */}
        <div
          className="rounded-xl p-4 sm:p-6 overflow-x-auto"
          style={{
            background:
              "linear-gradient(160deg, #f0dc5a 0%, #e8d44d 50%, #c7b33e 100%)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-wide fw-semibold tracking-[0.1em] text-[#1a1a1a]">
              JUDGED ENTRIES
            </h2>
            <span className="text-sm text-[#1a1a1a]/60 font-bold">
              {filteredJudgedRows.length} entries
            </span>
          </div>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by title or handle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-3 rounded-full border border-[#1a1a1a]/25 bg-white/40 text-sm text-[#1a1a1a] placeholder-[#1a1a1a]/40 focus:outline-none focus:border-[#1a1a1a]/60 transition-colors font-narrow fw-medium"
            />
          </div>
          <div className="min-w-[680px]">
            <div className="grid grid-cols-[60px_1fr_100px_180px_140px] px-5 py-3 border-b border-[#1a1a1a]/10 text-[10px] tracking-[0.15em] text-[#1a1a1a]/50 font-regular-w fw-semibold bg-[#1a1a1a] text-[#e8d44d]">
              <span>#</span>
              <span>ENTRY</span>
              <span className="text-center">SCORE</span>
              <span>DATE / TIME JUDGED</span>
              <span className="text-right">STATUS</span>
            </div>
            {ratingsLoading ? (
              <div className="px-5 py-8 text-center text-[#1a1a1a]/40 text-sm">
                Loading...
              </div>
            ) : summaryPagination.pageRows.length === 0 ? (
              <div className="px-5 py-8 text-center text-[#1a1a1a]/40 text-sm">
                {search ? "No entries match your search" : "No entries judged yet"}
              </div>
            ) : (
              summaryPagination.pageRows.map((row) => {
                const { date, time } = formatDateTime(row.lastJudgedAt);
                const isExpanded = expandedVideo === row.videoId;
                const voters = videoVoters[row.videoId] ?? [];
                return (
                  <div key={row.videoId}>
                    <div
                      onClick={() =>
                        setExpandedVideo(isExpanded ? null : row.videoId)
                      }
                      className={`grid grid-cols-[60px_1fr_100px_180px_140px] px-5 py-4 border-b border-[#1a1a1a]/5 items-center cursor-pointer transition-colors ${
                        isExpanded
                          ? "bg-[#1a1a1a]/10"
                          : "hover:bg-[#1a1a1a]/5"
                      }`}
                    >
                      <span className="text-sm text-[#1a1a1a]/40">
                        {String(row.index).padStart(2, "0")}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-regular-w fw-medium text-[#1a1a1a]">{row.title}</div>
                        <span className="text-[10px] text-[#1a1a1a]/50 font-bold">
                          ({row.totalVotes} {row.totalVotes === 1 ? "vote" : "votes"})
                        </span>
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          className={`text-[#1a1a1a]/50 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        >
                          <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                        </svg>
                      </div>
                      <div className="flex justify-center">
                        {row.avgScore !== null ? (
                          <span className="inline-flex items-center justify-center w-12 h-8 bg-[#1a1a1a] text-[#e8d44d] text-sm font-bold">
                            {row.avgScore}
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-12 h-8 border border-dashed border-[#1a1a1a]/20 text-[#1a1a1a]/30 text-sm">
                            &mdash;
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-[#1a1a1a]/70">
                        <div>{date}</div>
                        {time && <div className="text-[#1a1a1a]/40 text-xs">{time}</div>}
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1a1a1a] text-[#e8d44d] text-[10px] tracking-[0.1em] font-bold">
                          SUBMITTED
                        </span>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="bg-[#1a1a1a]/5 border-b border-[#1a1a1a]/5 px-5 py-4">
                        <div className="ml-[60px]">
                          <div className="text-[10px] tracking-[0.15em] text-[#1a1a1a]/60 mb-3 font-bold">
                            {voters.length} {voters.length === 1 ? "JUDGE" : "JUDGES"} SCORED {row.title.toUpperCase()}
                          </div>
                          {voters.length === 0 ? (
                            <div className="text-xs text-[#1a1a1a]/50">No votes yet.</div>
                          ) : (
                            <div className="grid grid-cols-[1fr_80px_160px] gap-y-2 text-sm">
                              <div className="text-[10px] tracking-[0.1em] text-[#1a1a1a]/50 pb-1 border-b border-[#1a1a1a]/10 font-bold">JUDGE</div>
                              <div className="text-[10px] tracking-[0.1em] text-[#1a1a1a]/50 pb-1 border-b border-[#1a1a1a]/10 text-center font-bold">SCORE</div>
                              <div className="text-[10px] tracking-[0.1em] text-[#1a1a1a]/50 pb-1 border-b border-[#1a1a1a]/10 font-bold">SUBMITTED AT</div>
                              {voters.map((v) => {
                                const rd = formatDateTime(v.createdAt);
                                return (
                                  <div key={v.userId} className="contents">
                                    <div className="py-1.5 font-bold text-[#1a1a1a]">
                                      {v.userName}
                                    </div>
                                    <div className="py-1.5 text-center">
                                      <span className="inline-flex items-center justify-center w-10 h-7 bg-[#1a1a1a] text-[#e8d44d] text-xs font-bold">
                                        {v.score}
                                      </span>
                                    </div>
                                    <div className="py-1.5 text-[#1a1a1a]/50 text-xs">
                                      {rd.date} {rd.time}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
          {renderPagination(
            filteredJudgedRows.length,
            summaryPagination.totalPages
          )}
        </div>
      </>
    );
  }

  function renderSubmissionsView() {
    return (
      <>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl sm:text-5xl font-wide fw-semibold tracking-wider text-white">
              SUBMISSIONS
            </h1>
            <p className="text-sm text-white/70 tracking-[0.15em] mt-1 font-wide fw-light">
              ALL VIDEO ENTRIES
            </p>
          </div>
          <span className="text-sm text-[#e8d44d]/80 font-bold">
            {PLAYLIST.length} total submissions
          </span>
        </div>

        <div
          className="rounded-xl p-4 sm:p-6 overflow-x-auto"
          style={{
            background:
              "linear-gradient(160deg, #f0dc5a 0%, #e8d44d 50%, #c7b33e 100%)",
          }}
        >
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-3 rounded-full border border-[#1a1a1a]/25 bg-white/40 text-sm text-[#1a1a1a] placeholder-[#1a1a1a]/40 focus:outline-none focus:border-[#1a1a1a]/60 transition-colors font-narrow fw-medium"
            />
          </div>

          <div className="min-w-[680px]">
          <div className="grid grid-cols-[60px_1fr_100px_100px_140px] px-5 py-3 border-b border-[#1a1a1a]/10 text-[10px] tracking-[0.15em] font-regular-w fw-semibold bg-[#1a1a1a] text-[#e8d44d]">
            <span>#</span>
            <span>VIDEO TITLE</span>
            <span className="text-center">AVG SCORE</span>
            <span className="text-center">VOTES</span>
            <span className="text-right">STATUS</span>
          </div>
          {submissionsPagination.pageRows.length === 0 ? (
            <div className="px-5 py-8 text-center text-[#1a1a1a]/40 text-sm">
              No submissions found
            </div>
          ) : (
            submissionsPagination.pageRows.map((row) => (
              <div
                key={row.videoId}
                className="grid grid-cols-[60px_1fr_100px_100px_140px] px-5 py-4 border-b border-[#1a1a1a]/5 items-center hover:bg-[#1a1a1a]/5 transition-colors"
              >
                <span className="text-sm text-[#1a1a1a]/40">
                  {String(row.index).padStart(2, "0")}
                </span>
                <div>
                  <div className="text-sm font-regular-w fw-medium text-[#1a1a1a]">{row.title}</div>
                  <div className="text-xs text-[#1a1a1a]/40 mt-0.5">{row.url}</div>
                </div>
                <div className="flex justify-center">
                  {row.avgScore !== null ? (
                    <span className="inline-flex items-center justify-center w-12 h-8 bg-[#1a1a1a] text-[#e8d44d] text-sm font-bold">
                      {row.avgScore}
                    </span>
                  ) : (
                    <span className="inline-flex items-center justify-center w-12 h-8 border border-dashed border-[#1a1a1a]/20 text-[#1a1a1a]/30 text-sm">
                      &mdash;
                    </span>
                  )}
                </div>
                <div className="text-center text-sm font-wide fw-medium text-[#1a1a1a]">{row.totalVotes}</div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] tracking-[0.1em] font-bold ${
                      row.status === "submitted"
                        ? "bg-[#1a1a1a] text-[#e8d44d]"
                        : "bg-[#1a1a1a]/10 text-[#1a1a1a]/40"
                    }`}
                  >
                    {row.status === "submitted" ? "JUDGED" : "PENDING"}
                  </span>
                </div>
              </div>
            ))
          )}
          </div>
          {renderPagination(
            filteredSubmissions.length,
            submissionsPagination.totalPages
          )}
        </div>
      </>
    );
  }

  function renderJudgesView() {
    const videoTitleMap: Record<string, string> = {};
    for (const v of PLAYLIST) {
      videoTitleMap[v.id] = v.title;
    }

    return (
      <>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl sm:text-5xl font-wide fw-semibold tracking-wider text-white">
              JUDGES
            </h1>
            <p className="text-sm text-white/70 tracking-[0.15em] mt-1 font-wide fw-light">
              AUDIENCE MEMBERS
            </p>
          </div>
          <span className="text-sm text-[#e8d44d]/80 font-bold">
            {judges.length} judges
          </span>
        </div>

        <div
          className="rounded-xl p-4 sm:p-6 overflow-x-auto"
          style={{
            background:
              "linear-gradient(160deg, #f0dc5a 0%, #e8d44d 50%, #c7b33e 100%)",
          }}
        >
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by judge name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-3 rounded-full border border-[#1a1a1a]/25 bg-white/40 text-sm text-[#1a1a1a] placeholder-[#1a1a1a]/40 focus:outline-none focus:border-[#1a1a1a]/60 transition-colors font-narrow fw-medium"
            />
          </div>

          <div className="min-w-[680px]">
          <div className="grid grid-cols-[60px_1fr_120px_100px_180px] px-5 py-3 border-b border-[#1a1a1a]/10 text-[10px] tracking-[0.15em] font-regular-w fw-semibold bg-[#1a1a1a] text-[#e8d44d]">
            <span>#</span>
            <span>JUDGE</span>
            <span className="text-center">VIDEOS JUDGED</span>
            <span className="text-center">AVG SCORE</span>
            <span>LAST ACTIVE</span>
          </div>
          {judgesLoading ? (
            <div className="px-5 py-8 text-center text-[#1a1a1a]/40 text-sm">
              Loading...
            </div>
          ) : judgesPagination.pageRows.length === 0 ? (
            <div className="px-5 py-8 text-center text-[#1a1a1a]/40 text-sm">
              {search ? "No judges match your search" : "No judges have submitted ratings yet"}
            </div>
          ) : (
            judgesPagination.pageRows.map((judge, idx) => {
              const { date, time } = formatDateTime(judge.lastActiveAt);
              const isExpanded = expandedJudge === judge.userId;
              return (
                <div key={judge.userId}>
                  <div
                    onClick={() =>
                      setExpandedJudge(isExpanded ? null : judge.userId)
                    }
                    className={`grid grid-cols-[60px_1fr_120px_100px_180px] px-5 py-4 border-b border-[#1a1a1a]/5 items-center cursor-pointer transition-colors ${
                      isExpanded ? "bg-[#1a1a1a]/10" : "hover:bg-[#1a1a1a]/5"
                    }`}
                  >
                    <span className="text-sm text-[#1a1a1a]/40">
                      {String((page - 1) * ENTRIES_PER_PAGE + idx + 1).padStart(2, "0")}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center text-xs font-bold text-[#e8d44d]">
                        {judge.userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-regular-w fw-medium text-[#1a1a1a]">{judge.userName}</div>
                        {judge.userName !== judge.userId && (
                          <div className="text-[10px] text-[#1a1a1a]/40">{judge.userId}</div>
                        )}
                      </div>
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        className={`ml-1 text-[#1a1a1a]/40 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      >
                        <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <span className="text-sm font-regular-w fw-medium text-[#1a1a1a]">
                        {judge.videosJudged}
                      </span>
                      <span className="text-xs text-[#1a1a1a]/40">
                        {" "}/ {PLAYLIST.length}
                      </span>
                    </div>
                    <div className="flex justify-center">
                      <span className="inline-flex items-center justify-center w-12 h-8 bg-[#1a1a1a] text-[#e8d44d] text-sm font-bold">
                        {judge.avgScore}
                      </span>
                    </div>
                    <div className="text-sm text-[#1a1a1a]/70">
                      <div>{date}</div>
                      {time && <div className="text-[#1a1a1a]/40 text-xs">{time}</div>}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="bg-[#1a1a1a]/5 border-b border-[#1a1a1a]/5 px-5 py-4">
                      <div className="ml-[60px]">
                        <div className="text-[10px] tracking-[0.15em] text-[#1a1a1a]/50 mb-3 font-bold">
                          SCORES BY {judge.userName.toUpperCase()}
                        </div>
                        <div className="grid grid-cols-[1fr_80px_160px] gap-y-2 text-sm">
                          <div className="text-[10px] tracking-[0.1em] text-[#1a1a1a]/40 pb-1 border-b border-[#1a1a1a]/10 font-bold">VIDEO</div>
                          <div className="text-[10px] tracking-[0.1em] text-[#1a1a1a]/40 pb-1 border-b border-[#1a1a1a]/10 text-center font-bold">SCORE</div>
                          <div className="text-[10px] tracking-[0.1em] text-[#1a1a1a]/40 pb-1 border-b border-[#1a1a1a]/10 font-bold">SUBMITTED AT</div>
                          {judge.ratings.map((r) => {
                            const rd = formatDateTime(r.createdAt);
                            return (
                              <div key={r.videoId} className="contents">
                                <div className="py-1.5 font-bold text-[#1a1a1a]">
                                  {videoTitleMap[r.videoId] || r.videoId}
                                </div>
                                <div className="py-1.5 text-center">
                                  <span className="inline-flex items-center justify-center w-10 h-7 bg-[#1a1a1a] text-[#e8d44d] text-xs font-bold">
                                    {r.score}
                                  </span>
                                </div>
                                <div className="py-1.5 text-[#1a1a1a]/40 text-xs">
                                  {rd.date} {rd.time}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
          </div>
          {renderPagination(
            filteredJudges.length,
            judgesPagination.totalPages
          )}
        </div>
      </>
    );
  }

  function renderLeaderboardView() {
    const rankedVideos = allRows
      .filter((r) => r.avgScore !== null)
      .sort((a, b) => {
        if ((b.avgScore ?? 0) !== (a.avgScore ?? 0))
          return (b.avgScore ?? 0) - (a.avgScore ?? 0);
        return b.totalVotes - a.totalVotes;
      });

    const filteredRanked = search.trim()
      ? rankedVideos.filter((v) =>
          v.title.toLowerCase().includes(search.toLowerCase())
        )
      : rankedVideos;

    const leaderboardPagination = getPaginatedRows(filteredRanked);

    return (
      <>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl sm:text-5xl font-wide fw-semibold tracking-wider text-white">
              LEADERBOARD
            </h1>
            <p className="text-sm text-white/70 tracking-[0.15em] mt-1 font-wide fw-light">
              VIDEOS RANKED BY SCORE
            </p>
          </div>
          <span className="text-sm text-[#e8d44d]/80 font-bold">
            {rankedVideos.length} ranked entries
          </span>
        </div>

        <div
          className="rounded-xl p-4 sm:p-6 overflow-x-auto"
          style={{
            background:
              "linear-gradient(160deg, #f0dc5a 0%, #e8d44d 50%, #c7b33e 100%)",
          }}
        >
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by video title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-3 rounded-full border border-[#1a1a1a]/25 bg-white/40 text-sm text-[#1a1a1a] placeholder-[#1a1a1a]/40 focus:outline-none focus:border-[#1a1a1a]/60 transition-colors font-narrow fw-medium"
            />
          </div>

          <div className="min-w-[680px]">
          <div className="grid grid-cols-[60px_1fr_120px_100px_180px] px-5 py-3 border-b border-[#1a1a1a]/10 text-[10px] tracking-[0.15em] font-regular-w fw-semibold bg-[#1a1a1a] text-[#e8d44d]">
            <span>RANK</span>
            <span>VIDEO</span>
            <span className="text-center">AVG SCORE</span>
            <span className="text-center">VOTES</span>
            <span>LAST JUDGED</span>
          </div>

          {ratingsLoading ? (
            <div className="px-5 py-8 text-center text-[#1a1a1a]/40 text-sm">
              Loading...
            </div>
          ) : leaderboardPagination.pageRows.length === 0 ? (
            <div className="px-5 py-8 text-center text-[#1a1a1a]/40 text-sm">
              {search
                ? "No videos match your search"
                : "No videos have been rated yet"}
            </div>
          ) : (
            leaderboardPagination.pageRows.map((video, idx) => {
              const rank = (page - 1) * ENTRIES_PER_PAGE + idx + 1;
              const { date, time } = formatDateTime(video.lastJudgedAt);
              return (
                <div
                  key={video.videoId}
                  className="grid grid-cols-[60px_1fr_120px_100px_180px] px-5 py-4 border-b border-[#1a1a1a]/5 items-center hover:bg-[#1a1a1a]/5 transition-colors"
                >
                  <span className="text-sm font-black text-[#1a1a1a]">
                    {String(rank).padStart(2, "0")}
                  </span>
                  <div>
                    <div className="text-sm font-regular-w fw-medium text-[#1a1a1a]">{video.title}</div>
                    <div className="text-xs text-[#1a1a1a]/40">
                      Entry #{video.index}
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <span className="inline-flex items-center justify-center w-14 h-9 bg-[#1a1a1a] text-[#e8d44d] text-base font-black">
                      {video.avgScore}
                    </span>
                  </div>
                  <div className="text-center text-sm font-wide fw-medium text-[#1a1a1a]">
                    {video.totalVotes}
                  </div>
                  <div className="text-sm text-[#1a1a1a]/70">
                    <div>{date}</div>
                    {time && (
                      <div className="text-[#1a1a1a]/40 text-xs">{time}</div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          </div>
          {renderPagination(
            filteredRanked.length,
            leaderboardPagination.totalPages
          )}
        </div>
      </>
    );
  }

  function renderPlaceholderView(title: string) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h1 className="text-4xl font-black tracking-wider text-[#1a1a1a] mb-2">
            {title.toUpperCase()}
          </h1>
          <p className="text-[#1a1a1a]/50 font-bold tracking-[0.1em]">COMING SOON</p>
        </div>
      </div>
    );
  }

  function renderActiveView() {
    switch (activeView) {
      case "summary":
        return renderSummaryView();
      case "submissions":
        return renderSubmissionsView();
      case "judges":
        return renderJudgesView();
      case "leaderboard":
        return renderLeaderboardView();
      case "categories":
        return renderPlaceholderView("Categories");
    }
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#5a0404] relative">
      {/* Red gradient background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 110% 90% at 50% 60%, #d41414 0%, #a80c0c 45%, #6a0606 80%, #3a0202 100%)",
        }}
      />
      <div className="absolute inset-0 grain-overlay opacity-10 pointer-events-none" />

      {/* Header */}
      <header className="relative shrink-0 z-10 px-4 sm:px-10 pt-4 sm:pt-6 pb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="md:hidden w-10 h-10 flex items-center justify-center text-[#e8d44d] border border-[#e8d44d]/40 rounded"
            aria-label="Open menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <img
            src="/isf-horizontal-logo.png"
            alt="Indian Scroll Festival"
            className="h-8 sm:h-14 w-auto"
          />
        </div>
        <div className="text-right">
          <div className="text-white/85 text-sm sm:text-base font-wide fw-medium tracking-wide">
            ADMIN PANEL
          </div>
          <div className="flex items-center gap-2 mt-1 sm:mt-2 justify-end">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#1a1a1a] border-2 border-[#e8d44d]/40 flex items-center justify-center text-sm font-bold text-[#e8d44d]">
              {adminName.charAt(0).toUpperCase()}
            </div>
            <span className="hidden sm:inline text-[#e8d44d]/80 text-xs font-bold tracking-wider">
              {adminName}
            </span>
          </div>
        </div>
      </header>

      {/* Content Area */}
      <div className="relative flex-1 flex min-h-0 z-10">
        {/* Mobile nav backdrop */}
        {mobileNavOpen && (
          <div
            onClick={() => setMobileNavOpen(false)}
            className="md:hidden absolute inset-0 bg-black/60 z-30"
          />
        )}
        {/* Sidebar */}
        <aside
          className={`absolute md:relative top-0 bottom-0 left-0 w-[220px] bg-[#5a0404] md:bg-transparent py-6 px-5 flex flex-col justify-between shrink-0 z-40 transition-transform md:translate-x-0 ${
            mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          <div>
            {sidebarItems.map((group) => (
              <div key={group.section}>
                <div className="text-[10px] tracking-[0.2em] text-white/50 mb-3 mt-5 first:mt-0 font-wide fw-medium">
                  {group.section}
                </div>
                <nav className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = activeView === item.key;
                    const isManage = group.section === "MANAGE";
                    const fontClass = isActive
                      ? "font-wide fw-bold"
                      : isManage
                        ? "font-wide fw-semibold"
                        : "font-regular-w fw-medium";
                    return (
                      <button
                        key={item.key}
                        onClick={() => {
                          setActiveView(item.key);
                          setMobileNavOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors text-left tracking-wide ${fontClass} ${
                          isActive
                            ? "bg-black/40 text-[#e8d44d] rounded"
                            : "text-[#e8d44d]/75 hover:text-[#e8d44d] hover:bg-black/20 rounded"
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 text-[#e8d44d]/70 hover:text-[#e8d44d] text-sm transition-colors font-bold"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 2H4a2 2 0 00-2 2v8a2 2 0 002 2h2M11 11l3-3-3-3M6 8h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Log Out
          </button>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto px-8 py-6">
          {!isSupabaseConfigured && (
            <div className="mb-6 border border-red-500/40 bg-red-500/10 text-red-900 px-4 py-3 text-sm font-bold tracking-wide">
              Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and
              NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then restart the dev
              server. Submissions cannot be saved or read without these.
            </div>
          )}
          {renderActiveView()}
        </main>
      </div>
    </div>
  );
}
