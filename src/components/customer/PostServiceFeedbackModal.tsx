import React, { useState } from 'react';
import {
  Star,
  CheckCircle2,
  X,
  Sparkles,
  Heart,
  ThumbsUp,
  MessageSquare,
  ShieldCheck,
  AlertCircle,
  Clock,
  Send,
} from 'lucide-react';
import { Booking, Review } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { feedbackService } from '../../services/feedbackService';

interface PostServiceFeedbackModalProps {
  isOpen: boolean;
  booking: Booking | null;
  onClose: () => void;
  onSubmitted?: (review: Review) => void;
}

const RATING_TAGS: Record<number, string[]> = {
  5: [
    'Outstanding Work',
    'Arrived on Time',
    'Polite & Respectful',
    'Spotless Clean Up',
    'Transparent Pricing',
    'Highly Recommended',
  ],
  4: [
    'Good Service',
    'Timely Delivery',
    'Skilled Work',
    'Fair Pricing',
    'Courteous Behaviour',
  ],
  3: [
    'Average Work',
    'Slightly Delayed',
    'Acceptable Quality',
    'Pricing as Quoted',
  ],
  2: [
    'Slow Completion',
    'Needs More Training',
    'Messy Work Area',
    'Communication Issues',
  ],
  1: [
    'Unsatisfactory Quality',
    'Late Arrival',
    'Unprofessional Conduct',
    'Billing Issues',
  ],
};

const RATING_HEADINGS: Record<number, { title: string; subtitle: string; emoji: string }> = {
  5: {
    title: 'Superb Experience!',
    subtitle: 'Everything went beyond expectations.',
    emoji: '🌟',
  },
  4: {
    title: 'Very Good Service!',
    subtitle: 'Satisfied with the professional work done.',
    emoji: '👍',
  },
  3: {
    title: 'Satisfactory / Average',
    subtitle: 'The work met basic expectations.',
    emoji: '🙂',
  },
  2: {
    title: 'Needs Improvement',
    subtitle: 'We are sorry about the inconvenience caused.',
    emoji: '😕',
  },
  1: {
    title: 'Poor Experience',
    subtitle: 'Our support team will personally investigate this.',
    emoji: '⚠️',
  },
};

export const PostServiceFeedbackModal: React.FC<PostServiceFeedbackModalProps> = ({
  isOpen,
  booking,
  onClose,
  onSubmitted,
}) => {
  const { currentUser, userProfile } = useAuth();
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  if (!isOpen || !booking) return null;

  const activeRating = hoverRating || rating;
  const headingInfo = RATING_HEADINGS[activeRating] || RATING_HEADINGS[5];
  const availableTags = RATING_TAGS[rating] || RATING_TAGS[5];

  const handleRatingChange = (newRating: number) => {
    setRating(newRating);
    // Keep compatible tags or reset
    setSelectedTags([]);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSkipOrDismiss = () => {
    feedbackService.markDismissed(booking.id);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const result = await feedbackService.submitPostServiceFeedback({
      booking,
      rating,
      comment,
      tags: selectedTags,
      customerId: currentUser?.uid || booking.customerId,
      customerName: userProfile?.name || booking.customerName || 'Customer',
    });

    setIsSubmitting(false);

    if (result.success) {
      setIsSuccess(true);
      if (onSubmitted) {
        onSubmitted({
          id: result.reviewId || 'rev_' + Date.now(),
          bookingId: booking.id,
          customerId: currentUser?.uid || booking.customerId,
          customerName: userProfile?.name || booking.customerName || 'Customer',
          serviceId: booking.serviceId,
          serviceManId: booking.serviceManId,
          rating,
          comment,
          createdAt: new Date().toISOString(),
        });
      }
      setTimeout(() => {
        onClose();
        setIsSuccess(false);
      }, 1800);
    } else {
      setErrorMsg(result.error || 'Failed to submit feedback. Please try again.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white p-5 relative">
          <button
            type="button"
            onClick={handleSkipOrDismiss}
            aria-label="Close feedback modal"
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 mb-1 text-orange-100 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Service Completed • Feedback Collection</span>
          </div>

          <h2 className="text-xl font-black text-white">How was your service?</h2>
          <p className="text-xs text-orange-100 mt-0.5 line-clamp-1">
            {booking.serviceName} • {booking.serviceManName || 'Hardinkaam Professional'}
          </p>
        </div>

        {/* Modal Body */}
        {isSuccess ? (
          <div className="p-8 text-center space-y-4 animate-in fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div>
              <h3 className="text-lg font-black text-stone-900">Thank You For Your Feedback!</h3>
              <p className="text-xs text-stone-600 mt-1 max-w-xs mx-auto">
                Your rating helps <strong>{booking.serviceManName || 'our professional'}</strong> maintain top service quality across Bhopal.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified Customer Feedback Recorded</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
            {errorMsg && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Interactive Star Rating */}
            <div className="bg-stone-50 rounded-2xl p-4 text-center border border-stone-200/80">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-2">
                Tap a Star to Rate (1 to 5)
              </span>

              <div className="flex items-center justify-center gap-2 sm:gap-3 py-1">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isActive = star <= activeRating;
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => handleRatingChange(star)}
                      className="p-1 transition-transform hover:scale-125 focus:outline-hidden cursor-pointer"
                      title={`${star} Star`}
                    >
                      <Star
                        className={`w-9 h-9 sm:w-10 sm:h-10 transition-colors ${
                          isActive
                            ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                            : 'text-stone-300 stroke-stone-300'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              <div className="mt-2.5">
                <p className="text-sm font-black text-stone-900 flex items-center justify-center gap-1.5">
                  <span>{headingInfo.emoji}</span>
                  <span>{headingInfo.title}</span>
                </p>
                <p className="text-xs text-stone-500 mt-0.5">{headingInfo.subtitle}</p>
              </div>
            </div>

            {/* Quick Positive / Improvement Tags */}
            <div>
              <label className="text-xs font-extrabold text-stone-800 block mb-2">
                {rating >= 4 ? 'What did you like the most?' : 'What could be improved?'}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {availableTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-orange-600 text-white border-orange-600 shadow-xs scale-102'
                          : 'bg-white text-stone-700 border-stone-200 hover:border-orange-300 hover:bg-orange-50/50'
                      }`}
                    >
                      {isSelected ? '✓ ' : '+ '}
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Comment / Review Box */}
            <div>
              <label className="text-xs font-extrabold text-stone-800 block mb-1.5 flex items-center justify-between">
                <span>Write a Review / Feedback</span>
                <span className="text-[11px] font-medium text-stone-400">Optional</span>
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share more details about work quality, technician punctuality, cleaning, or pricing..."
                className="w-full p-3 text-xs rounded-2xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-stone-800 bg-stone-50/50"
              />
            </div>

            {/* Professional Card Snapshot */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50/60 border border-amber-200/70 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-200/70 text-amber-800 font-black flex items-center justify-center text-xs">
                  {(booking.serviceManName || 'P')[0]}
                </div>
                <div>
                  <span className="font-extrabold text-stone-900 block line-clamp-1">
                    {booking.serviceManName || 'Technician'}
                  </span>
                  <span className="text-[10px] text-stone-500">
                    Booking ID #{booking.id.slice(0, 8)}
                  </span>
                </div>
              </div>
              <span className="text-emerald-700 font-extrabold flex items-center gap-1 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified Job
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-stone-100 gap-3">
              <button
                type="button"
                onClick={handleSkipOrDismiss}
                className="px-4 py-2.5 text-xs font-bold text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
              >
                Skip / Later
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs shadow-md shadow-orange-600/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Submitting...' : 'Submit Feedback'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
