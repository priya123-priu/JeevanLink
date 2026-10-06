import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Safe environment variable retrieval across Vite and Node test runtimes
const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : ((typeof process !== 'undefined' && process.env) || {});
const supabaseUrl = (env.VITE_SUPABASE_URL || '') as string;
const supabaseAnonKey = (env.VITE_SUPABASE_ANON_KEY || '') as string;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl.trim() !== '' &&
  supabaseAnonKey &&
  supabaseAnonKey.trim() !== '' &&
  supabaseUrl.startsWith('http')
);

export const supabaseConfigError: string | null = !isSupabaseConfigured
  ? 'Supabase credentials (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are not set. JeevanLink is operating in Local Simulation Mode. Connect Supabase in .env to enable cloud synchronization and real authentication.'
  : null;

// Create client if configured, or provide fallback client
export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : createClient('https://placeholder-jeevanlink.supabase.co', 'placeholder-anon-key', {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

/**
 * Returns backend configuration status.
 * Notice: Real SMS is only enabled if the backend explicitly confirms it.
 */
export async function checkBackendSmsCapability(): Promise<{
  realSmsEnabled: boolean;
  provider: string | null;
  message: string;
}> {
  if (!isSupabaseConfigured) {
    return {
      realSmsEnabled: false,
      provider: null,
      message: 'Supabase backend is not configured.',
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke('send-emergency-alert', {
      body: { action: 'check-capability' },
    });

    if (error) {
      // Backend function may not have a check-capability endpoint or real SMS is disabled
      return {
        realSmsEnabled: false,
        provider: null,
        message: 'Backend does not have REAL_SMS_ENABLED active.',
      };
    }

    return {
      realSmsEnabled: Boolean(data?.realSmsEnabled),
      provider: data?.provider || null,
      message: data?.message || 'Checked successfully.',
    };
  } catch {
    return {
      realSmsEnabled: false,
      provider: null,
      message: 'Real SMS is not configured on the backend.',
    };
  }
}
