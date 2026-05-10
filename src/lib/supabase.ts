import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ztotbznhfdkbrqwlsbod.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0b3Riem5oZmRrYnJxd2xzYm9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTE2ODYsImV4cCI6MjA4OTQ4NzY4Nn0.39XbhLAgqZqqbidQ791I9_e7BRRho5KcIibtedyIP_c";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
