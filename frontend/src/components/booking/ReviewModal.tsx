import React, { useState } from 'react';
import { Booking } from '../../types';
import { Button } from '../ui/Button';
import { Star, X } from 'lucide-react';
import { mockStore } from '../../services/mockStore';
import { toast } from 'sonner';

interface ReviewModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  booking,
  isOpen,
  onClose,
  onSubmitted,
}) => {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !booking) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      toast.error('Please write a short comment about your experience with the equipment.');
      return;
    }

    setIsSubmitting(true);
    try {
      mockStore.addReview({
        bookingId: booking.id,
        equipmentId: booking.equipmentId,
        equipmentName: booking.equipmentName,
        reviewerId: booking.renterId,
        reviewerName: booking.renterName,
        rating,
        comment,
        verifiedRental: true,
      });

      toast.success('Thank you! Your verified rental review has been published.');
      if (onSubmitted) onSubmitted();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E2E7DE] relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#526058] hover:bg-[#EFF2EB]"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold font-heading text-[#25312A] mb-1">
          Review Your Rental
        </h3>
        <p className="text-xs text-[#526058] mb-4">
          How was your experience using <strong>{booking.equipmentName}</strong>?
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Star selector */}
          <div className="text-center py-3 bg-[#F7F8F2] rounded-xl border border-[#E2E7DE]">
            <p className="text-xs font-semibold text-[#526058] mb-2">Select Star Rating</p>
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="p-1 text-amber-400 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`w-7 h-7 ${
                      (hoverRating || rating) >= star
                        ? 'fill-amber-400 text-amber-500'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <span className="text-xs font-bold text-[#164B35] mt-1 block">
              {rating === 5 && 'Excellent Machinery & Service'}
              {rating === 4 && 'Good Equipment, Minor Notes'}
              {rating === 3 && 'Average Experience'}
              {rating <= 2 && 'Needs Improvement'}
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#25312A] mb-1.5">
              Your Written Feedback
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell other farmers about machine condition, fuel efficiency, operator skill, or timely delivery..."
              rows={4}
              required
              className="w-full text-xs p-3 rounded-xl border border-[#CBD5C7] focus:outline-none focus:ring-2 focus:ring-[#164B35] bg-[#F7F8F2]/50 text-[#25312A]"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="outline" size="sm" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
              Submit Verified Review
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
