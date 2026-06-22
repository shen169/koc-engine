"use client";

import { useState } from "react";

interface StarRatingProps {
  /** The target entity being rated (e.g., "Brand X", "Creator_abc123") */
  targetLabel: string;
  /** Called when user confirms rating. rating: 1-5, comment: optional text */
  onSubmit: (rating: number, comment: string) => Promise<void>;
  /** Whether submission is in progress */
  submitting?: boolean;
  /** Error message from submission */
  error?: string;
  /** Success message after submission */
  success?: string;
}

export default function StarRating({
  targetLabel,
  onSubmit,
  submitting = false,
  error = "",
  success = "",
}: StarRatingProps) {
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);
  const [comment, setComment] = useState("");
  const [expanded, setExpanded] = useState(false);

  async function handleSubmit() {
    if (selected < 1 || selected > 5) return;
    await onSubmit(selected, comment);
  }

  // Already submitted successfully
  if (success) {
    return (
      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center">
        <div className="text-3xl mb-2">✅</div>
        <p className="font-semibold text-emerald-700 text-lg">Rating Submitted</p>
        <p className="text-sm text-emerald-600 mt-1">{success}</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6">
      <div className="text-center mb-4">
        <div className="text-2xl mb-1">⭐</div>
        <h3 className="font-semibold text-gray-900 text-lg">
          Rate {targetLabel}
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          How was your collaboration experience?
        </p>
      </div>

      {/* Stars */}
      <div className="flex justify-center gap-1.5 mb-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => {
              setSelected(star);
              setExpanded(true);
            }}
            className="text-3xl transition-transform hover:scale-110 active:scale-95 focus:outline-none"
            aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
          >
            {star <= (hovered || selected) ? "⭐" : "☆"}
          </button>
        ))}
      </div>

      {selected > 0 && (
        <p className="text-center text-sm font-medium text-gray-700 mb-3">
          {["", "😞 Poor", "😐 Fair", "🙂 Good", "😊 Great", "🤩 Excellent"][selected]}
        </p>
      )}

      {/* Optional comment — show after rating selected */}
      {expanded && selected > 0 && (
        <div className="space-y-3">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={`Optional: share your experience with ${targetLabel}...`}
            rows={2}
            maxLength={500}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-pink-200 focus:border-pink-400 outline-none resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{comment.length}/500</span>
            <button
              onClick={handleSubmit}
              disabled={submitting || selected < 1}
              className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm shadow-pink-200"
            >
              {submitting ? "Submitting..." : `Submit ${selected}⭐ Rating`}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500 text-center mt-3">{error}</p>
      )}
    </div>
  );
}
