/* ---------------------------------
   Základní konfigurace
-----------------------------------*/
const CLOUDINARY_UPLOAD_URL = "https://api.cloudinary.com/v1_1/drrzl7evt/auto/upload";
const CLOUDINARY_UPLOAD_PRESET = "AKR_Preset";

/* ---------------------------------
   Proměnné
-----------------------------------*/
let photos = [];
let selectedShop = null; // [Z] nebo [M]
let categories = [];

/* ---------------------------------
   DOM prvky
-----------------------------------*/
const shopZvoleBtn = document.getElementById("shop-zvole");
const shopMoraBtn = document.getElementById("shop-mora");
const shopZmBtn = document.getElementById("shop-zm");
const photoInput = document.getElementById("photo-input");
const takePhotoBtn = document.getElementById("take-photo-btn");
const photoCountElem = document.getElementById("photo-count");
const statusElem = document.getElementById("status");
const dailyCountElem = document.getElementById("daily-count");

const shopSelectionSection = document.getElementById("shop-selection");
const photoSectionSection = document.getElementById("photo-section");
const productDetailsSection = document.getElementById("product-details");
const finishSection = document.getElementById("finish-section");

const categoryBtn = document.getElementById("category-btn");
const categoryBtnText = document.getElementById("category-btn-text");
const categoryIdInput = document.getElementById("category-id");
const categoryModal = document.getElementById("category-modal");
const categorySearch = document.getElementById("category-search");
const categoryList = document.getElementById("category-list");
const categoryCloseBtn = document.getElementById("category-close-btn");

const progressBar = document.getElementById("progress-bar");

const confirmModal = document.getElementById("confirm-modal");
const confirmYesBtn = document.getElementById("confirm-yes");
const confirmNoBtn = document.getElementById("confirm-no");

const finishBtn = document.getElementById("finish-btn");
const resetBtn = document.getElementById("reset-btn");

const exitModal = document.getElementById("exit-modal");
const deleteDataBtn = document.getElementById("delete-data-btn");
const closeModalBtn = document.getElementById("close-modal-btn");

const shippingMethodSelect = document.getElementById("shippingMethod");

/* ---------------------------------
   Načtení kategorií (MapaKat.txt)
   - pokud v Android prohlížeči fetch
     selže, kategorie se nenačtou,
     ale zbytek poběží normálně.
-----------------------------------*/
function parseCategoriesHierarchically(text) {
  const lines = text.split('\n');
  let groups = [];
  let currentGroup = null;
  lines.forEach(line => {
    if (line.startsWith('####')) {
      if (currentGroup) groups.push(currentGroup);
      currentGroup = { name: line.replace(/#+/g, '').trim(), cats: [] };
    } else if (line.match(/\((\d+)\)/)) {
      const match = line.match(/(.*)\((\d+)\)/);
      if (match && currentGroup) {
        currentGroup.cats.push({ name: match[1].replace(/[-*•]/g, '').trim(), id: parseInt(match[2]) });
      }
    }
  });
  if (currentGroup) groups.push(currentGroup);
  return groups;
}

fetch('MapaKat.txt')
  .then((response) => response.text())
  .then((text) => {
    categories = parseCategoriesHierarchically(text);
  })
  .catch((err) => {
    updateStatus('❌ Chyba při načítání kategorií! Zkontroluj soubor.');
  });

/* ---------------------------------
   Pomocné funkce
-----------------------------------*/
function updateStatus(message) {
  statusElem.textContent = message;
  updateDailyCountDisplay();
}

function ensurePortrait(file) {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      resolve(file);
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        let targetWidth = img.width;
        let targetHeight = img.height;
        
        if (targetWidth > targetHeight) {
          // Obrázek je na šířku -> otočíme o 90° na výšku
          canvas.width = targetHeight;
          canvas.height = targetWidth;
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate(90 * Math.PI / 180);
          ctx.drawImage(img, -targetWidth / 2, -targetHeight / 2);
        } else {
          // Obrázek je na výšku -> překreslíme 1:1, abychom vypálili orientaci do pixelů
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        }

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const rotatedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now()
              });
              resolve(rotatedFile);
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          0.98 // Velmi vysoká kvalita pro zachování kvality na Cloudinary
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}

// Vrátí YYYY-MM-DD
function getTodayDateString() {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

// Aktualizace denního počtu přidaných produktů
function updateDailyCountDisplay() {
  const products = JSON.parse(localStorage.getItem("products")) || [];
  const todayStr = getTodayDateString();
  let dailyCount = 0;
  products.forEach((p) => {
    if (p.dateAdded === todayStr) {
      dailyCount++;
    }
  });
  dailyCountElem.textContent = `(Dnes přidáno: ${dailyCount} produktů)`;
}

// Zobrazí historii umístění
function updateLocationHistory() {
  const locationHistoryDiv = document.getElementById("location-history");
  const locations = JSON.parse(localStorage.getItem("locationHistory")) || [];
  if (locations.length === 0) {
    locationHistoryDiv.textContent = "Žádná historie umístění.";
  } else {
    const items = locations
      .map(
        (loc) =>
          `<span class="has-text-link" style="cursor:pointer" onclick="document.getElementById('product-location').value='${loc}'">${loc}</span>`
      )
      .join(", ");
    locationHistoryDiv.innerHTML = "Historie: " + items;
  }
}

// Otevření a zavření Bulma modálu
function openModal(modalElem) {
  modalElem.classList.add("is-active");
}
function closeModal(modalElem) {
  modalElem.classList.remove("is-active");
}


/* ---------------------------------
   Inicializace
-----------------------------------*/
updateStatus("👉 Začni výběrem obchodu");
updateDailyCountDisplay();
updateStepProgressBar(0);

/* ---------------------------------
   Výběr obchodu
-----------------------------------*/
shopZvoleBtn.addEventListener("click", () => {
  selectedShop = "Z"; // obch. param
  shopSelectionSection.classList.add("is-hidden");
  photoSectionSection.classList.remove("is-hidden");
  updateStatus("👉 Vybral jsi Antik Zvole. Nahoď první fotku!");
  updateStepProgressBar(1);
});

shopMoraBtn.addEventListener("click", () => {
  selectedShop = "M"; // obch. param
  shopSelectionSection.classList.add("is-hidden");
  photoSectionSection.classList.remove("is-hidden");
  updateStatus("👉 Vybral jsi Antik Mora. Nahoď první fotku!");
  updateStepProgressBar(1);
});

shopZmBtn.addEventListener("click", () => {
  selectedShop = "ZM";
  shopSelectionSection.classList.add("is-hidden");
  photoSectionSection.classList.remove("is-hidden");
  updateStatus("👉 Vybral jsi Antik Společně. Nahoď první fotku!");
  updateStepProgressBar(1);
});

/* ---------------------------------
   Focení 3 fotek
-----------------------------------*/
takePhotoBtn.addEventListener("click", () => {
  if (photos.length < 3) {
    photoInput.click();
  } else {
    updateStatus("✅ Máš už 3 fotky! Vyplň název a cenu.");
  }
});

// Jakmile uživatel vybere soubory
photoInput.addEventListener("change", async () => {
  if (photoInput.files.length) {
    // Projdeme všechny vybrané soubory (u mobilu často jen 1)
    for (let i = 0; i < photoInput.files.length; i++) {
      const originalFile = photoInput.files[i];
      updateStatus(`⏳ Zpracovávám orientaci fotky č. ${photos.length + 1}...`);
      const processedFile = await ensurePortrait(originalFile);
      photos.push(processedFile);
      updateStatus(`📸 Načtena fotka č. ${photos.length}.`);
    }

    // Vynulujeme input, aby šlo vybrat stejnou fotku znovu
    photoInput.value = "";

    // Aktualizace počítadla fotek
    photoCountElem.textContent = `${photos.length}/3`;

    // Jakmile máme 3 fotky, automaticky přejít na krok 2 + zpráva
    if (photos.length === 3) {
      updateStatus("✅ Fotky byly úspěšně načteny. Teď detail.");
      // Skryjeme focení a otevřeme detaily
      photoSectionSection.classList.add("is-hidden");
      productDetailsSection.classList.remove("is-hidden");
      takePhotoBtn.disabled = true;
      updateLocationHistory();
      updateStepProgressBar(2);
    } else {
      updateStatus(
        `📸 Nafocena fotka ${photos.length}/3. Pokračuj další.`
      );
    }
  }
});

/* ---------------------------------
   Výběr kategorie
-----------------------------------*/
categoryBtn.addEventListener("click", () => {
  openModal(categoryModal);
  categorySearch.value = "";
  updateCategoryList("");
});

categorySearch.addEventListener("input", () => {
  const query = categorySearch.value.toLowerCase().trim();
  updateCategoryList(query);
});

function updateCategoryList(query) {
  categoryList.innerHTML = '';
  let found = false;
  categories.forEach(group => {
    // Filtrování podle dotazu
    const filtered = group.cats.filter(cat => cat.name.toLowerCase().includes(query.toLowerCase()));
    if (filtered.length > 0) {
      const groupEl = document.createElement('div');
      groupEl.className = 'category-group';
      groupEl.textContent = '📂 ' + group.name;
      categoryList.appendChild(groupEl);
      filtered.forEach(cat => {
        const btn = document.createElement('button');
        btn.innerHTML = '📦 ' + cat.name;
        btn.onclick = () => {
          categoryIdInput.value = cat.id;
          categoryBtnText.innerHTML = '<span class="category-selected">KATEGORIE <i class="fa-solid fa-check"></i></span>';
          updateStatus('✅ Kategorie vybrána!');
          closeModal(categoryModal);
        };
        categoryList.appendChild(btn);
      });
      found = true;
    }
  });
  if (!found) {
    const noResult = document.createElement('p');
    noResult.classList.add('has-text-grey');
    noResult.innerText = '😕 Žádné kategorie nenalezeny.';
    categoryList.appendChild(noResult);
  }
}

categoryCloseBtn.addEventListener("click", () => {
  closeModal(categoryModal);
});

/* ---------------------------------
   Nahrávání: Unikátní názvy fotek + Excel
-----------------------------------*/
async function uploadFile(file, indexForImages = 1) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  // Datum & čas
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear());
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const dateStr = day + month + year; // "26032025"
  const timeStr = hours + minutes;    // "1042"

  // Náhodný sufix (4 znaky)
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();

  if (file.type.includes("image")) {
    formData.append("folder", "media_library");
    // Např.: IMAGE_25032025_1042_1_ABCD
    const publicId = `IMAGE_${dateStr}_${timeStr}_${indexForImages}_${randomSuffix}`;
    formData.append("public_id", publicId);

  } else {
    formData.append("folder", "excel_files");
    // Např.: products_25032025_[Z]_ABCD
    const publicId = `products_${dateStr}_[${selectedShop}]_${randomSuffix}`;
    formData.append("public_id", publicId);
  }

  const resp = await fetch(CLOUDINARY_UPLOAD_URL, {
    method: "POST",
    body: formData
  });
  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`Chyba při nahrávání: ${resp.status} - ${errorText}`);
  }
  const data = await resp.json();
  return data.secure_url;
}

/* ---------------------------------
   Přidání produktu
-----------------------------------*/
async function addProduct() {
  let valid = true;
  const name = document.getElementById('product-name').value.trim();
  const price = document.getElementById('product-price').value.trim();
  const categoryId = categoryIdInput.value.trim();
  const location = document.getElementById('product-location').value.trim();
  const shippingId = shippingMethodSelect.value;

  clearFieldError('product-name');
  clearFieldError('product-price');
  clearFieldError('category-id');
  clearFieldError('shippingMethod');

  if (!name) {
    showFieldError('product-name', 'Zadej název produktu!');
    valid = false;
  }
  if (!price) {
    showFieldError('product-price', 'Zadej cenu!');
    valid = false;
  }
  if (!categoryId) {
    showFieldError('category-id', 'Vyber kategorii!');
    valid = false;
  }
  if (!shippingId) {
    showFieldError('shippingMethod', 'Vyber dopravu!');
    valid = false;
  }
  if (!valid) {
    updateStatus('⚠️ Vyplň všechna povinná pole!');
    return;
  }

  updateStatus("⏳ Zpracovávám a nahrávám fotky...");
  progressBar.classList.remove("is-hidden");
  progressBar.value = 0;

  try {
    const photoUrls = [];
    for (let i = 0; i < photos.length; i++) {
      updateStatus(`🖼️ Nahrávám obrázek ${i + 1}/3...`);
      const url = await uploadFile(photos[i], i + 1);
      photoUrls.push(url);
      const percent = Math.round(((i + 1) / photos.length) * 100);
      progressBar.value = percent;
      updateStatus(`📤 Nahrán obrázek ${i + 1}/3...`);
    }

    // Uložení umístění do localStorage (kvůli historii)
    if (location) {
      let locationHistory = JSON.parse(localStorage.getItem("locationHistory")) || [];
      if (!locationHistory.includes(location)) {
        locationHistory.push(location);
        localStorage.setItem("locationHistory", JSON.stringify(locationHistory));
      }
    }

    // Generování entityId
    let lastEntityId = parseInt(localStorage.getItem("lastEntityId")) || 0;
    lastEntityId += 1;
    localStorage.setItem("lastEntityId", lastEntityId);

    function getRoundedISODate() {
      let d = new Date();
      d.setUTCMinutes(0, 0, 0);
      d.setUTCHours(d.getUTCHours() + 1);
      return d.toISOString().replace(".000Z", "Z");
    }

    const productDescription = `<div class="aukro-offer-default"><div data-layout="text"><div><h3><strong>🛒 NABÍZENÉ ZBOŽÍ 🎁</strong></h3><p>Stav viz. fotografie 📸</p><p><strong> Pro dotazy k aukcím preferuji komunikaci e-mailem, z důvodu flexibilnějšího a rychlejšího vyřízení požadavku. Přeji Vám příjemnou dražbu! 💌 Podívejte se i na mé další aukce a objevte skvělé nabídky! 🚀</strong></p><p><br></p><h3><strong>⚠️ INFORMACE O AUKCI :</strong></h3><p>Na platby čekám jeden týden od vydražení aukce, zboží <strong>zasílám 7-10 dní po obdržení platby</strong>. Zboží bude znovu vystaveno, zda-li nebude uhrazeno v této lhůtě.</p><p>Berte prosím na vědomí, že vydražené zboží <strong>nezasílám na DOBÍRKU</strong>. Zboží mohu zasílat přes <strong>KURÝRNÍ SLUŽBU (DPD) & také ZÁSILKOVNU</strong>.</p><p><br></p><h3><strong>💳 PLATBA :</strong></h3><p>Platbu můžete uskutečnit pouze <strong>BANKOVNÍM PŘEVODEM</strong>. Číslo bankovního účtu <strong>najdete ve výherním e-mailu</strong>. Děkuji za pochopení. <strong>(Při platbě BANKOVNÍM PŘEVODEM, prosím uvést ČÍSLO NABÍDKY, které je uvedeno u AUKCE)</strong></p><p><a href="https://aukro.cz/uzivatel/ZvoleAnt/nabidky"><img src="https://i.postimg.cc/nMbG3ZG9/A.png" alt="Nabízené zboží" style="display:block; margin:auto;"></a></p></div></div></div>`;

    const formattedName = `${name.toUpperCase()} | [${selectedShop}]`;
    const todayStr = getTodayDateString();

    const product = {
      entityId: lastEntityId,
      name: formattedName,
      language: "cs-CZ",
      extId: location,
      categoryId: parseInt(categoryId),
      description: productDescription,
      auctionPriceAmount: parseInt(price),
      auctionPriceCurrency: "CZK",
      buyNowPriceAmount: 0,
      buyNowPriceCurrency: "CZK",
      quantity: 1,
      quantityUnit: "pieces",
      startingAt: getRoundedISODate(),
      duration: 7,
      reexposeType: 0,
      location: JSON.stringify({
        countryCode: "CZ",
        postCode: "789 01",
        city: "Zvole"
      }),
      shippingTemplateId: parseInt(shippingId),
      shippingPayer: "buyer",
      images: photoUrls.join(" "),
      bestOffer: 1,
      onlyVerifiedBuyersEnabledOverride: 0,
      attributes: JSON.stringify(),
      priorityListing: document.getElementById("promo-priority").checked,
      boldTitle: document.getElementById("promo-bold").checked,
      highlight: document.getElementById("promo-highlight").checked,
      dateAdded: todayStr
    };

    let products = JSON.parse(localStorage.getItem("products")) || [];
    products.push(product);
    localStorage.setItem("products", JSON.stringify(products));

    // Reset fotek a formuláře
    photos = [];
    photoCountElem.textContent = "0/3";
    document.getElementById("product-name").value = "";
    document.getElementById("product-price").value = "";
    document.getElementById("product-location").value = "";
    categoryIdInput.value = "";
    categoryBtnText.innerHTML = 'Vybrat kategorii';
    shippingMethodSelect.value = "2424163";
    document.getElementById("promo-priority").checked = false;
    document.getElementById("promo-bold").checked = false;
    document.getElementById("promo-highlight").checked = false;

    productDetailsSection.classList.add("is-hidden");
    finishSection.classList.remove("is-hidden");
    takePhotoBtn.disabled = false;
    updateStepProgressBar(3);

    updateStatus("🎉 Produkt přidán! Můžeš dokončit nebo přidat další.");
  } catch (error) {
    updateStatus(`❌ Chyba při nahrávání fotek: ${error.message}`);
  }
}

/* ---------------------------------
   Přidat další produkt
-----------------------------------*/
function addAnotherProduct() {
  progressBar.value = 0;
  progressBar.classList.add("is-hidden");

  // Reset formuláře pro nový produkt
  photos = [];
  photoCountElem.textContent = "0/3";
  document.getElementById("product-name").value = "";
  document.getElementById("product-price").value = "";
  document.getElementById("product-location").value = "";
  categoryIdInput.value = "";
  categoryBtnText.innerHTML = 'Vybrat kategorii';
  shippingMethodSelect.value = "2424163";
  document.getElementById("promo-priority").checked = false;
  document.getElementById("promo-bold").checked = false;
  document.getElementById("promo-highlight").checked = false;
  takePhotoBtn.disabled = false;

  // Reset historie pro nový produkt
  ['product-name', 'product-price', 'product-location'].forEach(id => {
    renderInputHistory(id);
  });

  finishSection.classList.add("is-hidden");
  productDetailsSection.classList.add("is-hidden");
  photoSectionSection.classList.remove("is-hidden");
  updateStepProgressBar(1);
  updateStatus("👉 Nafoť fotky pro další produkt.");
}

/* ---------------------------------
   Dokončení – export do Excelu, WhatsApp
-----------------------------------*/
async function finish() {
  const confirmed = await showConfirmModal();
  if (!confirmed) return;

  const products = JSON.parse(localStorage.getItem("products")) || [];
  const savedProductsDiv = document.getElementById("saved-products");
  savedProductsDiv.innerHTML = "";

  if (products.length === 0) {
    savedProductsDiv.innerHTML = "<p>Žádné produkty nebyly přidány. 😕</p>";
    updateStatus("⚠️ Přidej aspoň jeden produkt před dokončením.");
    return;
  }

  const headers = [
    "entityId",
    "name",
    "language",
    "extId",
    "categoryId",
    "description",
    "auctionPriceAmount",
    "auctionPriceCurrency",
    "buyNowPriceAmount",
    "buyNowPriceCurrency",
    "quantity",
    "quantityUnit",
    "startingAt",
    "duration",
    "reexposeType",
    "location",
    "shippingTemplateId",
    "shippingPayer",
    "images",
    "bestOffer",
    "onlyVerifiedBuyersEnabledOverride",
    "attributes",
    "priorityListing",
    "boldTitle",
    "highlight"
  ];

  const data = products.map((p) => ({
    entityId: p.entityId,
    name: p.name,
    language: p.language,
    extId: p.extId,
    categoryId: p.categoryId,
    description: p.description,
    auctionPriceAmount: p.auctionPriceAmount,
    auctionPriceCurrency: p.auctionPriceCurrency,
    buyNowPriceAmount: p.buyNowPriceAmount,
    buyNowPriceCurrency: p.buyNowPriceCurrency,
    quantity: p.quantity,
    quantityUnit: p.quantityUnit,
    startingAt: p.startingAt,
    duration: p.duration,
    reexposeType: p.reexposeType,
    location: p.location,
    shippingTemplateId: p.shippingTemplateId,
    shippingPayer: p.shippingPayer,
    images: p.images,
    bestOffer: p.bestOffer,
    onlyVerifiedBuyersEnabledOverride: p.onlyVerifiedBuyersEnabledOverride,
    attributes: p.attributes,
    priorityListing: p.priorityListing ?? false,
    boldTitle: p.boldTitle ?? false,
    highlight: p.highlight ?? false
  }));

  const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

  try {
    updateStatus("⏳ Nahrávám Excel na server...");
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array"
    });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });

    // Vytvoříme jméno souboru: products_26032025_[Z].xlsx
    const dateNow = new Date();
    const dd = String(dateNow.getDate()).padStart(2, "0");
    const mm = String(dateNow.getMonth() + 1).padStart(2, "0");
    const yyyy = String(dateNow.getFullYear());
    const dateStr = dd + mm + yyyy; 
    const fileName = `products_${dateStr}_[${selectedShop}].xlsx`;

    const file = new File([blob], fileName, {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });

    // Pro Excel: doplníme i unikátní sufix do public_id
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const excelUrl = await uploadFileForExcel(file, randomSuffix);

    // Zkopírování odkazu do schránky
    navigator.clipboard.writeText(excelUrl).then(
      () => {
        updateStatus("✅ Odkaz zkopírován do schránky!");
      },
      (err) => {
        updateStatus("❌ Chyba při kopírování odkazu: " + err);
      }
    );

    // Otevření WhatsApp
    const whatsappUrl = `whatsapp://send?text=Zde je vygenerovaný Excel soubor: ${encodeURIComponent(excelUrl)}`;
    window.location.href = whatsappUrl;

    savedProductsDiv.innerHTML =
      "<p>Soubor byl nahrán a odkaz zkopírován. Otevři WhatsApp a odešli zprávu.</p>";
  } catch (error) {
    updateStatus(`❌ Chyba při nahrávání Excelu: ${error.message}`);
  }
}

/* ---------------------------------
   Funkce pro Excel s unikátním sufixem
-----------------------------------*/
async function uploadFileForExcel(file, randomSuffix) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  // Připravíme datum
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = String(now.getFullYear());
  const dateStr = dd + mm + yyyy; 

  // Např. products_26032025_[Z]_ABCD
  const publicId = `products_${dateStr}_[${selectedShop}]_${randomSuffix}`;

  formData.append("folder", "excel_files");
  formData.append("public_id", publicId);

  const resp = await fetch(CLOUDINARY_UPLOAD_URL, {
    method: "POST",
    body: formData
  });
  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`Chyba při nahrávání Excelu: ${resp.status} - ${errorText}`);
  }
  const data = await resp.json();
  return data.secure_url;
}

/* ---------------------------------
   Reset úložiště
-----------------------------------*/
async function resetStorage() {
  const confirmed = await showConfirmModal();
  if (!confirmed) return;

  localStorage.clear();
  photos = [];
  selectedShop = null;
  photoCountElem.textContent = "0/3";
  document.getElementById("product-name").value = "";
  document.getElementById("product-price").value = "";
  document.getElementById("product-location").value = "";
  categoryIdInput.value = "";
  categoryBtnText.innerHTML = 'Vybrat kategorii';
  shippingMethodSelect.value = "2424163";
  document.getElementById("promo-priority").checked = false;
  document.getElementById("promo-bold").checked = false;
  document.getElementById("promo-highlight").checked = false;
  progressBar.value = 0;
  progressBar.classList.add("is-hidden");

  productDetailsSection.classList.add("is-hidden");
  photoSectionSection.classList.add("is-hidden");
  finishSection.classList.add("is-hidden");
  shopSelectionSection.classList.remove("is-hidden");
  takePhotoBtn.disabled = false;
  document.getElementById("saved-products").innerHTML = "";
  updateStepProgressBar(0);

  updateStatus("🧹 Data byla vymazána! Začni znovu.");
}

/* ---------------------------------
   Navigace mezi kroky (Zpět / Dál)
-----------------------------------*/
const steps = [
  shopSelectionSection,
  photoSectionSection,
  productDetailsSection,
  finishSection
];

document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const currentStep = parseInt(btn.dataset.step, 10);
    const isNext = btn.classList.contains("next-btn");
    const newStep = isNext ? currentStep + 1 : currentStep - 1;

    if (newStep >= 0 && newStep < steps.length) {
      // Kontrola 3 fotek při přechodu z kroku 1
      if (currentStep === 1 && isNext && photos.length < 3) {
        updateStatus("⚠️ Musíš nafotit 3 fotky, než přejdeš dál!");
        return;
      }
      // Kontrola vyplnění při přechodu z kroku 2
      if (currentStep === 2 && isNext) {
        const name = document.getElementById("product-name").value.trim();
        const price = document.getElementById("product-price").value.trim();
        const categoryId = categoryIdInput.value.trim();
        const shippingId = shippingMethodSelect.value;
        if (!name || !price || !categoryId || !shippingId) {
          updateStatus("⚠️ Vyplň název, cenu, kategorii a dopravu, než přejdeš dál!");
          return;
        }
      }

      steps[currentStep].classList.add("is-hidden");
      steps[newStep].classList.remove("is-hidden");
      updateStatus(`👉 Přepnuto na krok č. ${newStep + 1}`);
      updateStepProgressBar(newStep);
    }
  });
});

/* ---------------------------------
   Potvrzovací modál ANO/NE
-----------------------------------*/
function showConfirmModal() {
  openModal(confirmModal);
  return new Promise((resolve) => {
    confirmYesBtn.onclick = () => {
      closeModal(confirmModal);
      resolve(true);
    };
    confirmNoBtn.onclick = () => {
      closeModal(confirmModal);
      resolve(false);
    };
  });
}

/* ---------------------------------
   Modál pro odchod
-----------------------------------*/
window.addEventListener("beforeunload", (e) => {
  openModal(exitModal);
  e.preventDefault();
  e.returnValue = "";
});

deleteDataBtn.addEventListener("click", () => {
  resetStorage();
  closeModal(exitModal);
  updateStatus("🧹 Data vymazána při odchodu!");
  setTimeout(() => window.location.reload(), 1000);
});

closeModalBtn.addEventListener("click", () => {
  closeModal(exitModal);
});

/* ---------------------------------
   Propojení tlačítek
-----------------------------------*/
finishBtn.addEventListener("click", finish);
resetBtn.addEventListener("click", resetStorage);

// --- Progress bar kroků ---
function updateStepProgressBar(step) {
  const bar = document.getElementById('step-progress-bar');
  const steps = document.querySelectorAll('.step-label');
  const percent = [0, 33, 66, 100][step] || 0;
  bar.style.width = percent + '%';
  steps.forEach((el, idx) => {
    if (idx === step) el.classList.add('active');
    else el.classList.remove('active');
  });
}

// --- Validace a chybové hlášky pod pole ---
function showFieldError(inputId, message) {
  const input = document.getElementById(inputId);
  input.classList.add('input-error');
  let err = input.parentNode.querySelector('.error-message');
  if (!err) {
    err = document.createElement('div');
    err.className = 'error-message';
    input.parentNode.appendChild(err);
  }
  err.textContent = message;
}
function clearFieldError(inputId) {
  const input = document.getElementById(inputId);
  input.classList.remove('input-error');
  let err = input.parentNode.querySelector('.error-message');
  if (err) err.textContent = '';
}

// --- Historie a autocomplete pro inputy ---
const inputHistoryKeys = {
  'product-name': 'history_product_name',
  'product-price': 'history_product_price',
  'product-location': 'history_product_location'
};

function getInputHistory(inputId) {
  const key = inputHistoryKeys[inputId];
  if (!key) return [];
  return JSON.parse(localStorage.getItem(key) || '[]');
}
function setInputHistory(inputId, value) {
  const key = inputHistoryKeys[inputId];
  if (!key) return;
  let arr = getInputHistory(inputId);
  arr = arr.filter(v => v !== value && v !== '');
  arr.unshift(value);
  if (arr.length > 2) arr = arr.slice(0, 2);
  localStorage.setItem(key, JSON.stringify(arr));
}
function renderInputHistory(inputId) {
  const input = document.getElementById(inputId);
  const historyDiv = document.getElementById(inputId.replace('product-', '') + '-history');
  if (!historyDiv) return;
  const val = input.value.trim();
  const history = getInputHistory(inputId).filter(v => v && (!val || v.toLowerCase().includes(val.toLowerCase())));
  historyDiv.innerHTML = '';
  history.forEach(item => {
    const el = document.createElement('span');
    el.className = 'history-item';
    el.textContent = item;
    el.onclick = () => {
      input.value = item;
      renderInputHistory(inputId);
    };
    historyDiv.appendChild(el);
  });
}
function clearInputValue(inputId) {
  const input = document.getElementById(inputId);
  input.value = '';
  renderInputHistory(inputId);
}
['product-name', 'product-price', 'product-location'].forEach(id => {
  const input = document.getElementById(id);
  if (input) {
    input.addEventListener('input', () => renderInputHistory(id));
    input.addEventListener('focus', () => renderInputHistory(id));
    input.addEventListener('blur', () => setTimeout(() => renderInputHistory(id), 200));
  }
});
document.querySelectorAll('.clear-input-btn').forEach(btn => {
  btn.onclick = (e) => {
    const inputId = btn.getAttribute('data-input');
    clearInputValue(inputId);
  };
});
// --- Při přidání produktu aktualizuj historii ---
const origAddProduct = addProduct;
addProduct = async function() {
  const name = document.getElementById('product-name').value.trim();
  const price = document.getElementById('product-price').value.trim();
  const location = document.getElementById('product-location').value.trim();
  if (name) setInputHistory('product-name', name);
  if (price) setInputHistory('product-price', price);
  if (location) setInputHistory('product-location', location);
  await origAddProduct.apply(this, arguments);
};