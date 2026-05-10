export interface Video {
  id: string;
  title: string;
  url: string;
  creator?: string | null;
}

// Generated at build/dev time from public/submissions(-set-2)/*/info.txt
// by scripts/generate-playlist.mjs.
export { PLAYLIST, PLAYLIST_SET_1, PLAYLIST_SET_2 } from "./playlist.generated";

export type SubmissionSet = "set1" | "set2";
