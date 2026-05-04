import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://qvbsmpwvyrxkgzptwyhj.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2YnNtcHd2eXJ4a2d6cHR3eWhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNDQxMTMsImV4cCI6MjA5MDkyMDExM30.g7lPGRaW8sdQ9LFACdvc9UWgAhGGOazIIKB4ZWJyxGE";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
