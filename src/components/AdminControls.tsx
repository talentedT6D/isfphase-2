"use client";

interface AdminControlsProps {
  videoIndex: number;
  totalVideos: number;
  playing: boolean;
  onNext: () => void;
  onPrev: () => void;
  onTogglePlay: () => void;
}

export default function AdminControls({
  videoIndex,
  totalVideos,
  playing,
  onNext,
  onPrev,
  onTogglePlay,
}: AdminControlsProps) {
  return (
    <div className="flex items-center gap-4">
      <button
        onClick={onPrev}
        disabled={videoIndex === 0}
        className="px-6 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600
                   text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
      >
        Previous
      </button>

      <button
        onClick={onTogglePlay}
        className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg
                   transition-colors min-w-[100px]"
      >
        {playing ? "Pause" : "Play"}
      </button>

      <span className="text-gray-400 font-mono text-sm min-w-[80px] text-center">
        {totalVideos > 0 ? `${videoIndex + 1} / ${totalVideos}` : "No videos"}
      </span>

      <button
        onClick={onNext}
        disabled={videoIndex >= totalVideos - 1}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600
                   text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
      >
        Next
      </button>
    </div>
  );
}
