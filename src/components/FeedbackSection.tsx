'use client';

import React, { useState } from 'react';
import { MobileFeedbackForm } from './MobileFeedbackForm';
import { useMobileDetection } from '@/hooks/useIsMobile';
import { StatusAnnouncement, StarRatingInstructions, FormValidationAnnouncement } from './ScreenReaderOnly';

interface FeedbackData {
  rating: number;
  comment: string;
  // Enhanced dual feedback scoring
  realismRating: number;
  helpfulnessRating: number;
}

interface FeedbackSectionProps {
  onRate?: (rating: number) => void;
  onQuickFeedback?: (type: string) => void;
  onSubmit?: (feedback: FeedbackData) => Promise<boolean>;
}

const FeedbackSection: React.FC<FeedbackSectionProps> = ({
  onRate,
  onQuickFeedback,
  onSubmit,
}) => {
  const { isMobileOrTouch } = useMobileDetection();
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [realismRating, setRealismRating] = useState<number>(0);
  const [helpfulnessRating, setHelpfulnessRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRating = (value: number) => {
    setRating(value);
    setError(null);
    onRate?.(value);
  };

  const handleRealismRating = (value: number) => {
    setRealismRating(value);
    setError(null);
  };

  const handleHelpfulnessRating = (value: number) => {
    setHelpfulnessRating(value);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0 && realismRating === 0 && helpfulnessRating === 0) {
      setError('Please provide at least one rating');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const success = await onSubmit?.({ 
        rating, 
        comment, 
        realismRating, 
        helpfulnessRating 
      });
      if (success) {
        setSubmitted(true);
      }
    } catch (err) {
      setError('Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="feedback-section mobile-card" role="region" aria-labelledby="feedback-success-heading">
        <StatusAnnouncement
          status="Feedback submitted successfully"
          details="Thank you for helping us improve"
          type="success"
        />
        <div className="text-center py-8">
          <h3 id="feedback-success-heading" className="text-green-700 text-responsive-lg font-semibold">
            Thank you for your feedback!
          </h3>
          <p className="text-responsive-sm text-gray-600 mt-2">
            Your input helps us improve the DressUp AI experience.
          </p>
        </div>
      </div>
    );
  }

  // Use mobile-optimized form for mobile/touch devices
  if (isMobileOrTouch) {
    return (
      <MobileFeedbackForm
        onSubmit={onSubmit}
        onQuickFeedback={onQuickFeedback}
      />
    );
  }

  const formErrors = [];
  if (rating === 0 && realismRating === 0 && helpfulnessRating === 0) {
    formErrors.push('Please provide at least one rating');
  }

  return (
    <div className="feedback-section mobile-card" role="main" aria-labelledby="feedback-heading">
      <h2 id="feedback-heading" className="text-responsive-2xl font-bold mb-4">Share Your Feedback</h2>
      
      <StarRatingInstructions />
      
      {/* Form Validation Announcements */}
      {error && (
        <StatusAnnouncement
          status="Form submission error"
          details={error}
          type="error"
        />
      )}

      <FormValidationAnnouncement
        errors={formErrors}
        fieldName="Feedback form"
      />

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* Overall Experience Rating */}
        <fieldset>
          <legend className="block text-responsive-base font-medium mb-2">Overall Experience</legend>
          <div className="flex gap-2 flex-wrap" role="radiogroup" aria-labelledby="overall-rating-instructions" aria-describedby="star-rating-instructions">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => handleRating(star)}
                aria-label={`Rate ${star} star${star > 1 ? 's' : ''} out of 5 for overall experience`}
                aria-pressed={star <= rating}
                className={`text-2xl sm:text-3xl transition-colors touch-target-min focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded ${
                  star <= rating
                    ? 'filled text-yellow-500'
                    : 'text-gray-300 hover:text-yellow-400'
                }`}
              >
                ★
              </button>
            ))}
          </div>
          <p id="overall-rating-instructions" className="text-responsive-xs text-gray-600 mt-1">Rate your overall experience with the outfit generation</p>
          <div className="sr-only" aria-live="polite" aria-atomic="true">
            {rating > 0 && `Overall rating: ${rating} out of 5 stars selected`}
          </div>
        </fieldset>

        {/* Dual Feedback Scoring */}
        <div className="border-t pt-4">
          <h3 className="text-responsive-lg font-medium mb-4" id="detailed-feedback-heading">Detailed Feedback</h3>
          
          {/* Realism Rating */}
          <fieldset className="mb-4">
            <legend className="block text-responsive-base font-medium mb-2">
              How realistic do the generated poses look?
            </legend>
            <div className="flex gap-2 flex-wrap" role="radiogroup" aria-labelledby="realism-scale" aria-describedby="star-rating-instructions">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleRealismRating(star)}
                  aria-label={`Rate ${star} star${star > 1 ? 's' : ''} out of 5 for realism`}
                  aria-pressed={star <= realismRating}
                  className={`text-2xl sm:text-3xl transition-colors touch-target-min focus:outline-none focus:ring-2 focus:ring-blue-400 rounded ${
                    star <= realismRating
                      ? 'filled text-blue-500'
                      : 'text-gray-300 hover:text-blue-400'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
            <div id="realism-scale" className="flex justify-between text-responsive-xs text-gray-600 mt-1">
              <span>Not realistic</span>
              <span>Very realistic</span>
            </div>
            <div className="sr-only" aria-live="polite" aria-atomic="true">
              {realismRating > 0 && `Realism rating: ${realismRating} out of 5 stars selected`}
            </div>
          </fieldset>

          {/* Helpfulness Rating */}
          <fieldset className="mb-4">
            <legend className="block text-responsive-base font-medium mb-2">
              How helpful was this for your outfit decision?
            </legend>
            <div className="flex gap-2 flex-wrap" role="radiogroup" aria-labelledby="helpfulness-scale" aria-describedby="star-rating-instructions">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleHelpfulnessRating(star)}
                  aria-label={`Rate ${star} star${star > 1 ? 's' : ''} out of 5 for helpfulness`}
                  aria-pressed={star <= helpfulnessRating}
                  className={`text-2xl sm:text-3xl transition-colors touch-target-min focus:outline-none focus:ring-2 focus:ring-green-400 rounded ${
                    star <= helpfulnessRating
                      ? 'filled text-green-500'
                      : 'text-gray-300 hover:text-green-400'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
            <div id="helpfulness-scale" className="flex justify-between text-responsive-xs text-gray-600 mt-1">
              <span>Not helpful</span>
              <span>Very helpful</span>
            </div>
            <div className="sr-only" aria-live="polite" aria-atomic="true">
              {helpfulnessRating > 0 && `Helpfulness rating: ${helpfulnessRating} out of 5 stars selected`}
            </div>
          </fieldset>
        </div>

        <div>
          <label htmlFor="feedback-comment" className="block text-responsive-base font-medium mb-2">Comments (optional)</label>
          <textarea
            id="feedback-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us about your experience..."
            className="mobile-input w-full"
            rows={4}
            aria-describedby="comment-help"
          />
          <p id="comment-help" className="text-responsive-xs text-gray-600 mt-1">
            Share any additional thoughts about your experience with DressUp AI
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-4" role="group" aria-labelledby="quick-feedback-heading">
          <h4 id="quick-feedback-heading" className="sr-only">Quick feedback options</h4>
          <button
            type="button"
            onClick={() => onQuickFeedback?.('love-it')}
            className="touch-button bg-green-100 text-green-700 hover:bg-green-200 flex-1 focus:ring-2 focus:ring-green-300"
            aria-label="Quick feedback: Love the results"
          >
            Love It!
          </button>
          <button
            type="button"
            onClick={() => onQuickFeedback?.('needs-work')}
            className="touch-button bg-yellow-100 text-yellow-700 hover:bg-yellow-200 flex-1 focus:ring-2 focus:ring-yellow-300"
            aria-label="Quick feedback: Results need improvement"
          >
            Needs Work
          </button>
          <button
            type="button"
            onClick={() => onQuickFeedback?.('report-issue')}
            className="touch-button bg-red-100 text-red-700 hover:bg-red-200 flex-1 focus:ring-2 focus:ring-red-300"
            aria-label="Quick feedback: Report a technical issue"
          >
            Report Issue
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg" role="alert" aria-live="assertive">
            <p className="text-red-700 text-responsive-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="touch-button w-full bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-300"
          aria-describedby="submit-help"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
        <p id="submit-help" className="text-responsive-xs text-gray-600 mt-2 text-center">
          Your feedback helps us improve the DressUp AI experience for everyone
        </p>
      </form>
    </div>
  );
};

export default FeedbackSection;