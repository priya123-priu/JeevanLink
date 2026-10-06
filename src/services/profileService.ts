import { supabase, isSupabaseConfigured } from './supabase/supabaseClient';
import type { UserProfile } from '../types/profile';

const LOCAL_PROFILE_KEY = 'jeevanlink_local_profile';

export const profileService = {
  async getProfile(userId: string): Promise<{ data: UserProfile | null; error: string | null }> {
    if (!userId) {
      return { data: null, error: 'User ID is required to fetch profile.' };
    }

    if (!isSupabaseConfigured) {
      const stored = localStorage.getItem(`${LOCAL_PROFILE_KEY}_${userId}`);
      if (stored) {
        try {
          return { data: JSON.parse(stored), error: null };
        } catch {
          // fallback
        }
      }
      return {
        data: {
          id: userId,
          full_name: 'Registered Citizen',
          age: 32,
          phone: '+919876543210',
          people_count: 1,
          emergency_status: 'Safe / Standby',
          medical_notes: 'None',
          blood_group: 'O+',
          address: 'Block B, Sector 4, New Delhi',
        },
        error: null,
      };
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 means no row found, which can happen on first login
        return { data: null, error: error.message };
      }

      if (!data) {
        // Return default empty profile matching auth user
        return {
          data: {
            id: userId,
            full_name: '',
            age: null,
            phone: '',
            people_count: 1,
            emergency_status: 'Safe / Standby',
          },
          error: null,
        };
      }

      return { data: data as UserProfile, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to load profile.' };
    }
  },

  async saveProfile(profile: Partial<UserProfile> & { id: string }): Promise<{ data: UserProfile | null; error: string | null }> {
    if (!profile.id) {
      return { data: null, error: 'Missing authenticated user ID.' };
    }

    const payload = {
      ...profile,
      updated_at: new Date().toISOString(),
    };

    if (!isSupabaseConfigured) {
      localStorage.setItem(`${LOCAL_PROFILE_KEY}_${profile.id}`, JSON.stringify(payload));
      return { data: payload as UserProfile, error: null };
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert(payload)
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message };
      }

      return { data: data as UserProfile, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || 'Failed to update profile.' };
    }
  },
};
