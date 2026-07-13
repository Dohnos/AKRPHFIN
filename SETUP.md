# 🚀 iAUKRO – návod: Supabase + Vercel

Aplikace má dvě části, které sdílí jednu databázi:
- **`index.html`** 📷 – appka na focení a přípravu produktů (generuje Excel + importuje do databáze)
- **`dashboard.html`** 📊 – přehled všech produktů (ID, název, datum, fotky)

Databáze = **Supabase**, hosting = **Vercel**. Postup zabere ~15 minut. 🙂

---

## 1️⃣ Založ projekt v Supabase
1. Jdi na [supabase.com](https://supabase.com) → **Sign in** (přes GitHub je to nejrychlejší).
2. Klikni **New project** ➕
3. Vyplň:
   - **Name:** `iaukro`
   - **Database Password:** vygeneruj silné heslo a ulož si ho 🔐
   - **Region:** `Central EU (Frankfurt)` 🇪🇺
4. **Create new project** a počkej ~1 minutu, než se rozjede. ⏳

## 2️⃣ Vytvoř tabulku produktů
1. V levém menu klikni na **SQL Editor** 🧑‍💻
2. Vlož tento SQL a klikni **Run** ▶️:

```sql
create table if not exists public.products (
  id                   bigint generated always as identity primary key,
  product_id           text unique,          -- např. RA01 (unikátní, nejde použít 2×)
  name                 text,
  price                integer,
  location             text,
  ext_id               text,
  category_id          integer,
  shipping_template_id integer,
  images               text,
  image_list           jsonb,
  priority_listing     boolean default false,
  bold_title           boolean default false,
  highlight            boolean default false,
  description          text,
  excel_url            text,
  sold                 boolean default false, -- označení "prodáno"
  sold_at              timestamptz,           -- kdy bylo prodáno
  raw                  jsonb,                 -- celý produkt pro re-export do Excelu
  date_added           date,
  created_at           timestamptz default now()
);

-- Zapneme zabezpečení a povolíme čtení/zápis pro veřejný (anon) klíč.
-- (Interní nástroj – pokud chceš přísnější přístup, uprav políčky později.)
alter table public.products enable row level security;

create policy "anon read"   on public.products for select to anon using (true);
create policy "anon insert" on public.products for insert to anon with check (true);
create policy "anon update" on public.products for update to anon using (true) with check (true);
```

✅ Tím vznikne tabulka `products` a povolí se zápis z appky i čtení v dashboardu.

> 🔁 **Už jsi tabulku vytvořil dřív (bez sloupců sold/raw)?** Spusť jen tuto migraci:
> ```sql
> alter table public.products add column if not exists sold boolean default false;
> alter table public.products add column if not exists sold_at timestamptz;
> alter table public.products add column if not exists raw jsonb;
> ```

## 3️⃣ Zkopíruj klíče do `supabase-config.js`
1. V Supabase jdi do **Project Settings** ⚙️ → **API**
2. Najdi:
   - **Project URL** (např. `https://abcxyz.supabase.co`) 🔗
   - **anon public** key (dlouhý řetězec) 🔑
3. Otevři soubor **`supabase-config.js`** a doplň je:

```js
const SUPABASE_URL = "https://abcxyz.supabase.co";
const SUPABASE_ANON_KEY = "sem-vlož-anon-public-key";
```

> 💡 `anon` klíč je určený do prohlížeče – je to v pořádku. Nikdy sem ale nedávej `service_role` klíč!

## 4️⃣ Vyzkoušej lokálně 🧪
Ve složce projektu spusť malý server (kvůli načítání kategorií a fetchům):

```bash
python -m http.server 8000
```

- Appka: <http://localhost:8000/index.html>
- Dashboard: <http://localhost:8000/dashboard.html>

Projdi appku (zadej ID → 3 fotky → detaily → **Přidat produkt** → **Odeslat**).
Pak otevři **dashboard** – produkt tam musí naskočit. 🎉

## 5️⃣ Nahraj na GitHub 🐙
Pokud používáš existující repo `AKRPHFIN`:

```bash
git add .
git commit -m "ID produktu, nový popis, dashboard + Supabase"
git push
```

## 6️⃣ Deploy na Vercel 🚀
1. Jdi na [vercel.com](https://vercel.com) → **Sign in** přes GitHub.
2. **Add New… → Project** ➕
3. Vyber repo **`AKRPHFIN`** → **Import**
4. Nastavení nech výchozí:
   - **Framework Preset:** `Other`
   - Build & Output nech prázdné (je to statický web, žádný build netřeba)
5. Klikni **Deploy** a počkej ~1 minutu. ⏳
6. Dostaneš adresu typu `https://akrphfin.vercel.app` 🌍
   - Appka: `…/index.html`
   - Dashboard: `…/dashboard.html`

## 7️⃣ Hotovo ✅
- Focení a generování Excelu funguje jako dřív. 📸
- Po odeslání se produkty **navíc uloží do Supabase** a hned se objeví v **dashboardu**. 🗄️
- Obě stránky jsou online přes Vercel a sdílí stejnou databázi. 🔗

---

### 🔒 Bonus (doporučení)
- Chceš, aby data **nešla veřejně číst/zapisovat**? Nasaď na Vercel **Password Protection** (Project → Settings → Deployment Protection), nebo mi řekni a přidáme jednoduché přihlášení přes Supabase Auth.
- V Supabase → **Table Editor** vidíš data i ručně a můžeš je editovat/mazat. 🧹
