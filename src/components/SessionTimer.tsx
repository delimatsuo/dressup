'use client';

import React from 'react';
import { useSessionContext } from './SessionProvider';

export function SessionTimer() {
  const { formattedRemainingTime, extendSession, loading } = useSessionContext();

  const handleExtend = async () => {
    const success = await extendSession(30);
    if (success) {
      console.log('Session extended by 30 minutes');
    }
  };

  if (loading) {
    return (
      <div className="fixed top-4 right-4 bg-white rounded-lg shadow-md p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-24"></div>
        </div>
      </div>
    );
  }

  const timeNumber = parseInt(formattedRemainingTime.split(':')[0]);
  const isLowTime = timeNumber < 5; // Less than 5 minutes

  return (
    <div className="fixed top-4 right-4 bg-white rounded-lg shadow-md p-4 z-50">
      <div className="flex items-center space-x-3">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Session Time</p>
          <p className={`text-2xl font-bold tabular-nums ${
            isLowTime ? 'text-red-600 animate-pulse' : 'text-gray-900'
          }`}>
            {formattedRemainingTime}
          </p>
        </div>
        {isLowTime && (
          <button
            onClick={handleExtend}
            className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            Extend +30min
          </button>
        )}
      </div>
      {isLowTime && (
        <p className="text-xs text-red-600 mt-2">
          Your session will expire soon. Extend to keep your photos.
        </p>
      )}
    </div>
  );
}