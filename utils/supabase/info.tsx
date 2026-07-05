/* FriendNest Supabase configuration
   Create a .env file from .env.example and paste your own Supabase values.

   Supported formats:
   1) VITE_SUPABASE_URL=https://your-project-id.supabase.co
   2) VITE_SUPABASE_PROJECT_ID=your-project-id
*/

const env = (import.meta as any).env || {};

const rawSupabaseUrl = (env.VITE_SUPABASE_URL || "").trim();
const rawProjectIdOrUrl = (env.VITE_SUPABASE_PROJECT_ID || "").trim();

function cleanSupabaseUrl(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) return trimmed;
  return `https://${trimmed}.supabase.co`;
}

function extractProjectId(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  const match = trimmed.match(/^https?:\/\/([^.]+)\.supabase\.co/i);
  return match ? match[1] : trimmed;
}

export const supabaseUrl = cleanSupabaseUrl(rawSupabaseUrl || rawProjectIdOrUrl);
export const projectId = extractProjectId(rawSupabaseUrl || rawProjectIdOrUrl);
export const publicAnonKey = (env.VITE_SUPABASE_ANON_KEY || "").trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  publicAnonKey &&
  !supabaseUrl.includes("your_supabase") &&
  !supabaseUrl.includes("your-project") &&
  !publicAnonKey.includes("your_supabase") &&
  !publicAnonKey.includes("your_anon") &&
  !publicAnonKey.includes("placeholder")
);
