'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Session, User, AuthError } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

export type UserRole = 'user' | 'bar_owner' | 'admin';

export interface AuthProfile {
  id: string;
  sessionId: string;
  displayName: string | null;
  role: UserRole;
  authUserId: string | null;
}

export interface UseAuthReturn {
  user: User | null;
  session: Session | null;
  profile: AuthProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, isBarOwner?: boolean) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
}

const SESSION_KEY = 'findadram_session_id';

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

async function upsertProfile(
  supabase: ReturnType<typeof createClient>,
  authUserId: string,
  sessionId: string,
  role?: UserRole,
): Promise<AuthProfile | null> {
  // Try to find an existing profile linked to this auth user
  const { data: existing } = await supabase
    .from('user_profiles')
    .select('id, session_id, display_name, role, auth_user_id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (existing) {
    return {
      id: existing.id,
      sessionId: existing.session_id,
      displayName: existing.display_name,
      role: (existing.role as UserRole) ?? 'user',
      authUserId: existing.auth_user_id,
    };
  }

  // No linked profile yet — try to claim the anonymous session profile first
  const { data: anonProfile } = await supabase
    .from('user_profiles')
    .select('id, session_id, display_name, role, auth_user_id')
    .eq('session_id', sessionId)
    .is('auth_user_id', null)
    .maybeSingle();

  if (anonProfile) {
    // Upgrade the anonymous profile by linking auth_user_id
    const { data: updated, error } = await supabase
      .from('user_profiles')
      .update({
        auth_user_id: authUserId,
        ...(role && role !== 'user' ? { role } : {}),
      })
      .eq('id', anonProfile.id)
      .select('id, session_id, display_name, role, auth_user_id')
      .single();

    if (!error && updated) {
      return {
        id: updated.id,
        sessionId: updated.session_id,
        displayName: updated.display_name,
        role: (updated.role as UserRole) ?? 'user',
        authUserId: updated.auth_user_id,
      };
    }
  }

  // No session profile found — create a fresh one
  const newSessionId = getOrCreateSessionId();
  const { data: created, error: createError } = await supabase
    .from('user_profiles')
    .insert({
      session_id: newSessionId,
      auth_user_id: authUserId,
      role: role ?? 'user',
    })
    .select('id, session_id, display_name, role, auth_user_id')
    .single();

  if (createError || !created) {
    return null;
  }

  return {
    id: created.id,
    sessionId: created.session_id,
    displayName: created.display_name,
    role: (created.role as UserRole) ?? 'user',
    authUserId: created.auth_user_id,
  };
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    // Hydrate from current session on mount
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        const prof = await upsertProfile(
          supabase,
          currentSession.user.id,
          getOrCreateSessionId(),
        );
        setProfile(prof);
      }

      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, changedSession) => {
        setSession(changedSession);
        setUser(changedSession?.user ?? null);

        if (changedSession?.user) {
          const prof = await upsertProfile(
            supabase,
            changedSession.user.id,
            getOrCreateSessionId(),
          );
          setProfile(prof);
        } else {
          setProfile(null);
        }

        setLoading(false);
      },
    );

    return () => {
      subscription.unsubscribe();
    };
    // supabase client is stable — no dep needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const signUp = useCallback(
    async (email: string, password: string, isBarOwner = false) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Pass the intended role as metadata so the profile upsert can pick it up
          data: { role: isBarOwner ? 'bar_owner' : 'user' },
        },
      });

      // If sign-up succeeded and we have a user right away (email confirm disabled),
      // pre-create the profile with the requested role.
      if (!error && data.user) {
        await upsertProfile(
          supabase,
          data.user.id,
          getOrCreateSessionId(),
          isBarOwner ? 'bar_owner' : 'user',
        );
      }

      return { error };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    setProfile(null);
    return { error };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { user, session, profile, loading, signIn, signUp, signInWithGoogle, signOut };
}
