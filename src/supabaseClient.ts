import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('SUA-URL') || supabaseAnonKey.includes('SEU-ANON')) {
  console.warn('Atenção: Credenciais do Supabase não configuradas no arquivo .env!');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storage: window.sessionStorage,
    detectSessionInUrl: true
  }
});
