"use client";

import { useRef, useEffect } from "react";

interface VideoPlayerProps {
  videoUrl: string;
  videoTitle: string;
  playing?: boolean;
  isAdmin?: boolean;
  onTogglePlay?: () => void;
}

export default function VideoPlayer({
  videoUrl,
  videoTitle,
  playing = true,
  isAdmin = false,
  onTogglePlay,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Load new video when URL changes and sync play/pause state
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    video.load();
    if (playing) {
      const onCanPlay = () => {
        video.play().catch(() => {});
        video.removeEventListener("canplay", onCanPlay);
      };
      video.addEventListener("canplay", onCanPlay);
      return () => video.removeEventListener("canplay", onCanPlay);
    }
  }, [videoUrl]);

  // Sync play/pause state
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;

    if (playing) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [playing]);

  if (!videoUrl) {
    return (
      <div className="aspect-video bg-gray-900 rounded-xl flex items-center justify-center">
        <p className="text-gray-400 text-lg">
          Waiting for admin to start a video...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {videoTitle && (
        <h2 className="text-xl font-semibold text-white mb-3">{videoTitle}</h2>
      )}
      <video
        ref={videoRef}
        className="w-full aspect-video rounded-xl bg-black"
        controls={isAdmin}
        playsInline
        onClick={() => {
          if (isAdmin && onTogglePlay) onTogglePlay();
        }}
      >
        <source src={videoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
