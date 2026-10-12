import React, { useState } from 'react';
import { Star, Send, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { api } from '../../services/api.js';

interface ReviewFormProps {
  bookingId: string;
  bookingStatus: string;
  equipmentTitle: string;
  onReviewSubmitted: () => void;
}

export const ReviewForm: React.FC<ReviewFormProps> = ({
  bookingId,
  bookingStatus,
  equipmentTitle,
  onReviewSubmitted,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(false);

  const isCompleted = bookingStatus === 'completed';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || comment.trim().length < 5) {
      setError('Please provide feedback of at least 5 characters.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.createReview({
        bookingId,
        rating,
        comment: comment.trim(),
      });
      setSubmitted(true);
      onReviewSubmitted();
    } catch (err: any) {
      setError(err.message || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  if (!isCompleted) {
    return (
      <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/40 text-center space-y-2">
        <div className="flex justify-center text-amber-400">
          <Star className="w-6 h-6 opacity-40" />
        </div>
        <h4 className="text-sm font-semibold text-slate-300">Reviews Unlock Upon Completion</h4>
        <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
          To maintain authentic quality standards, reviews can only be submitted once the rental session
          for <strong>{equipmentTitle}</strong> has formally ended.
        </p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="p-5 rounded-2xl border border-emerald-800/60 bg-emerald-950/20 text-center space-y-2">
        <div className="flex justify-center text-emerald-400">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h4 className="text-sm font-bold text-slate-100">Review Published!</h4>
        <p className="text-xs text-emerald-300">
          Thank you for rating your rental experience. Your feedback directly updates the equipment's aggregate score.
        </p>
      </div>
    );
  }

  return (
    <form
      id="review-form"
      onSubmit={handleSubmit}
      className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl shadow-xl space-y-4"
    >
      <div className="border-b border-slate-800 pb-3">
        <h4 className="text-sm font-bold text-slate-100">Leave a Verified Review</h4>
        <p className="text-xs text-slate-400">
          Rate performance, mechanical condition, and provider communication for {equipmentTitle}
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-950/40 border border-red-700/50 text-red-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Star Selector */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-300 block">Rating Score</label>
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className="p-1 transition-transform hover:scale-110 focus:outline-none"
            >
              <Star
                className={`w-6 h-6 ${
                  star <= rating
                    ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]'
                    : 'text-slate-600'
                }`}
              />
            </button>
          ))}
          <span className="text-xs font-bold text-slate-300 ml-2 font-mono">
            {rating} of 5 Stars
          </span>
        </div>
      </div>

      {/* Comment Input */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-300 block">Detailed Feedback</label>
        <textarea
          id="review-comment-input"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Describe engine condition, fuel efficiency, field maneuverability, and handover experience..."
          rows={3}
          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 placeholder:text-slate-600 text-xs focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
        />
      </div>

      <button
        id="btn-submit-review"
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-lg shadow-emerald-950 transition-all"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Send className="w-3.5 h-3.5" />
        )}
        <span>Submit Verified Review</span>
      </button>
    </form>
  );
};
