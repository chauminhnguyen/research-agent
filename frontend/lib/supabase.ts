import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side client creator
export function createServerClient() {
  // For server components/API routes, use the anon key
  // RLS will handle access control based on the authenticated user
  return createClient(supabaseUrl, supabaseAnonKey);
}
