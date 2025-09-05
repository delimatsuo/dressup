'use client';

import React, { useState } from 'react';

interface FeedbackData {
  rating: number;
  comment: string;
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
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRating = (value: number) => {
    setRating(value);
    setError(null);
    onRate?.(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      setError('Please provide a rating');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const success = await onSubmit?.({ rating, comment });
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
      <div className="feedback-section p-6 bg-white rounded-lg shadow-md">
        <div className="text-center py-8">
          <p className="text-green-500 text-lg font-semibold">
            Thank you for your feedback!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="feedback-section p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Share Your Feedback</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Rate your experience</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => handleRating(star)}
                aria-label={`Star ${star}`}
                className={`text-2xl transition-colors ${
                  star <= rating
                    ? 'filled text-yellow-500'
                    : 'text-gray-300 hover:text-yellow-400'
                }`}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Comments (optional)</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us about your experience..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
          />
        </div>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => onQuickFeedback?.('love-it')}
            className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
          >
            Love It!
          </button>
          <button
            type="button"
            onClick={() => onQuickFeedback?.('needs-work')}
            className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
          >
            Needs Work
          </button>
          <button
            type="button"
            onClick={() => onQuickFeedback?.('report-issue')}
            className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            Report Issue
          </button>
        </div>

        {error && (
          <p className="text-red-500 text-sm">{error}</p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>
    </div>
  );
};

export default FeedbackSection;