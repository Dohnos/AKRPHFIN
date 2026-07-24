/* ==========================================================
   Jednorázová migrace: Supabase (products) → Firestore (products)

   – Čte VŠECHNY řádky z původní Supabase (přes veřejný anon klíč).
   – Zapisuje je do Firestore, product_id používá jako ID dokumentu.
   – Zachovává všechna pole (created_at, sold, sold_at, raw, …),
     takže se nic neztratí. Původní data v Supabase zůstávají.

   Stránka je za přihlašovací bránou (auth-gate.js) – zápis do
   Firestore projde jen přihlášenému vlastníkovi (viz firestore.rules).
   ========================================================== */

// Zdroj = původní Supabase projekt (hodnoty jsou veřejné, jako dřív).
const SB_URL = "https://mptsvdlylhoxdizucedg.supabase.co";
const SB_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wdHN2ZGx5bGhveGRpenVjZWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4NjE5NzAsImV4cCI6MjA5OTQzNzk3MH0.Rt7U3Pay1YL2XWhxSS4rbL_nKwReSBjOo4waRSBUid8";

const logEl = document.getElementById("log");
const btnLoad = document.getElementById("btn-load");
const btnWrite = document.getElementById("btn-write");
const bar = document.getElementById("bar");
const barFill = document.getElementById("bar-fill");

let sourceRows = null; // načtená data ze Supabase

function log(msg) {
  const t = new Date().toLocaleTimeString("cs-CZ");
  logEl.textContent += `\n[${t}] ${msg}`;
  logEl.scrollTop = logEl.scrollHeight;
}
function setProgress(done, total) {
  bar.style.display = "block";
  barFill.style.width = total ? Math.round((done / total) * 100) + "%" : "0%";
}

// Supabase řádek → Firestore dokument (bez interního číselného id).
function toDoc(row) {
  const d = Object.assign({}, row);
  delete d.id; // interní bigint ze Supabase nepotřebujeme
  return d;
}

/* --- Krok 1: načtení ze Supabase --- */
async function loadFromSupabase() {
  btnLoad.disabled = true;
  try {
    if (!window.supabase) throw new Error("Supabase SDK se nenačetlo.");
    const sb = window.supabase.createClient(SB_URL, SB_ANON_KEY);
    log("Načítám produkty ze Supabase…");
    // Stránkujeme po 1000 (limit Supabase na jeden dotaz).
    let all = [];
    let from = 0;
    const page = 1000;
    for (;;) {
      const { data, error } = await sb
        .from("products")
        .select("*")
        .order("id", { ascending: true })
        .range(from, from + page - 1);
      if (error) throw error;
      all = all.concat(data || []);
      if (!data || data.length < page) break;
      from += page;
    }
    sourceRows = all;
    log(`✅ Načteno ${all.length} produktů ze Supabase.`);
    btnWrite.disabled = all.length === 0;
  } catch (e) {
    log("❌ Chyba při čtení ze Supabase: " + (e.message || e));
    btnLoad.disabled = false;
  }
}

/* --- Krok 2: zápis do Firestore --- */
async function writeToFirestore() {
  if (!sourceRows) { log("Nejdřív načti data (krok 1)."); return; }
  if (!window.db) { log("❌ Firestore není inicializovaný."); return; }
  btnWrite.disabled = true;

  try {
    const col = window.db.collection("products");

    // Kontrola: má už Firestore nějaká data? (varování před přepsáním)
    const existing = await col.limit(1).get();
    if (!existing.empty) {
      const ok = window.confirm(
        "Ve Firestore už nějaké produkty jsou. Pokračovat a případně je přepsat podle product_id?"
      );
      if (!ok) { log("Zrušeno uživatelem."); btnWrite.disabled = false; return; }
    }

    const rows = sourceRows;
    let written = 0;
    let autoIds = 0;
    const CHUNK = 400; // Firestore batch limit je 500, necháme rezervu

    for (let i = 0; i < rows.length; i += CHUNK) {
      const batch = window.db.batch();
      const slice = rows.slice(i, i + CHUNK);
      slice.forEach((row) => {
        const pid = row.product_id;
        const ref = pid ? col.doc(String(pid)) : col.doc();
        if (!pid) autoIds++;
        batch.set(ref, toDoc(row));
      });
      await batch.commit();
      written += slice.length;
      setProgress(written, rows.length);
      log(`Zapsáno ${written}/${rows.length}…`);
    }

    log(`✅ Hotovo! Přeneseno ${written} produktů do Firestore.`);
    if (autoIds) log(`ℹ️ ${autoIds} produktů nemělo product_id – dostaly automatické ID.`);
    log("Můžeš otevřít dashboard.html a zkontrolovat data.");
  } catch (e) {
    log("❌ Chyba při zápisu do Firestore: " + (e.message || e));
    btnWrite.disabled = false;
  }
}

btnLoad.addEventListener("click", loadFromSupabase);
btnWrite.addEventListener("click", writeToFirestore);

// Aktivace až po přihlášení vlastníka.
window.onAuthReady(function () {
  log("✅ Přihlášen jako vlastník. Můžeš spustit migraci (krok 1).");
});
