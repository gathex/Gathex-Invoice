/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || supabaseUrl === 'https://your-supabase-project.supabase.co' || !supabaseAnonKey || supabaseAnonKey === 'your-supabase-anon-key') {
  console.warn(
    '[Supabase Config Warning]: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not configured with real credentials in .env.local. Please configure valid Supabase credentials.'
  );
}

if (!supabaseUrl) {
  throw new Error('[Supabase Config Error]: Missing VITE_SUPABASE_URL in environment configuration (.env.local).');
}

if (!supabaseAnonKey) {
  throw new Error('[Supabase Config Error]: Missing VITE_SUPABASE_ANON_KEY in environment configuration (.env.local).');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
