"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const JUDGES: Record<string, string> = {
  varun: "va2107",
  gautam: "ga2107",
  pg: "pg2107",
  namrata: "na2107",
  viren: "vi2107",
  javaad: "ja2107",
};

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [judgePassword, setJudgePassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    const key = trimmed.toLowerCase();
    const expected = JUDGES[key];
    if (!expected) {
      setError("Unknown judge name");
      return;
    }
    if (judgePassword !== expected) {
      setError("Incorrect password");
      return;
    }

    const displayName = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
    localStorage.setItem("user-name", displayName);
    localStorage.setItem("user-id", `judge-${key}`);
    router.push("/audience");
  };

  return (
    <div className="min-h-screen bg-[#5a0404] flex flex-col relative overflow-hidden">
      {/* Red gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 110% 90% at 50% 60%, #d41414 0%, #a80c0c 45%, #6a0606 80%, #3a0202 100%)",
        }}
      />

      {/* Grain overlay */}
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

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-2xl text-center">
          {/* ISF Horizontal Logo */}
          <div className="mb-10">
            <img
              src="/isf-horizontal-logo.png"
              alt="Indian Scroll Festival"
              className="w-full max-w-xl mx-auto"
            />
          </div>

          {/* Form */}
          <div className="max-w-sm mx-auto">
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ENTER YOUR NAME"
                autoFocus
                className="w-full px-6 py-4 bg-transparent border-2 border-[#e8d44d]/60 rounded-full
                           text-[#e8d44d] placeholder-[#e8d44d]/70 text-center text-sm font-regular-w fw-thin
                           tracking-[0.2em] focus:outline-none focus:border-[#e8d44d] transition-colors"
              />
              <input
                type="password"
                value={judgePassword}
                onChange={(e) => {
                  setJudgePassword(e.target.value);
                  setError("");
                }}
                placeholder="ENTER PASSWORD"
                className="w-full px-6 py-4 bg-transparent border-2 border-[#e8d44d]/60 rounded-full
                           text-[#e8d44d] placeholder-[#e8d44d]/70 text-center text-sm font-regular-w fw-thin
                           tracking-[0.2em] focus:outline-none focus:border-[#e8d44d] transition-colors"
              />
              {error && (
                <p className="text-red-300 text-xs text-center">{error}</p>
              )}
              <button
                type="submit"
                disabled={!name.trim() || !judgePassword}
                className="relative w-full py-4 rounded-full bg-[#1a1a1a] text-white text-sm font-wide fw-medium tracking-[0.25em]
                           shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_2px_6px_rgba(0,0,0,0.35)]
                           hover:bg-[#2a2a2a] disabled:opacity-40 disabled:cursor-not-allowed transition-all overflow-hidden"
              >
                <span className="grain-overlay absolute inset-0 rounded-full opacity-40" />
                <span className="relative">JOIN AS JUDGE</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 flex items-center justify-end px-5 sm:px-10 py-4 sm:py-6 gap-4 sm:gap-5">
        <a
          href="https://www.instagram.com/indianscrollfestival/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#e8d44d]/80 hover:text-[#e8d44d] transition-colors"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" />
            <circle cx="12" cy="12" r="5" />
            <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
          </svg>
        </a>
        <a
          href="https://x.com/indiascrollfest"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#e8d44d]/80 hover:text-[#e8d44d] transition-colors"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>
      </footer>
    </div>
  );
}
