'use client';

import React, { useState } from 'react';
import { Star, ThumbsUp, AlertTriangle, MessageSquare, Send } from 'lucide-react';

interface FeedbackData {
  rating: number;
  comment: string;
  realismRating: number;
  helpfulnessRating: number;
}

interface MobileFeedbackFormProps {
  onSubmit?: (feedback: FeedbackData) => Promise<boolean>;
  onQuickFeedback?: (type: string) => void;
}

export function MobileFeedbackForm({ onSubmit, onQuickFeedback }: MobileFeedbackFormProps) {
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [realismRating, setRealismRating] = useState<number>(0);
  const [helpfulnessRating, setHelpfulnessRating] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<'ratings' | 'comment' | null>('ratings');

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
      if (success !== false) {
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
      <div className="mobile-card text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
          <ThumbsUp className="w-8 h-8 text-green-600" />
        </div>
        <p className="text-responsive-lg font-semibold text-green-600">
          Thank you for your feedback!
        </p>
        <p className="text-responsive-sm text-gray-600 mt-2">
          Your input helps us improve the experience
        </p>
      </div>
    );
  }

  const StarRating = ({ 
    value, 
    onChange, 
    color = 'yellow',
    size = 'large' 
  }: { 
    value: number; 
    onChange: (val: number) => void; 
    color?: string;
    size?: 'small' | 'large';
  }) => {
    const colorClasses = {
      yellow: 'text-yellow-500',
      blue: 'text-blue-500',
      green: 'text-green-500'
    }[color] || 'text-yellow-500';

    const sizeClasses = size === 'large' ? 'w-10 h-10' : 'w-8 h-8';

    return (
      <div className="flex gap-2 justify-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => {
              onChange(star);
              setError(null);
            }}
            className={`touch-target-min transition-all transform active:scale-110 ${
              star <= value
                ? colorClasses
                : 'text-gray-300'
            }`}
            aria-label={`${star} stars`}
          >
            <Star 
              className={`${sizeClasses} ${star <= value ? 'fill-current' : ''}`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="mobile-feedback-form">
      <div className="mobile-card">
        <h2 className="text-responsive-2xl font-bold mb-6 text-center">
          Share Your Feedback
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Quick Feedback Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onQuickFeedback?.('love-it')}
              className="touch-button bg-green-100 text-green-700 hover:bg-green-200 flex flex-col items-center py-4"
            >
              <ThumbsUp className="w-6 h-6 mb-1" />
              <span className="text-responsive-xs">Love It!</span>
            </button>
            <button
              type="button"
              onClick={() => onQuickFeedback?.('needs-work')}
              className="touch-button bg-yellow-100 text-yellow-700 hover:bg-yellow-200 flex flex-col items-center py-4"
            >
              <MessageSquare className="w-6 h-6 mb-1" />
              <span className="text-responsive-xs">Needs Work</span>
            </button>
            <button
              type="button"
              onClick={() => onQuickFeedback?.('report-issue')}
              className="touch-button bg-red-100 text-red-700 hover:bg-red-200 flex flex-col items-center py-4"
            >
              <AlertTriangle className="w-6 h-6 mb-1" />
              <span className="text-responsive-xs">Report Issue</span>
            </button>
          </div>

          {/* Collapsible Ratings Section */}
          <div className="border rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setExpandedSection(expandedSection === 'ratings' ? null : 'ratings')}
              className="w-full p-4 bg-gray-50 flex items-center justify-between"
            >
              <span className="text-responsive-base font-medium">Rate Your Experience</span>
              <span className="text-responsive-sm text-gray-500">
                {expandedSection === 'ratings' ? '−' : '+'}
              </span>
            </button>
            
            {expandedSection === 'ratings' && (
              <div className="p-4 space-y-6">
                {/* Overall Experience Rating */}
                <div>
                  <label className="block text-responsive-base font-medium mb-3 text-center">
                    Overall Experience
                  </label>
                  <StarRating value={rating} onChange={setRating} color="yellow" />
                  <p className="text-responsive-xs text-gray-500 text-center mt-2">
                    Rate your overall experience
                  </p>
                </div>

                {/* Realism Rating */}
                <div>
                  <label className="block text-responsive-base font-medium mb-3 text-center">
                    How Realistic?
                  </label>
                  <StarRating value={realismRating} onChange={setRealismRating} color="blue" />
                  <div className="flex justify-between text-responsive-xs text-gray-500 mt-2">
                    <span>Not realistic</span>
                    <span>Very realistic</span>
                  </div>
                </div>

                {/* Helpfulness Rating */}
                <div>
                  <label className="block text-responsive-base font-medium mb-3 text-center">
                    How Helpful?
                  </label>
                  <StarRating value={helpfulnessRating} onChange={setHelpfulnessRating} color="green" />
                  <div className="flex justify-between text-responsive-xs text-gray-500 mt-2">
                    <span>Not helpful</span>
                    <span>Very helpful</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Collapsible Comment Section */}
          <div className="border rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setExpandedSection(expandedSection === 'comment' ? null : 'comment')}
              className="w-full p-4 bg-gray-50 flex items-center justify-between"
            >
              <span className="text-responsive-base font-medium">Add Comments (Optional)</span>
              <span className="text-responsive-sm text-gray-500">
                {expandedSection === 'comment' ? '−' : '+'}
              </span>
            </button>
            
            {expandedSection === 'comment' && (
              <div className="p-4">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tell us about your experience..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-responsive-base"
                  rows={4}
                />
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-responsive-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="touch-button w-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Submit Feedback</span>
              </>
            )}
          </button>
        </form>

        {/* Visual Indicator */}
        {(rating > 0 || realismRating > 0 || helpfulnessRating > 0) && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-responsive-xs text-blue-700 text-center">
              {rating > 0 && `Overall: ${rating}/5`}
              {rating > 0 && (realismRating > 0 || helpfulnessRating > 0) && ' • '}
              {realismRating > 0 && `Realism: ${realismRating}/5`}
              {realismRating > 0 && helpfulnessRating > 0 && ' • '}
              {helpfulnessRating > 0 && `Helpful: ${helpfulnessRating}/5`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}