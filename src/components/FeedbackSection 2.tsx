'use client';

import React, { useState } from 'react';
import { MobileFeedbackForm } from './MobileFeedbackForm';
import { useMobileDetection } from '@/hooks/useIsMobile';

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
      <div className="feedback-section mobile-card">
        <div className="text-center py-8">
          <p className="text-green-500 text-responsive-lg font-semibold">
            Thank you for your feedback!
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

  return (
    <div className="feedback-section mobile-card">
      <h2 className="text-responsive-2xl font-bold mb-4">Share Your Feedback</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Overall Experience Rating */}
        <div>
          <label className="block text-responsive-base font-medium mb-2">Overall Experience</label>
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => handleRating(star)}
                aria-label={`Overall rating ${star} stars`}
                className={`text-2xl sm:text-3xl transition-colors touch-target-min ${
                  star <= rating
                    ? 'filled text-yellow-500'
                    : 'text-gray-300 hover:text-yellow-400'
                }`}
              >
                ★
              </button>
            ))}
          </div>
          <p className="text-responsive-xs text-gray-500 mt-1">Rate your overall experience with the outfit generation</p>
        </div>

        {/* Dual Feedback Scoring */}
        <div className="border-t pt-4">
          <h3 className="text-responsive-lg font-medium mb-4">Detailed Feedback</h3>
          
          {/* Realism Rating */}
          <div className="mb-4">
            <label className="block text-responsive-base font-medium mb-2">
              How realistic do the generated poses look?
            </label>
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleRealismRating(star)}
                  aria-label={`Realism rating ${star} stars`}
                  className={`text-2xl sm:text-3xl transition-colors touch-target-min ${
                    star <= realismRating
                      ? 'filled text-blue-500'
                      : 'text-gray-300 hover:text-blue-400'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
            <div className="flex justify-between text-responsive-xs text-gray-500 mt-1">
              <span>Not realistic</span>
              <span>Very realistic</span>
            </div>
          </div>

          {/* Helpfulness Rating */}
          <div className="mb-4">
            <label className="block text-responsive-base font-medium mb-2">
              How helpful was this for your outfit decision?
            </label>
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleHelpfulnessRating(star)}
                  aria-label={`Helpfulness rating ${star} stars`}
                  className={`text-2xl sm:text-3xl transition-colors touch-target-min ${
                    star <= helpfulnessRating
                      ? 'filled text-green-500'
                      : 'text-gray-300 hover:text-green-400'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
            <div className="flex justify-between text-responsive-xs text-gray-500 mt-1">
              <span>Not helpful</span>
              <span>Very helpful</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-responsive-base font-medium mb-2">Comments (optional)</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us about your experience..."
            className="mobile-input w-full"
            rows={4}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <button
            type="button"
            onClick={() => onQuickFeedback?.('love-it')}
            className="touch-button bg-green-100 text-green-700 hover:bg-green-200 flex-1"
          >
            Love It!
          </button>
          <button
            type="button"
            onClick={() => onQuickFeedback?.('needs-work')}
            className="touch-button bg-yellow-100 text-yellow-700 hover:bg-yellow-200 flex-1"
          >
            Needs Work
          </button>
          <button
            type="button"
            onClick={() => onQuickFeedback?.('report-issue')}
            className="touch-button bg-red-100 text-red-700 hover:bg-red-200 flex-1"
          >
            Report Issue
          </button>
        </div>

        {error && (
          <p className="text-red-500 text-responsive-sm">{error}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="touch-button w-full bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>
    </div>
  );
};

export default FeedbackSection;