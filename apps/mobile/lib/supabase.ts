import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SUPABASE_URL = "https://udelxwwnyivknslueerr.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZWx4d3dueWl2a25zbHVlZXJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMjcxNTUsImV4cCI6MjA4NjYwMzE1NX0.8v1hv5VPPj9TPjYSH7KK1DiXEx7qrC6ipZnx5bSEfRk";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
