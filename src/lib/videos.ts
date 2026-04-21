export interface Video {
  id: string;
  title: string;
  url: string;
}

// Videos served from /public/videos/ folder
// Add your .mp4 files to frontend/public/videos/ and list them here
// The id (e.g. "v0") is used as the key in Supabase ratings table
export const PLAYLIST: Video[] = [
  { id: "v0", title: "Video 0", url: "/videos/0.mp4" },
  { id: "v1", title: "Video 1", url: "/videos/1.mp4" },
  { id: "v2", title: "Video 2", url: "/videos/2.mp4" },
  { id: "v3", title: "Video 3", url: "/videos/3.mp4" },
  { id: "v4", title: "Video 4", url: "/videos/4.mp4" },
  { id: "v5", title: "Video 5", url: "/videos/5.mp4" },
  { id: "v6", title: "Video 6", url: "/videos/6.mp4" },
];
