import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import type { UserProfile } from '../types/profile';
import { authService } from '../services/authService';
import { profileService } from '../services/profileService';
import { isSupabaseConfigured, supabaseConfigError } from '../services/supabase/supabaseClient';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isSessionExpired: boolean;
  isConfigured: boolean;
  configError: string | null;
  isSimulationUser: boolean;
  signIn: (email: string, pass: string) => Promise<{ success: boolean; error: string | null }>;
  signUp: (email: string, pass: string, name: string) => Promise<{ success: boolean; error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ success: boolean; error: string | null }>;
  refreshProfile: () => Promise<void>;
  enableDemoUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSessionExpired, setIsSessionExpired] = useState<boolean>(false);
  const [isSimulationUser, setIsSimulationUser] = useState<boolean>(false);

  const fetchProfileForUser = useCallback(async (userId: string) => {
    const res = await profileService.getProfile(userId);
    if (res.data) {
      setProfile(res.data);
    }
  }, []);

  const loadAuth = useCallback(async () => {
    setIsLoading(true);
    const { session: initialSession, user: initialUser, isExpired } = await authService.getInitialSession();
    setSession(initialSession);
    setUser(initialUser);
    setIsSessionExpired(isExpired);
    setIsSimulationUser(!isSupabaseConfigured || initialUser?.id.startsWith('sim-') || false);

    if (initialUser) {
      await fetchProfileForUser(initialUser.id);
    } else {
      setProfile(null);
    }
    setIsLoading(false);
  }, [fetchProfileForUser]);

  useEffect(() => {
    loadAuth();

    const { data: authListener } = authService.onAuthStateChange(async (event, currentSession) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setIsSessionExpired(false);
        if (currentSession?.user) {
          await fetchProfileForUser(currentSession.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setProfile(null);
      } else if (event === 'USER_UPDATED') {
        setUser(currentSession?.user ?? null);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [loadAuth, fetchProfileForUser]);

  const signIn = async (email: string, pass: string) => {
    setIsLoading(true);
    const { user: authedUser, error } = await authService.signIn(email, pass);
    setIsLoading(false);

    if (error) {
      return { success: false, error: error.message };
    }

    if (authedUser) {
      setUser(authedUser);
      setIsSimulationUser(!isSupabaseConfigured || authedUser.id.startsWith('sim-'));
      await fetchProfileForUser(authedUser.id);
      return { success: true, error: null };
    }

    return { success: false, error: 'Sign in failed.' };
  };

  const signUp = async (email: string, pass: string, name: string) => {
    setIsLoading(true);
    const { user: newUser, error } = await authService.signUp(email, pass, name);
    setIsLoading(false);

    if (error) {
      return { success: false, error: error.message };
    }

    if (newUser) {
      setUser(newUser);
      setIsSimulationUser(!isSupabaseConfigured || newUser.id.startsWith('sim-'));
      await fetchProfileForUser(newUser.id);
      return { success: true, error: null };
    }

    return { success: false, error: 'Sign up failed.' };
  };

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsSimulationUser(false);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { success: false, error: 'Authentication required.' };
    const res = await profileService.saveProfile({
      ...updates,
      id: user.id,
    });
    if (res.data) {
      setProfile(res.data);
      return { success: true, error: null };
    }
    return { success: false, error: res.error || 'Failed to update profile.' };
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfileForUser(user.id);
    }
  };

  const enableDemoUser = () => {
    const demoUser: User = {
      id: 'sim-user-demo',
      app_metadata: {},
      user_metadata: { full_name: 'Rajesh K. Verma' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email: 'rajesh.demo@jeevanlink.org',
    };
    sessionStorage.setItem('jeevanlink_sim_user', JSON.stringify(demoUser));
    setUser(demoUser);
    setIsSimulationUser(true);
    setProfile({
      id: demoUser.id,
      full_name: 'Rajesh K. Verma',
      age: 38,
      phone: '+919876543210',
      people_count: 2,
      emergency_status: 'Safe / Standby',
      blood_group: 'B+',
      medical_notes: 'Asthma inhaler in pocket',
      address: 'Flat 402, Shivalik Tower, Delhi NCR',
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isSessionExpired,
        isConfigured: isSupabaseConfigured,
        configError: supabaseConfigError,
        isSimulationUser,
        signIn,
        signUp,
        signOut,
        updateProfile,
        refreshProfile,
        enableDemoUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
