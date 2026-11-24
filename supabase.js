// ============================================================================
// AI Ready Quiz Portal - Supabase Client Bridge
// Supports live Supabase cloud sync + instant local mock fallback
// ============================================================================

let supabaseClient = null;

export function getSupabaseCredentials() {
  const envUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || '';
  const envKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || '';

  const localUrl = localStorage.getItem('tsdh_supabase_url') || '';
  const localKey = localStorage.getItem('tsdh_supabase_key') || '';

  return {
    url: localUrl || envUrl,
    key: localKey || envKey
  };
}

export function isSupabaseConfigured() {
  const { url, key } = getSupabaseCredentials();
  return Boolean(url && key && url.includes('supabase.co'));
}

export function saveSupabaseCredentials(url, key) {
  if (url && key) {
    localStorage.setItem('tsdh_supabase_url', url.trim());
    localStorage.setItem('tsdh_supabase_key', key.trim());
  } else {
    localStorage.removeItem('tsdh_supabase_url');
    localStorage.removeItem('tsdh_supabase_key');
  }
  supabaseClient = null; // Reset cached client
}

export function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  const { url, key } = getSupabaseCredentials();
  if (!url || !key) return null;

  // Check if window.supabase is available (from CDN or module)
  const createClient = (typeof window !== 'undefined' && window.supabase?.createClient) || null;

  if (createClient) {
    try {
      supabaseClient = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
      return supabaseClient;
    } catch (err) {
      console.warn("Failed to initialize Supabase client:", err);
      return null;
    }
  }

  return null;
}
