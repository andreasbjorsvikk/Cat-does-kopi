import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

// Static references for Expo env inlining
const expoSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const expoSupabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Fallbacks for local dev using web env vars
const viteSupabaseUrl = process.env.VITE_SUPABASE_URL;
const viteSupabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabaseUrl = expoSupabaseUrl || viteSupabaseUrl || "";
const supabaseAnonKey = expoSupabaseAnonKey || viteSupabaseAnonKey || "";

console.log("[Supabase Config Check]");
console.log("- URL:", supabaseUrl);
console.log("- Anon Key detected:", !!supabaseAnonKey);
if (supabaseAnonKey) {
  console.log("- Anon Key (sanitized):", `${supabaseAnonKey.substring(0, 5)}...${supabaseAnonKey.substring(supabaseAnonKey.length - 5)}`);
} else {
  console.warn("- WARNING: Supabase Anon Key is missing!");
}
if (!supabaseUrl) {
  console.warn("- WARNING: Supabase URL is missing!");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    ...(Platform.OS !== "web" ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}