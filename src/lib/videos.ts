export interface Video {
  id: string;
  title: string;
  url: string;
  creator?: string | null;
}

// Generated at build/dev time from public/submissions/*/info.json
// by scripts/generate-playlist.mjs.
export { PLAYLIST } from "./playlist.generated";
