'use client';

import React, { createContext, useContext } from 'react';
import { useSession } from '@/hooks/useSession';

interface SessionContextType {
  sessionId: string | null;
  remainingTime: number;
  formattedRemainingTime: string;
  loading: boolean;
  error: string | null;
  extendSession: (minutes?: number) => Promise<boolean>;
  addPhotoToSession: (
    photoUrl: string,
    photoType: 'user' | 'garment' | 'generated',
    photoView?: 'front' | 'side' | 'back'
  ) => Promise<boolean>;
  deleteSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | null>(null);

export function useSessionContext() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSessionContext must be used within SessionProvider');
  }
  return context;
}

interface SessionProviderProps {
  children: React.ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const session = useSession();

  return (
    <SessionContext.Provider
      value={{
        sessionId: session.session?.sessionId || null,
        remainingTime: session.remainingTime,
        formattedRemainingTime: session.formattedRemainingTime,
        loading: session.loading,
        error: session.error,
        extendSession: session.extendSession as unknown as (minutes?: number) => Promise<boolean>,
        addPhotoToSession: async () => true,
        deleteSession: async () => {}
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}