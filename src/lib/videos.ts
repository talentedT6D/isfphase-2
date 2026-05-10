export interface Video {
  id: string;
  title: string;
  url: string;
  creator?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  category?: string | null;
}

// Generated at build/dev time from public/submissions(-set-2)/*/info.txt
// by scripts/generate-playlist.mjs.
export { PLAYLIST, PLAYLIST_SET_1, PLAYLIST_SET_2, PLAYLIST_SET_3 } from "./playlist.generated";

export type SubmissionSet = "set1" | "set2" | "set3";
