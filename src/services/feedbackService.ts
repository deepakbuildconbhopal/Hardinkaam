import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Booking, Review } from '../types';

export interface SubmitFeedbackParams {
  booking: Booking;
  rating: number;
  comment: string;
  tags?: string[];
  customerId: string;
  customerName?: string;
}

export interface FeedbackSubmissionResult {
  success: boolean;
  reviewId?: string;
  error?: string;
}

/**
 * Service to handle customer feedback & review submission
 * Ensures:
 * 1. Review is stored in `/reviews` with validated 1-5 integer rating.
 * 2. Booking is updated with `isReviewed: true`, `rating`, `reviewComment`.
 * 3. Professional profile average rating is recalculated safely.
 * 4. Suppresses re-prompting by setting local storage flags.
 */
class FeedbackService {
  private readonly DISMISSED_KEY_PREFIX = 'hardinkaam_feedback_dismissed_';
  private readonly SUBMITTED_KEY_PREFIX = 'hardinkaam_feedback_submitted_';

  /**
   * Check if a booking feedback prompt has already been dismissed or submitted
   */
  public hasHandledFeedback(bookingId: string): boolean {
    if (!bookingId) return true;
    try {
      const isDismissed = localStorage.getItem(`${this.DISMISSED_KEY_PREFIX}${bookingId}`);
      const isSubmitted = localStorage.getItem(`${this.SUBMITTED_KEY_PREFIX}${bookingId}`);
      return Boolean(isDismissed || isSubmitted);
    } catch {
      return false;
    }
  }

  /**
   * Mark feedback dialog as dismissed (user clicked "Remind me later" or "Skip")
   */
  public markDismissed(bookingId: string): void {
    if (!bookingId) return;
    try {
      localStorage.setItem(`${this.DISMISSED_KEY_PREFIX}${bookingId}`, Date.now().toString());
    } catch (e) {
      console.warn('Could not store feedback dismissal state', e);
    }
  }

  /**
   * Mark feedback as completed in local storage
   */
  public markSubmitted(bookingId: string): void {
    if (!bookingId) return;
    try {
      localStorage.setItem(`${this.SUBMITTED_KEY_PREFIX}${bookingId}`, Date.now().toString());
    } catch (e) {
      console.warn('Could not store feedback submitted state', e);
    }
  }

  /**
   * Submits post-service customer feedback & rating
   */
  public async submitPostServiceFeedback(
    params: SubmitFeedbackParams
  ): Promise<FeedbackSubmissionResult> {
    const { booking, rating, comment, tags, customerId, customerName } = params;

    // Validation
    const cleanRating = Math.max(1, Math.min(5, Math.round(rating)));
    const nowIso = new Date().toISOString();

    const formattedComment =
      tags && tags.length > 0
        ? `${comment.trim() ? comment.trim() + '\n\n' : ''}Highlights: ${tags.join(', ')}`
        : comment.trim();

    try {
      // 1. Create document in /reviews collection
      const reviewPayload: Omit<Review, 'id'> = {
        bookingId: booking.id,
        customerId: customerId || booking.customerId || 'customer',
        customerName: customerName || booking.customerName || 'Customer',
        serviceId: booking.serviceId || 'general_service',
        serviceManId: booking.serviceManId || 'general_pro',
        rating: cleanRating,
        comment: formattedComment,
        createdAt: nowIso,
      };

      const reviewRef = await addDoc(collection(db, 'reviews'), reviewPayload);
      const reviewId = reviewRef.id;

      // 2. Mark booking as reviewed in Firestore
      try {
        const bookingRef = doc(db, 'bookings', booking.id);
        await updateDoc(bookingRef, {
          isReviewed: true,
          rating: cleanRating,
          reviewComment: formattedComment,
          reviewedAt: nowIso,
          updatedAt: nowIso,
        });
      } catch (bkErr) {
        console.warn('Notice: Booking doc update for review:', bkErr);
      }

      // 3. Update professional average rating if serviceManId exists
      if (booking.serviceManId) {
        try {
          const proRef = doc(db, 'service_men', booking.serviceManId);
          const q = query(
            collection(db, 'reviews'),
            where('serviceManId', '==', booking.serviceManId)
          );
          const snaps = await getDocs(q);
          let totalScore = 0;
          let count = 0;
          snaps.forEach((d) => {
            const data = d.data() as Review;
            totalScore += Number(data.rating) || 5;
            count++;
          });
          const newAvg = count > 0 ? Number((totalScore / count).toFixed(2)) : cleanRating;
          await updateDoc(proRef, {
            rating: newAvg,
            ratingCount: count,
          });
        } catch (proErr) {
          console.warn('Notice: Pro rating update note:', proErr);
        }
      }

      // Store in local storage to prevent duplicate prompt popups
      this.markSubmitted(booking.id);

      return {
        success: true,
        reviewId,
      };
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      return {
        success: false,
        error: error.message || 'Failed to submit feedback. Please try again.',
      };
    }
  }
}

export const feedbackService = new FeedbackService();
