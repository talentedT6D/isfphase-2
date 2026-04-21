"use client";

interface RatingSliderProps {
  rating: number;
  onRatingChange: (value: number) => void;
  disabled?: boolean;
}

export default function RatingSlider({
  rating,
  onRatingChange,
  disabled = false,
}: RatingSliderProps) {
  const percentage = (rating / 10) * 100;

  return (
    <div className="w-full max-w-sm">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-300">Your Rating</label>
        <span className="text-3xl font-bold text-white tabular-nums">
          {rating.toFixed(1)}
        </span>
      </div>

      <input
        type="range"
        min="0"
        max="10"
        step="0.1"
        value={rating}
        onChange={(e) => onRatingChange(parseFloat(e.target.value))}
        disabled={disabled}
        className="w-full h-3 rounded-full appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: `linear-gradient(to right, #3b82f6 0%, #8b5cf6 ${percentage}%, #374151 ${percentage}%)`,
        }}
        aria-label="Video rating from 0 to 10"
      />

      <div className="flex justify-between mt-1">
        <span className="text-xs text-gray-500">0</span>
        <span className="text-xs text-gray-500">5</span>
        <span className="text-xs text-gray-500">10</span>
      </div>
    </div>
  );
}
