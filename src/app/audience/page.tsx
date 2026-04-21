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
  const videoRef = useRef<HTMLVideoElement>(null);

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
        <img
          src="/header-bar.png"
          alt=""
          className="absolute top-0 left-0 w-full pointer-events-none"
          style={{
            height: "30%",
            objectFit: "fill",
            filter: "sepia(1) saturate(3) brightness(0.12) hue-rotate(350deg)",
          }}
        />
        <div className="absolute inset-0 grain-overlay opacity-10" />

        {/* Header */}
        <img
          src="/isf-logo-vertical.png"
          alt="ISF Logo"
          className="absolute z-20 h-44 w-auto"
          style={{ top: 42, left: 36 }}
        />
        <header className="relative z-10 flex items-center justify-end px-10 pt-8">
          <div className="text-[#e8d44d]/80 text-base font-bold italic tracking-wide">
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

      {/* Header bar shape (transparent PNG, tinted dark red) */}
      <img
        src="/header-bar.png"
        alt=""
        className="absolute top-0 left-0 w-full pointer-events-none"
        style={{
          height: "30%",
          objectFit: "fill",
          filter: "sepia(1) saturate(3) brightness(0.12) hue-rotate(350deg)",
        }}
      />

      <div className="absolute inset-0 grain-overlay opacity-10" />

      {/* Header */}
      <img
        src="/isf-logo-vertical.png"
        alt="ISF Logo"
        className="absolute z-20 h-44 w-auto"
        style={{ top: 42, left: 36 }}
      />
      <header className="relative z-10 flex items-center justify-between px-10 pt-8 shrink-0">
        <div aria-hidden className="h-16 w-44" />

        <div className="text-[#e8d44d]/70 text-xs font-bold tracking-[0.15em]">
          NOW JUDGING &mdash; ENTRY #{String(videoIndex + 1).padStart(2, "0")}
        </div>

        <div className="flex flex-col items-center gap-1">
          <button
            onClick={handleLogout}
            className="w-14 h-14 rounded-full bg-[#1a1a1a] border-2 border-[#e8d44d]/30 flex items-center justify-center text-lg font-bold text-[#e8d44d] hover:bg-[#e8d44d]/10 transition-colors"
            title="Logout"
          >
            {userName.charAt(0).toUpperCase()}
          </button>
          <span className="text-[#e8d44d]/60 text-[10px] tracking-wider">
            {userName}
          </span>
        </div>
      </header>

      {/* Main Layout */}
      <main className="relative z-10 flex-1 flex min-h-0 px-6 pb-4">
        {/* Left - Video Player */}
        <div className="flex items-center justify-center pr-8" style={{ width: "45%" }}>
          <div className="relative h-full max-h-full aspect-[9/16] bg-black/40 border border-[#e8d44d]/20 rounded-lg overflow-hidden flex flex-col">
            <div className="flex-1 relative min-h-0">
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
            </div>
          </div>
        </div>

        {/* Right - Judging Panel */}
        <div className="flex-1 flex flex-col justify-center py-4" style={{ maxWidth: "550px" }}>
          <div className="space-y-5">
            {/* Entry Info */}
            <div>
              <h2 className="text-white text-5xl font-black italic tracking-wider leading-tight uppercase">
                {currentVideo?.title || "Untitled"}
              </h2>
              <div className="flex items-center gap-3 mt-2 text-white/70 text-sm font-bold tracking-widest">
                <span>@CREATOR</span>
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

            {/* Score Section */}
            <div className="pt-4">
              <div className="flex items-baseline mb-6">
                <span className="text-[#e8d44d] text-7xl font-black italic tabular-nums leading-none">
                  {score}
                </span>
                <span className="text-[#e8d44d] text-5xl font-black italic leading-none">
                  /100
                </span>
              </div>

              {/* Slider */}
              <div>
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
            <div className="space-y-3 pt-2">
              <button
                onClick={submitScore}
                disabled={submitStatus === "success"}
                className={`w-full py-4 rounded-full text-[13px] font-black tracking-[0.25em] transition-colors ${
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
                className="w-full py-4 rounded-full border-2 border-[#e8d44d] bg-transparent text-[#e8d44d] text-[13px] font-black tracking-[0.25em] hover:bg-[#e8d44d]/10 disabled:opacity-30 transition-colors"
              >
                SKIP ENTRY
              </button>
            </div>
          </div>

          {/* Bottom Stats */}
          <div className="border-t border-[#e8d44d]/20 pt-5 mt-6">
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
      <div className="relative z-10 flex items-center justify-between px-6 pb-4 shrink-0">
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
    </div>
  );
}
