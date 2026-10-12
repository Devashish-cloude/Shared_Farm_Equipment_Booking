import { useState, useEffect } from 'react';
import { Star, ShieldCheck, Loader2 } from 'lucide-react';
import { api } from '../../services/api.js';

interface ReviewItem {
  id: string;
  reviewerName: string;
  rating: number;
  comment: string;
  review_type: string;
  created_at: string;
}

interface ReviewListProps {
  equipmentId: string;
  refreshTrigger?: number;
}

export const ReviewList: React.FC<ReviewListProps> = ({ equipmentId, refreshTrigger }) => {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [ratingAvg, setRatingAvg] = useState<number>(0);
  const [ratingCount, setRatingCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        const res = await api.getEquipmentReviews(equipmentId);
        setReviews(res.data.reviews || []);
        setRatingAvg(res.data.ratingAvg || 0);
        setRatingCount(res.data.ratingCount || 0);
      } catch (err) {
        console.error('Failed to load reviews:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [equipmentId, refreshTrigger]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl p-5 shadow-xl space-y-4">
      {/* Header with Aggregate Rating */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Star className="w-5 h-5 fill-amber-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-sm">Verified Equipment Reviews</h3>
            <p className="text-xs text-slate-400">Authentic post-rental feedback</p>
          </div>
        </div>

        <div className="flex items-baseline gap-1.5 px-3 py-1 rounded-full bg-slate-950 border border-slate-800">
          <span className="font-mono text-base font-extrabold text-amber-400">
            {ratingAvg.toFixed(1)}
          </span>
          <span className="text-xs text-slate-400">/ 5.0</span>
          <span className="text-[11px] text-slate-500 ml-1">({ratingCount} reviews)</span>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-6 flex items-center justify-center gap-2 text-slate-400 text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
            <span>Loading reviews...</span>
          </div>
        ) : reviews.length === 0 ? (
          <div className="p-6 text-center space-y-1">
            <p className="text-xs font-semibold text-slate-400">No reviews published yet</p>
            <p className="text-[11px] text-slate-500">
              Be the first verified renter to rate this machine after completion!
            </p>
          </div>
        ) : (
          reviews.map((r) => (
            <div
              key={r.id}
              className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xs font-bold">
                    {r.reviewerName.charAt(0)}
                  </div>
                  <span className="text-xs font-semibold text-slate-200">{r.reviewerName}</span>
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400/90 font-medium bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-800/40">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Verified Rental</span>
                  </span>
                </div>

                {/* Stars */}
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < r.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-700'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed italic">"{r.comment}"</p>

              <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-slate-900">
                <span className="capitalize text-slate-400">
                  {r.review_type === 'renter_to_owner' ? 'Renter Review' : 'Owner Review'}
                </span>
                <span>{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
