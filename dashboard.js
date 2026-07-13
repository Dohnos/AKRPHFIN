/* ---------------------------------
   iAUKRO Dashboard – přehled produktů
   Čte data z Supabase (tabulka "products"),
   umožňuje označit "prodáno" a vyexportovat
   Excel ve stejném formátu jako appka (bez prodaných).
-----------------------------------*/

let allProducts = [];

const container = document.getElementById("products-container");
const searchInput = document.getElementById("search");
const hideSoldInput = document.getElementById("hide-sold");
const statusMsg = document.getElementById("status-msg");
const refreshBtn = document.getElementById("refresh-btn");
const exportBtn = document.getElementById("export-btn");
const photoModal = document.getElementById("photo-modal");
const photoModalBody = document.getElementById("photo-modal-body");

/* Hlavičky Excelu – MUSÍ sedět s appkou (formát pro Aukro/Cloudinary) */
const EXPORT_HEADERS = [
  "entityId", "name", "language", "extId", "categoryId", "description",
  "auctionPriceAmount", "auctionPriceCurrency", "buyNowPriceAmount",
  "buyNowPriceCurrency", "quantity", "quantityUnit", "startingAt", "duration",
  "reexposeType", "location", "shippingTemplateId", "shippingPayer", "images",
  "bestOffer", "onlyVerifiedBuyersEnabledOverride", "attributes",
  "priorityListing", "boldTitle", "highlight"
];

/* --- Pomocné --- */
function showStatus(msg, type = "is-info") {
  statusMsg.className = `notification is-rounded ${type}`;
  statusMsg.textContent = msg;
  statusMsg.classList.remove("is-hidden");
}
function hideStatus() {
  statusMsg.classList.add("is-hidden");
}
function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function fmtDate(iso) {
  if (!iso) return "–";
  const d = new Date(iso);
  if (isNaN(d)) return "–";
  return d.toLocaleString("cs-CZ", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}
function imagesOf(p) {
  if (Array.isArray(p.image_list) && p.image_list.length) return p.image_list;
  if (p.images) return String(p.images).split(" ").filter(Boolean);
  return [];
}
// Startovní čas aukce = celá hodina, +1h (stejně jako v appce)
function getRoundedISODate() {
  const d = new Date();
  d.setUTCMinutes(0, 0, 0);
  d.setUTCHours(d.getUTCHours() + 1);
  return d.toISOString().replace(".000Z", "Z");
}

/* --- Načtení dat --- */
async function loadProducts() {
  if (!window.supabaseClient) {
    showStatus("⚠️ Supabase není nastaven. Doplň údaje v supabase-config.js.", "is-warning");
    container.innerHTML = "";
    return;
  }
  showStatus("⏳ Načítám produkty…");
  const { data, error } = await window.supabaseClient
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    showStatus("❌ Chyba při načítání: " + error.message, "is-danger");
    return;
  }
  hideStatus();
  allProducts = data || [];
  // Řazení: nejnovější nahoře; při shodném čase (hromadný import) podle čísla ID sestupně
  const numOf = (pid) => {
    const m = /^([A-Za-z]+)(\d+)$/.exec(pid || "");
    return m ? parseInt(m[2], 10) : -1;
  };
  allProducts.sort((a, b) => {
    const t = String(b.created_at || "").localeCompare(String(a.created_at || ""));
    return t !== 0 ? t : numOf(b.product_id) - numOf(a.product_id);
  });
  updateStats();
  render();
}

/* --- Statistiky --- */
function updateStats() {
  const total = allProducts.length;
  const soldCount = allProducts.filter((p) => p.sold).length;
  const today = new Date().toISOString().split("T")[0];
  const todayCount = allProducts.filter(
    (p) => p.date_added === today || (p.created_at && String(p.created_at).startsWith(today))
  ).length;

  // "Poslední ID" = ID s nejvyšším číslem (ne podle času vložení)
  let lastId = "–", bestNum = -1;
  allProducts.forEach((p) => {
    const m = /^([A-Za-z]+)(\d+)$/.exec(p.product_id || "");
    if (m && parseInt(m[2], 10) > bestNum) {
      bestNum = parseInt(m[2], 10);
      lastId = p.product_id;
    }
  });

  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-today").textContent = todayCount;
  document.getElementById("stat-sold").textContent = soldCount;
  document.getElementById("stat-last").textContent = lastId;
}

/* --- Vykreslení --- */
function render() {
  const q = searchInput.value.trim().toLowerCase();
  const hideSold = hideSoldInput.checked;

  const list = allProducts.filter((p) => {
    if (hideSold && p.sold) return false;
    if (!q) return true;
    return (
      (p.product_id && p.product_id.toLowerCase().includes(q)) ||
      (p.name && p.name.toLowerCase().includes(q))
    );
  });

  container.innerHTML = "";
  if (!list.length) {
    container.innerHTML = `<p class="has-text-grey p-4">😕 Žádné produkty k zobrazení.</p>`;
    return;
  }
  list.forEach((p) => container.appendChild(card(p)));
}

function card(p) {
  const el = document.createElement("div");
  el.className = "prod-card" + (p.sold ? " is-sold" : "");

  const imgs = imagesOf(p);
  const thumb = imgs[0] || "";

  el.innerHTML = `
    ${p.sold ? '<span class="sold-badge">✅ PRODÁNO</span>' : ""}
    <div class="prod-thumb" ${thumb ? `style="background-image:url('${escapeHtml(thumb)}')"` : ""}>
      ${thumb ? "" : '<i class="fa-solid fa-image"></i>'}
      ${imgs.length ? `<span class="prod-thumb-count">📷 ${imgs.length}</span>` : ""}
    </div>
    <div class="prod-body">
      <div class="prod-id">${escapeHtml(p.product_id || "—")}</div>
      <div class="prod-name">${escapeHtml(p.name || "")}</div>
      <div class="prod-meta">
        <span>💰 ${p.price != null ? escapeHtml(p.price) + " Kč" : "—"}</span>
        <span>📦 ${escapeHtml(p.location || "—")}</span>
      </div>
      <div class="prod-date">🕒 ${fmtDate(p.created_at)}</div>
      <button class="button is-small is-rounded sold-toggle ${p.sold ? "is-light" : "is-danger"}">
        ${p.sold ? "↩️ Zrušit prodej" : "✅ Označit jako prodáno"}
      </button>
    </div>
  `;

  const thumbEl = el.querySelector(".prod-thumb");
  if (imgs.length) {
    thumbEl.classList.add("is-clickable");
    thumbEl.addEventListener("click", () => openPhotos(imgs));
  }
  el.querySelector(".sold-toggle").addEventListener("click", (e) => toggleSold(p, e.currentTarget));
  return el;
}

/* --- Označit / zrušit prodáno --- */
async function toggleSold(p, btn) {
  if (!window.supabaseClient) return;
  const newVal = !p.sold;
  btn.classList.add("is-loading");
  const { error } = await window.supabaseClient
    .from("products")
    .update({ sold: newVal, sold_at: newVal ? new Date().toISOString() : null })
    .eq("id", p.id);
  btn.classList.remove("is-loading");

  if (error) {
    showStatus("❌ Nepovedlo se uložit: " + error.message, "is-danger");
    return;
  }
  p.sold = newVal;
  updateStats();
  render();
}

/* --- Export Excelu (bez prodaných) --- */
function exportExcel() {
  if (typeof XLSX === "undefined") {
    showStatus("❌ Knihovna XLSX se nenačetla.", "is-danger");
    return;
  }
  const items = allProducts.filter((p) => !p.sold);
  if (!items.length) {
    showStatus("😕 Žádné neprodané produkty k exportu.", "is-warning");
    return;
  }

  const data = items.map((p, i) => {
    const r = p.raw || {};
    return {
      entityId: r.entityId != null ? r.entityId : i + 1,
      name: p.name != null ? p.name : r.name,
      language: r.language || "cs-CZ",
      extId: p.ext_id != null ? p.ext_id : r.extId,
      categoryId: p.category_id != null ? p.category_id : r.categoryId,
      description: p.description != null ? p.description : r.description,
      auctionPriceAmount: p.price != null ? p.price : r.auctionPriceAmount,
      auctionPriceCurrency: r.auctionPriceCurrency || "CZK",
      buyNowPriceAmount: r.buyNowPriceAmount != null ? r.buyNowPriceAmount : 0,
      buyNowPriceCurrency: r.buyNowPriceCurrency || "CZK",
      quantity: r.quantity != null ? r.quantity : 1,
      quantityUnit: r.quantityUnit || "pieces",
      startingAt: getRoundedISODate(),
      duration: r.duration != null ? r.duration : 7,
      reexposeType: r.reexposeType != null ? r.reexposeType : 0,
      location: r.location || JSON.stringify({ countryCode: "CZ", postCode: "789 01", city: "Zvole" }),
      shippingTemplateId: p.shipping_template_id != null ? p.shipping_template_id : r.shippingTemplateId,
      shippingPayer: r.shippingPayer || "buyer",
      images: p.images != null ? p.images : r.images,
      bestOffer: r.bestOffer != null ? r.bestOffer : 1,
      onlyVerifiedBuyersEnabledOverride:
        r.onlyVerifiedBuyersEnabledOverride != null ? r.onlyVerifiedBuyersEnabledOverride : 0,
      attributes: r.attributes || "",
      priorityListing: p.priority_listing != null ? p.priority_listing : false,
      boldTitle: p.bold_title != null ? p.bold_title : false,
      highlight: p.highlight != null ? p.highlight : false
    };
  });

  const ws = XLSX.utils.json_to_sheet(data, { header: EXPORT_HEADERS });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Products");

  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  XLSX.writeFile(wb, `products_${dd}${mm}${yyyy}_export.xlsx`);

  showStatus(`✅ Vyexportováno ${items.length} produktů (prodané vynechány).`, "is-success");
}

/* --- Náhled fotek --- */
function openPhotos(imgs) {
  photoModalBody.innerHTML = imgs
    .map((u) => `<img src="${escapeHtml(u)}" alt="foto produktu" />`)
    .join("");
  photoModal.classList.add("is-active");
}
function closePhotos() {
  photoModal.classList.remove("is-active");
}

/* --- Události --- */
searchInput.addEventListener("input", render);
hideSoldInput.addEventListener("change", render);
refreshBtn.addEventListener("click", loadProducts);
exportBtn.addEventListener("click", exportExcel);
photoModal
  .querySelectorAll(".modal-background, .modal-close")
  .forEach((el) => el.addEventListener("click", closePhotos));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closePhotos();
});

/* --- Start --- */
loadProducts();
