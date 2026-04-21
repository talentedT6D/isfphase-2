"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { PLAYLIST } from "@/lib/videos";

export interface VideoState {
  videoIndex: number;
  playing: boolean;
}

const SESSION_ID = "session-1";
const STORAGE_KEY = "video-sync-state";
const CHANNEL_NAME = "video-sync";

function readLocalState(): VideoState {
  if (typeof window === "undefined") return { videoIndex: 0, playing: true };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { videoIndex: 0, playing: true };
}

function writeLocalState(state: VideoState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function useVideoSync() {
  const [videoState, setVideoState] = useState<VideoState>(readLocalState);
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Set up BroadcastChannel for cross-tab sync
  useEffect(() => {
    const bc = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = bc;

    bc.onmessage = (event) => {
      const state = event.data as VideoState;
      setVideoState(state);
      writeLocalState(state);
    };

    // Also listen for localStorage changes from other tabs (fallback)
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setVideoState(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      bc.close();
      channelRef.current = null;
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // Supabase: fetch current state on mount
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    async function fetchState() {
      try {
        const { data } = await supabase
          .from("video_state")
          .select("*")
          .eq("session_id", SESSION_ID)
          .single();

        if (data) {
          const state = {
            videoIndex: data.video_index,
            playing: data.playing,
          };
          setVideoState(state);
          writeLocalState(state);
        } else {
          await supabase.from("video_state").upsert({
            session_id: SESSION_ID,
            video_index: 0,
            playing: true,
          });
        }
      } catch {
        // Supabase not available
      }
    }
    fetchState();
  }, []);

  // Supabase: listen for real-time changes
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const channel = supabase
      .channel("video-state-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "video_state",
          filter: `session_id=eq.${SESSION_ID}`,
        },
        (payload) => {
          const data = payload.new as Record<string, unknown>;
          if (data) {
            const state = {
              videoIndex: data.video_index as number,
              playing: data.playing as boolean,
            };
            setVideoState(state);
            writeLocalState(state);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const broadcastState = useCallback((state: VideoState) => {
    writeLocalState(state);
    channelRef.current?.postMessage(state);

    if (isSupabaseConfigured) {
      supabase.from("video_state").upsert({
        session_id: SESSION_ID,
        video_index: state.videoIndex,
        playing: state.playing,
      }).then(() => {});
    }
  }, []);

  const nextVideo = useCallback(() => {
    setVideoState((prev) => {
      const next = prev.videoIndex + 1;
      if (next < PLAYLIST.length) {
        const newState = { videoIndex: next, playing: true };
        broadcastState(newState);
        return newState;
      }
      return prev;
    });
  }, [broadcastState]);

  const prevVideo = useCallback(() => {
    setVideoState((prev) => {
      const prevIdx = prev.videoIndex - 1;
      if (prevIdx >= 0) {
        const newState = { videoIndex: prevIdx, playing: true };
        broadcastState(newState);
        return newState;
      }
      return prev;
    });
  }, [broadcastState]);

  const togglePlay = useCallback(() => {
    setVideoState((prev) => {
      const newState = { ...prev, playing: !prev.playing };
      broadcastState(newState);
      return newState;
    });
  }, [broadcastState]);

  const currentVideo = PLAYLIST[videoState.videoIndex] || PLAYLIST[0];

  return {
    videoState,
    currentVideo,
    nextVideo,
    prevVideo,
    togglePlay,
    totalVideos: PLAYLIST.length,
  };
}
