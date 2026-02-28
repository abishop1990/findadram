'use client';

import { useState, useCallback } from 'react';

const SESSION_KEY = 'findadram_session_id';
const NAME_KEY = 'findadram_display_name';

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function getStoredDisplayName(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(NAME_KEY);
}

export function useSession() {
  const [sessionId] = useState(getOrCreateSessionId);
  const [displayName, setDisplayNameState] = useState(getStoredDisplayName);

  const setDisplayName = useCallback((name: string) => {
    localStorage.setItem(NAME_KEY, name);
    setDisplayNameState(name);
    // Also update the server
    if (sessionId) {
      fetch('/api/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, display_name: name }),
      }).catch(() => {});
    }
  }, [sessionId]);

  return { sessionId, displayName, setDisplayName, loading: false };
}
