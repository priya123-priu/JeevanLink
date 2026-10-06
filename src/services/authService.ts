import { supabase, isSupabaseConfigured } from './supabase/supabaseClient';
import type { User, Session, AuthError } from '@supabase/supabase-js';

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isSessionExpired: boolean;
  error: string | null;
  isSimulationUser: boolean;
}

export const authService = {
  async getInitialSession(): Promise<{ session: Session | null; user: User | null; isExpired: boolean }> {
    if (!isSupabaseConfigured) {
      // Check if local simulated user was activated
      const simUserRaw = sessionStorage.getItem('jeevanlink_sim_user');
      if (simUserRaw) {
        try {
          const simUser = JSON.parse(simUserRaw);
          return { session: null, user: simUser, isExpired: false };
        } catch {
          sessionStorage.removeItem('jeevanlink_sim_user');
        }
      }
      return { session: null, user: null, isExpired: false };
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        return { session: null, user: null, isExpired: error.message.includes('expired') };
      }
      return { session, user: session?.user ?? null, isExpired: false };
    } catch {
      return { session: null, user: null, isExpired: false };
    }
  },

  async signUp(email: string, password: string, fullName: string): Promise<{ user: User | null; error: AuthError | null }> {
    if (!isSupabaseConfigured) {
      // Simulation mode sign up
      const simUser: User = {
        id: 'sim-user-' + Math.random().toString(36).substring(2, 9),
        app_metadata: {},
        user_metadata: { full_name: fullName },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        email,
      };
      sessionStorage.setItem('jeevanlink_sim_user', JSON.stringify(simUser));
      return { user: simUser, error: null };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) return { user: null, error };

    // Create initial profile in 'profiles' table if user is created
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: fullName,
        people_count: 1,
        emergency_status: 'Safe / Standby',
        updated_at: new Date().toISOString(),
      });
    }

    return { user: data.user, error: null };
  },

  async signIn(email: string, password: string): Promise<{ user: User | null; error: AuthError | null }> {
    if (!isSupabaseConfigured) {
      const simUser: User = {
        id: 'sim-user-local',
        app_metadata: {},
        user_metadata: { full_name: email.split('@')[0] || 'Demo Citizen' },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        email,
      };
      sessionStorage.setItem('jeevanlink_sim_user', JSON.stringify(simUser));
      return { user: simUser, error: null };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { user: null, error };
    return { user: data.user, error: null };
  },

  async signOut(): Promise<{ error: Error | null }> {
    sessionStorage.removeItem('jeevanlink_sim_user');
    if (!isSupabaseConfigured) {
      return { error: null };
    }

    try {
      const { error } = await supabase.auth.signOut();
      return { error: error ? new Error(error.message) : null };
    } catch (e: any) {
      return { error: e };
    }
  },

  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    if (!isSupabaseConfigured) {
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
    return supabase.auth.onAuthStateChange(callback);
  },
};
