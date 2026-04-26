import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: any;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn('Supabase credentials missing! Please check your .env file.');
  // Create a mock object to prevent crashes when accessing .auth or .from
  supabase = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: async () => ({ data: null, error: new Error('Supabase not configured') }),
      signOut: async () => {}
    },
    from: () => ({
      select: () => ({
        on: () => ({ subscribe: () => ({}) }),
        single: () => ({ data: null, error: new Error('Supabase not configured') })
      }),
      insert: () => ({ select: () => ({ single: () => ({ data: null, error: new Error('Supabase not configured') }) }) }),
      update: () => ({ eq: () => ({ error: new Error('Supabase not configured') }) }),
      delete: () => ({ eq: () => ({ error: new Error('Supabase not configured') }) })
    }),
    channel: () => ({
      on: () => ({ subscribe: () => ({}) })
    }),
    removeChannel: () => {}
  };
}

export { supabase };
