"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const SESSION_ID = "session-1";

// Audience: submit rating for current video
export function useAudienceRating(videoId: string, userId: string) {
  const [rating, setRatingLocal] = useState(0);

  // Reset when video changes
  useEffect(() => {
    setRatingLocal(0);
  }, [videoId]);

  const submitRating = useCallback(
    async (value: number) => {
      const clamped = Math.min(10, Math.max(0, Math.round(value * 10) / 10));
      setRatingLocal(clamped);

      if (videoId && userId && isSupabaseConfigured) {
        await supabase.from("ratings").upsert({
          video_id: videoId,
          user_id: userId,
          session_id: SESSION_ID,
          rating: clamped,
        });
      }
    },
    [videoId, userId]
  );

  return { rating, submitRating };
}

// Admin: listen to aggregate ratings for current video
export function useAdminRatings(videoId: string) {
  const [aggregate, setAggregate] = useState({
    averageRating: 0,
    totalVotes: 0,
  });

  const fetchRatings = useCallback(async () => {
    if (!videoId || !isSupabaseConfigured) {
      setAggregate({ averageRating: 0, totalVotes: 0 });
      return;
    }

    const { data } = await supabase
      .from("ratings")
      .select("rating")
      .eq("video_id", videoId)
      .eq("session_id", SESSION_ID);

    if (data && data.length > 0) {
      const sum = data.reduce((acc, r) => acc + r.rating, 0);
      setAggregate({
        averageRating: Math.round((sum / data.length) * 10) / 10,
        totalVotes: data.length,
      });
    } else {
      setAggregate({ averageRating: 0, totalVotes: 0 });
    }
  }, [videoId]);

  // Fetch on mount and when video changes
  useEffect(() => {
    fetchRatings();
  }, [fetchRatings]);

  // Listen for real-time rating changes
  useEffect(() => {
    if (!videoId || !isSupabaseConfigured) return;

    const channel = supabase
      .channel(`ratings-${videoId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ratings",
          filter: `video_id=eq.${videoId}`,
        },
        () => {
          fetchRatings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [videoId, fetchRatings]);

  return aggregate;
}

// Admin: fetch aggregate ratings for ALL videos in the session
export interface VideoRatingEntry {
  videoId: string;
  avgScore: number;
  totalVotes: number;
  lastJudgedAt: string | null;
}

export function useAllVideoRatings() {
  const [entries, setEntries] = useState<VideoRatingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setEntries([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("ratings")
      .select("video_id, rating, created_at")
      .eq("session_id", SESSION_ID)
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      const grouped: Record<
        string,
        { ratings: number[]; lastAt: string | null }
      > = {};
      for (const row of data) {
        if (!grouped[row.video_id]) {
          grouped[row.video_id] = { ratings: [], lastAt: null };
        }
        grouped[row.video_id].ratings.push(row.rating);
        if (
          !grouped[row.video_id].lastAt ||
          row.created_at > grouped[row.video_id].lastAt!
        ) {
          grouped[row.video_id].lastAt = row.created_at;
        }
      }

      const result: VideoRatingEntry[] = Object.entries(grouped).map(
        ([videoId, info]) => ({
          videoId,
          avgScore: Math.round(
            info.ratings.reduce((a, b) => a + b, 0) / info.ratings.length
          ),
          totalVotes: info.ratings.length,
          lastJudgedAt: info.lastAt,
        })
      );
      result.sort(
        (a, b) =>
          new Date(b.lastJudgedAt || 0).getTime() -
          new Date(a.lastJudgedAt || 0).getTime()
      );
      setEntries(result);
    } else {
      setEntries([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Listen for any rating changes
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel("all-ratings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ratings" },
        () => fetchAll()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  return { entries, loading };
}

// Admin: fetch all ratings grouped by judge (user_id)
export interface JudgeEntry {
  userId: string;
  userName: string;
  videosJudged: number;
  avgScore: number;
  lastActiveAt: string | null;
  ratings: { videoId: string; score: number; createdAt: string | null }[];
}

export function useJudgesData() {
  const [judges, setJudges] = useState<JudgeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJudges = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setJudges([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("ratings")
      .select("user_id, user_name, video_id, rating, created_at")
      .eq("session_id", SESSION_ID)
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      const grouped: Record<
        string,
        {
          userName: string;
          scores: number[];
          lastAt: string | null;
          ratings: { videoId: string; score: number; createdAt: string | null }[];
        }
      > = {};

      for (const row of data) {
        if (!grouped[row.user_id]) {
          grouped[row.user_id] = {
            userName: row.user_name || row.user_id,
            scores: [],
            lastAt: null,
            ratings: [],
          };
        }
        // Update name if a newer row has one
        if (row.user_name) {
          grouped[row.user_id].userName = row.user_name;
        }
        grouped[row.user_id].scores.push(row.rating);
        grouped[row.user_id].ratings.push({
          videoId: row.video_id,
          score: row.rating,
          createdAt: row.created_at,
        });
        if (
          !grouped[row.user_id].lastAt ||
          row.created_at > grouped[row.user_id].lastAt!
        ) {
          grouped[row.user_id].lastAt = row.created_at;
        }
      }

      const result: JudgeEntry[] = Object.entries(grouped).map(
        ([userId, info]) => ({
          userId,
          userName: info.userName,
          videosJudged: info.scores.length,
          avgScore: Math.round(
            info.scores.reduce((a, b) => a + b, 0) / info.scores.length
          ),
          lastActiveAt: info.lastAt,
          ratings: info.ratings,
        })
      );
      result.sort(
        (a, b) =>
          new Date(b.lastActiveAt || 0).getTime() -
          new Date(a.lastActiveAt || 0).getTime()
      );
      setJudges(result);
    } else {
      setJudges([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchJudges();
  }, [fetchJudges]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel("judges-ratings")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ratings" },
        () => fetchJudges()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchJudges]);

  return { judges, loading };
}
