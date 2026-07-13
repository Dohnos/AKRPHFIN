/* ==========================================================
   Supabase konfigurace – SPOLEČNÁ pro appku i dashboard.

   👉 Doplň své údaje ze Supabase:
      Project Settings → API
        - Project URL      → SUPABASE_URL
        - anon public key  → SUPABASE_ANON_KEY

   Dokud tu zůstanou placeholdery, appka poběží jen s Excelem
   (import do dashboardu se tiše přeskočí).
   ==========================================================*/
const SUPABASE_URL = "https://mptsvdlylhoxdizucedg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wdHN2ZGx5bGhveGRpenVjZWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4NjE5NzAsImV4cCI6MjA5OTQzNzk3MH0.Rt7U3Pay1YL2XWhxSS4rbL_nKwReSBjOo4waRSBUid8";

// Inicializace klienta. Knihovna supabase-js musí být načtená DŘÍV než tento soubor.
window.supabaseClient =
  window.supabase &&
  SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_URL.includes("YOUR-PROJECT")
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;
