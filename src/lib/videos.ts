export type SubmissionSet = "one" | "two";

export interface Video {
  id: string;
  title: string;
  url: string;
  creator?: string | null;
  set: SubmissionSet;
}

export interface SetMeta {
  key: SubmissionSet;
  label: string;
  shortLabel: string;
  sessionId: string;
}

// Each set gets its own session_id so ratings stay isolated.
export const SETS: SetMeta[] = [
  { key: "one", label: "Submission Set 1", shortLabel: "SET 1", sessionId: "session-1" },
  { key: "two", label: "Submission Set 2", shortLabel: "SET 2", sessionId: "session-2" },
];

export const DEFAULT_SET: SubmissionSet = "one";

export function getSetMeta(key: SubmissionSet): SetMeta {
  return SETS.find((s) => s.key === key) ?? SETS[0];
}

// Generated at build/dev time from public/submissions/*/info.txt and
// public/submission set two/*/info.txt by scripts/generate-playlist.mjs.
export { PLAYLIST } from "./playlist.generated";
