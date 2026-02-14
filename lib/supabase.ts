
import { createClient } from '@supabase/supabase-js';

/**
 * SAFE ENVIRONMENT VARIABLE ACCESSOR
 * Prevents "ReferenceError: process is not defined" in browser environments.
 */
const getEnvVar = (name: string): string | undefined => {
  try {
    // Attempt to access Vite's import.meta.env
    const metaEnv = (import.meta as any).env;
    if (metaEnv && metaEnv[name]) return metaEnv[name];
  } catch (e) {}

  try {
    // Attempt to access process.env (for Node or polyfilled environments)
    if (typeof process !== 'undefined' && process.env && process.env[name]) {
      return process.env[name];
    }
  } catch (e) {}

  return undefined;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

// Strict check for configuration
export const isSupabaseConfigured = !!(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://placeholder.supabase.co'
);

// Initialize client
// If keys are missing, it uses a placeholder to prevent the app from crashing.
// The UI will detect `isSupabaseConfigured` and switch to Demo Mode.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);
