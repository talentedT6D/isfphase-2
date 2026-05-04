"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PLAYLIST } from "@/lib/videos";
import { useAdminRatings } from "@/hooks/useRatings";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const SESSION_ID = "session-1";

export default function AudiencePage() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState("");
  const [videoIndex, setVideoIndex] = useState(0);
  const [score, setScore] = useState(50);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [submittedScores, setSubmittedScores] = useState<Record<string, number>>({});
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const [submitError, setSubmitError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const name = localStorage.getItem("user-name");
    const id = localStorage.getItem("user-id");
    if (!name) {
      router.replace("/");
      return;
    }
    setUserName(name);
    setUserId(id || name);
  }, [router]);

  const currentVideo = PLAYLIST[videoIndex] || PLAYLIST[0];
  const judgedCount = Object.keys(submittedScores).length;
  const remaining = PLAYLIST.length - judgedCount;

  const { averageRating, totalVotes } = useAdminRatings(currentVideo?.id || "");

  useEffect(() => {
    if (currentVideo && submittedScores[currentVideo.id] !== undefined) {
      setScore(submittedScores[currentVideo.id]);
    } else {
      setScore(50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoIndex]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentVideo) return;
    video.load();
    setCurrentTime(0);
    setDuration(0);
    const onCanPlay = () => {
      video.play().catch(() => {});
      video.removeEventListener("canplay", onCanPlay);
    };
    video.addEventListener("canplay", onCanPlay);
    return () => video.removeEventListener("canplay", onCanPlay);
  }, [videoIndex, currentVideo]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) {
      video.pause();
    } else {
      video.play().catch(() => {});
    }
  }, [playing]);

  const goToVideo = useCallback(
    (index: number) => {
      if (index >= 0 && index < PLAYLIST.length) {
        setVideoIndex(index);
      }
    },
    []
  );

  const submitScore = useCallback(async () => {
    if (!currentVideo) return;

    setSubmitStatus("idle");
    setSubmitError("");

    if (!isSupabaseConfigured) {
      console.error(
        "Supabase is not configured — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
      );
      setSubmitStatus("error");
      setSubmitError(
        "Backend not configured. Your score was not saved. Please contact the organizer."
      );
      return;
    }

    if (!userId) {
      setSubmitStatus("error");
      setSubmitError("Missing user id. Please log in again.");
      return;
    }

    const { error } = await supabase.from("ratings").upsert({
      video_id: currentVideo.id,
      user_id: userId,
      user_name: userName,
      session_id: SESSION_ID,
      rating: score,
      created_at: new Date().toISOString(),
    });
    if (error) {
      console.error("Failed to submit rating:", error.message);
      setSubmitStatus("error");
      setSubmitError(error.message);
      return;
    }

    setSubmittedScores((prev) => ({ ...prev, [currentVideo.id]: score }));
    setSubmitStatus("success");

    setTimeout(() => {
      setSubmitStatus("idle");
      if (videoIndex < PLAYLIST.length - 1) {
        setVideoIndex((i) => i + 1);
      }
    }, 800);
  }, [currentVideo, score, userId, videoIndex]);

  const toggleFullscreen = useCallback(() => {
    const wrapper = fullscreenRef.current;
    const video = videoRef.current;
    if (!wrapper || !video) return;
    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void>;
    };
    if (doc.fullscreenElement || doc.webkitFullscreenElement) {
      if (typeof document.exitFullscreen === "function") {
        document.exitFullscreen().catch(() => {});
      } else if (typeof doc.webkitExitFullscreen === "function") {
        doc.webkitExitFullscreen().catch(() => {});
      }
      return;
    }
    const el = wrapper as HTMLDivElement & {
      webkitRequestFullscreen?: () => Promise<void>;
    };
    if (typeof el.requestFullscreen === "function") {
      el.requestFullscreen().catch(() => {});
    } else if (typeof el.webkitRequestFullscreen === "function") {
      el.webkitRequestFullscreen().catch(() => {});
    } else {
      // iOS Safari fallback: native video fullscreen
      const v = video as HTMLVideoElement & {
        webkitEnterFullscreen?: () => void;
      };
      if (typeof v.webkitEnterFullscreen === "function") {
        v.webkitEnterFullscreen();
      }
    }
  }, []);

  const skipEntry = useCallback(() => {
    if (videoIndex < PLAYLIST.length - 1) {
      setVideoIndex((i) => i + 1);
    }
  }, [videoIndex]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const getScoreLabel = (val: number) => {
    if (val <= 20) return "POOR";
    if (val <= 40) return "FAIR";
    if (val <= 60) return "GOOD";
    if (val <= 80) return "GREAT";
    return "EXCELLENT";
  };

  const handleLogout = () => {
    localStorage.removeItem("user-name");
    localStorage.removeItem("user-id");
    router.replace("/");
  };

  const allJudged = judgedCount === PLAYLIST.length;

  if (!userName) return null;

  if (allJudged) {
    return (
      <div className="h-screen bg-[#5a0404] flex flex-col relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 110% 90% at 50% 60%, #d41414 0%, #a80c0c 45%, #6a0606 80%, #3a0202 100%)",
          }}
        />
        <div className="absolute inset-0 grain-overlay opacity-10" />

        {/* Header */}
        <header className="relative z-10 flex items-center justify-between px-4 sm:px-10 pt-4 sm:pt-6 pb-2 sm:pb-3 shrink-0">
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
            JUDGE PORTAL
          </div>
        </header>

        {/* Thank You Screen */}
        <div className="relative z-10 flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-6">
            <h1 className="text-[#e8d44d] text-4xl font-black tracking-wider mb-3">
              Thank You, {userName}!
            </h1>
            <p className="text-[#e8d44d]/70 text-sm tracking-[0.1em] mb-2">
              You have judged all {PLAYLIST.length} entries.
            </p>
            <p className="text-[#e8d44d]/50 text-xs tracking-[0.05em] mb-10">
              Your scores have been submitted successfully. The results will be announced soon.
            </p>

            <div className="border border-[#e8d44d]/30 p-6 mb-8">
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-[#e8d44d] text-4xl font-black">{judgedCount}</div>
                  <div className="text-[10px] tracking-[0.15em] text-[#e8d44d]/50 mt-1">JUDGED</div>
                </div>
                <div>
                  <div className="text-[#e8d44d] text-4xl font-black">
                    {Math.round(Object.values(submittedScores).reduce((a, b) => a + b, 0) / judgedCount)}
                  </div>
                  <div className="text-[10px] tracking-[0.15em] text-[#e8d44d]/50 mt-1">YOUR AVG</div>
                </div>
                <div>
                  <div className="text-[#e8d44d] text-4xl font-black">0</div>
                  <div className="text-[10px] tracking-[0.15em] text-[#e8d44d]/50 mt-1">REMAINING</div>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="px-8 py-3 bg-[#e8d44d] text-[#1a0000] text-[11px] font-bold tracking-[0.2em] hover:bg-[#f0dc5a] transition-colors"
            >
              EXIT PORTAL
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#5a0404] flex flex-col overflow-hidden relative">
      {/* Red gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 110% 90% at 50% 60%, #d41414 0%, #a80c0c 45%, #6a0606 80%, #3a0202 100%)",
        }}
      />

      <div className="absolute inset-0 grain-overlay opacity-10" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-4 sm:px-10 pt-4 sm:pt-6 pb-2 sm:pb-3 shrink-0">
        <img
          src="/isf-horizontal-logo.png"
          alt="Indian Scroll Festival"
          className="h-7 sm:h-10 w-auto"
        />

        <div className="flex items-center gap-3 sm:gap-6">
          <div className="text-right hidden sm:block">
            <div
              className="text-white text-xl sm:text-2xl tracking-[0.2em]"
              style={{
                fontFamily: '"obviously-wide", "obviously", sans-serif',
                fontWeight: 500,
              }}
            >
              JUDGE PORTAL
            </div>
            <div className="text-[#e8d44d]/80 text-[10px] font-bold tracking-[0.2em] mt-1">
              NOW JUDGING &mdash; ENTRY #{String(videoIndex + 1).padStart(2, "0")}
            </div>
          </div>
          <div className="text-right sm:hidden">
            <div className="text-[#e8d44d]/90 text-[10px] font-bold tracking-[0.15em]">
              ENTRY #{String(videoIndex + 1).padStart(2, "0")}
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#1a1a1a] border-2 border-[#e8d44d]/40 flex items-center justify-center text-sm sm:text-base font-bold text-[#e8d44d] hover:bg-[#e8d44d]/10 transition-colors"
              title="Open menu"
            >
              {userName.charAt(0).toUpperCase()}
            </button>
            <span className="hidden sm:inline text-[#e8d44d]/80 text-[10px] tracking-wider font-bold uppercase">
              {userName}
            </span>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="relative z-10 flex-1 flex flex-col md:flex-row min-h-0 px-4 sm:px-6 pb-4 gap-4 md:gap-0 overflow-y-auto md:overflow-hidden">
        {/* Left - Video Player */}
        <div className="flex items-center justify-center md:pr-8 w-full md:w-[45%] shrink-0">
          <div className="relative max-h-[48vh] md:max-h-full md:h-full aspect-[9/16] bg-black/40 border border-[#e8d44d]/20 rounded-lg overflow-hidden flex flex-col mx-auto">
            <div ref={fullscreenRef} className="fs-video-wrap flex-1 relative min-h-0">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                onTimeUpdate={() => {
                  if (videoRef.current)
                    setCurrentTime(videoRef.current.currentTime);
                }}
                onLoadedMetadata={() => {
                  if (videoRef.current)
                    setDuration(videoRef.current.duration);
                }}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => {
                  setPlaying(false);
                  if (videoIndex < PLAYLIST.length - 1) {
                    setVideoIndex((i) => i + 1);
                  }
                }}
                onClick={togglePlay}
              >
                <source src={currentVideo?.url || ""} type="video/mp4" />
              </video>

              {/* Play button overlay */}
              {!playing && (
                <button
                  onClick={togglePlay}
                  className="absolute inset-0 flex items-center justify-center cursor-pointer"
                >
                  <div className="w-16 h-16 rounded-full border-2 border-[#e8d44d]/40 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M8 5v14l11-7L8 5z" fill="#e8d44d" fillOpacity="0.8" />
                    </svg>
                  </div>
                </button>
              )}

              {/* Fullscreen button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFullscreen();
                }}
                className="fs-exit-btn absolute bottom-2 right-2 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm border border-[#e8d44d]/40 flex items-center justify-center text-[#e8d44d] hover:bg-black/70 hover:border-[#e8d44d]/70 transition-colors z-10"
                title="Toggle fullscreen"
                aria-label="Toggle fullscreen"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9V5a2 2 0 0 1 2-2h4M21 9V5a2 2 0 0 0-2-2h-4M3 15v4a2 2 0 0 0 2 2h4M21 15v4a2 2 0 0 1-2 2h-4" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Right - Judging Panel */}
        <div className="flex-1 flex flex-col justify-center py-2 md:py-4 w-full md:max-w-[520px]">
          <div className="space-y-3 sm:space-y-4">
            {/* Entry Info */}
            <div>
              <h2 className="text-white text-3xl sm:text-4xl font-black italic tracking-wider leading-tight uppercase">
                {currentVideo?.title || "Untitled"}
              </h2>
              <div className="flex items-center gap-3 mt-1 text-white/70 text-xs font-bold tracking-widest">
                <span>{currentVideo?.creator ?? "@CREATOR"}</span>
                <span>&bull;</span>
                <span>{duration > 0 ? formatTime(duration) : "--:--"}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div>
              <div className="w-full h-[6px] bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-200"
                  style={{
                    width:
                      duration > 0
                        ? `${(currentTime / duration) * 100}%`
                        : "0%",
                  }}
                />
              </div>
              <div className="flex justify-start mt-1">
                <span className="text-white/60 text-[10px]">
                  {formatTime(currentTime)}
                </span>
              </div>
            </div>

            {/* Score Section
                On desktop: score stacked above slider (original layout).
                On mobile: score and slider sit side by side via flex-row-reverse. */}
            <div className="pt-2 flex flex-row-reverse items-center gap-4 md:block md:gap-0">
              <div className="flex items-baseline shrink-0 md:mb-4">
                <span className="text-[#e8d44d] text-4xl md:text-6xl font-black italic tabular-nums leading-none">
                  {score}
                </span>
                <span className="text-[#e8d44d] text-2xl md:text-4xl font-black italic leading-none">
                  /100
                </span>
              </div>

              {/* Slider */}
              <div className="flex-1 md:w-full">
                <div className="flex justify-between text-[11px] text-white/80 mb-2 font-bold tracking-wider">
                  <span>1</span>
                  <span>25</span>
                  <span>50</span>
                  <span>75</span>
                  <span>100</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  step="1"
                  value={score}
                  onChange={(e) => setScore(parseInt(e.target.value))}
                  className="judge-slider w-full h-[3px] rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #e8d44d 0%, #e8d44d ${((score - 1) / 99) * 100}%, rgba(255,255,255,0.25) ${((score - 1) / 99) * 100}%)`,
                  }}
                  aria-label="Score from 1 to 100"
                />
                <div className="text-center text-[11px] tracking-[0.2em] text-[#e8d44d] mt-3 font-black">
                  {getScoreLabel(score)}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 md:block md:space-y-2 pt-1">
              <button
                onClick={submitScore}
                disabled={submitStatus === "success"}
                className={`flex-1 md:w-full py-3 rounded-full text-[12px] font-black tracking-[0.25em] transition-colors ${
                  submitStatus === "success"
                    ? "bg-green-700 text-white"
                    : submitStatus === "error"
                      ? "bg-red-700 text-white"
                      : "bg-[#e8d44d] text-[#8b0000] hover:bg-[#f0dc5a]"
                }`}
              >
                {submitStatus === "success"
                  ? "SUBMITTED!"
                  : submitStatus === "error"
                    ? "FAILED - TAP TO RETRY"
                    : "SUBMIT SCORE"}
              </button>
              {submitError && (
                <div className="text-xs text-red-300 bg-red-900/30 border border-red-700/50 px-3 py-2 rounded">
                  Error: {submitError}
                </div>
              )}
              <button
                onClick={skipEntry}
                disabled={videoIndex >= PLAYLIST.length - 1}
                className="flex-1 md:w-full py-3 rounded-full border-2 border-[#e8d44d] bg-transparent text-[#e8d44d] text-[12px] font-black tracking-[0.25em] hover:bg-[#e8d44d]/10 disabled:opacity-30 transition-colors"
              >
                SKIP ENTRY
              </button>
            </div>
          </div>

          {/* Bottom Stats */}
          <div className="border-t border-[#e8d44d]/20 pt-4 mt-4">
            <div className="flex justify-between text-center">
              <div>
                <div className="text-[#e8d44d] text-4xl font-black tabular-nums">
                  {String(totalVotes).padStart(2, "0")}
                </div>
                <div className="text-[10px] tracking-[0.15em] text-[#e8d44d]/50 mt-1 font-bold">
                  VOTES
                </div>
              </div>
              <div>
                <div className="text-[#e8d44d] text-4xl font-black tabular-nums">
                  {String(averageRating).padStart(2, "0")}
                </div>
                <div className="text-[10px] tracking-[0.15em] text-[#e8d44d]/50 mt-1 font-bold">
                  AVG SCORE
                </div>
              </div>
              <div>
                <div className="text-[#e8d44d] text-4xl font-black tabular-nums">
                  {String(remaining).padStart(2, "0")}
                </div>
                <div className="text-[10px] tracking-[0.15em] text-[#e8d44d]/50 mt-1 font-bold">
                  REMAINING
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <div className="relative z-10 flex items-center justify-between px-4 sm:px-6 pb-3 sm:pb-4 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => goToVideo(videoIndex - 1)}
            disabled={videoIndex <= 0}
            className="w-9 h-9 rounded-full border border-[#e8d44d]/30 flex items-center justify-center text-[#e8d44d]/60 hover:border-[#e8d44d]/60 hover:text-[#e8d44d] disabled:opacity-20 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={() => goToVideo(videoIndex + 1)}
            disabled={videoIndex >= PLAYLIST.length - 1}
            className="w-9 h-9 rounded-full border border-[#e8d44d]/30 flex items-center justify-center text-[#e8d44d]/60 hover:border-[#e8d44d]/60 hover:text-[#e8d44d] disabled:opacity-20 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Social handles */}
        <div className="flex items-center gap-4">
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#e8d44d]/80 hover:text-[#e8d44d] transition-colors"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" />
              <circle cx="12" cy="12" r="5" />
              <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
            </svg>
          </a>
          <a
            href="https://x.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#e8d44d]/80 hover:text-[#e8d44d] transition-colors"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
        </div>
      </div>

      {/* Sidebar Drawer */}
      {sidebarOpen && (
        <>
          <div
            onClick={() => setSidebarOpen(false)}
            className="absolute inset-0 bg-black/60 z-40 transition-opacity"
          />
          <aside className="absolute top-0 right-0 bottom-0 w-full max-w-[340px] sm:w-[340px] bg-[#1a1a1a] border-l-2 border-[#e8d44d]/30 z-50 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#e8d44d]/15">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#e8d44d] flex items-center justify-center text-base font-bold text-[#1a1a1a]">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-[#e8d44d] text-sm font-bold uppercase tracking-wider">
                    {userName}
                  </div>
                  <div className="text-[#e8d44d]/50 text-[10px] tracking-wider">
                    {judgedCount}/{PLAYLIST.length} JUDGED
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-[#e8d44d]/60 hover:text-[#e8d44d] transition-colors"
                title="Close"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="px-6 pt-5 pb-2 text-[10px] tracking-[0.2em] text-[#e8d44d]/50 font-bold">
                ENTRIES
              </div>
              <nav className="px-3">
                {PLAYLIST.map((video, idx) => {
                  const isCurrent = idx === videoIndex;
                  const isJudged = submittedScores[video.id] !== undefined;
                  return (
                    <button
                      key={video.id}
                      onClick={() => {
                        setVideoIndex(idx);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-3 rounded text-left transition-colors ${
                        isCurrent
                          ? "bg-[#e8d44d]/20 text-[#e8d44d]"
                          : "text-[#e8d44d]/80 hover:bg-[#e8d44d]/10"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-[11px] text-[#e8d44d]/50 font-bold tabular-nums w-6">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span className="text-sm font-bold truncate">
                          {video.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isJudged && (
                          <span className="inline-flex items-center justify-center w-8 h-6 bg-[#e8d44d] text-[#1a1a1a] text-[10px] font-black">
                            {submittedScores[video.id]}
                          </span>
                        )}
                        {isCurrent && (
                          <span className="text-[9px] tracking-wider font-bold text-[#e8d44d]/70">
                            NOW
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="px-3 py-4 border-t border-[#e8d44d]/15">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-3 rounded text-[#e8d44d]/70 hover:text-[#e8d44d] hover:bg-[#e8d44d]/10 text-sm font-bold transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M7 2H4a2 2 0 00-2 2v10a2 2 0 002 2h3M13 13l4-4-4-4M7 9h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                LOG OUT
              </button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
