/* ==========================================================
   Přihlašovací brána (Firebase Auth).

   Dokud není přihlášen VLASTNÍK (window.OWNER_EMAIL), překryje
   stránku přihlašovacím formulářem. Po úspěšném přihlášení spustí
   všechny callbacky zaregistrované přes window.onAuthReady(cb).

   Vloží se na KAŽDOU stránku HNED za firebase-config.js.
   Styly jsou vlastní (nezávislé na Bulma), aby fungovaly všude.
   ==========================================================*/
(function () {
  const auth = window.fbAuth;
  const OWNER = String(window.OWNER_EMAIL || "").toLowerCase();
  const readyCbs = [];
  let ready = false;

  // Registrace callbacku, který se spustí po přihlášení vlastníka.
  window.onAuthReady = function (cb) {
    if (typeof cb !== "function") return;
    if (ready) { try { cb(); } catch (e) { /* noop */ } }
    else readyCbs.push(cb);
  };
  window.fbSignOut = function () { if (auth) auth.signOut(); };

  if (!auth) {
    console.error("Firebase Auth není načtený – zkontroluj SDK a firebase-config.js.");
    return;
  }

  /* --- Styly overlaye --- */
  const style = document.createElement("style");
  style.textContent = `
    #fb-auth-overlay{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;
      justify-content:center;background:rgba(15,17,26,.72);backdrop-filter:blur(6px);
      font-family:'Plus Jakarta Sans',system-ui,-apple-system,sans-serif}
    #fb-auth-card{background:#fff;color:#1a1a2e;width:min(92vw,360px);padding:28px 26px;
      border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.35)}
    #fb-auth-card h2{margin:0 0 4px;font-size:1.35rem;font-weight:800}
    #fb-auth-card p.sub{margin:0 0 18px;font-size:.9rem;color:#5b6472}
    #fb-auth-card label{display:block;font-size:.8rem;font-weight:600;margin:0 0 4px;color:#3a4150}
    #fb-auth-card input{width:100%;padding:11px 13px;margin:0 0 14px;border:1px solid #d6dae1;
      border-radius:11px;font-size:.95rem;box-sizing:border-box;font-family:inherit}
    #fb-auth-card input:focus{outline:none;border-color:#6b5bff;box-shadow:0 0 0 3px rgba(107,91,255,.18)}
    #fb-auth-btn{width:100%;padding:12px;border:0;border-radius:11px;background:#6b5bff;color:#fff;
      font-weight:700;font-size:.98rem;cursor:pointer;transition:filter .15s;font-family:inherit}
    #fb-auth-btn:hover{filter:brightness(1.07)}
    #fb-auth-btn:disabled{opacity:.6;cursor:default}
    #fb-auth-err{color:#e0245e;font-size:.83rem;margin:12px 0 0;min-height:1em}
    #fb-signout{position:fixed;top:12px;right:12px;z-index:9998;display:none;
      background:rgba(0,0,0,.55);color:#fff;border:0;border-radius:999px;padding:7px 14px;
      font-size:.8rem;font-weight:600;cursor:pointer;font-family:'Plus Jakarta Sans',system-ui,sans-serif}
    #fb-signout:hover{background:rgba(0,0,0,.75)}
  `;
  document.documentElement.appendChild(style);

  /* --- DOM overlaye --- */
  const overlay = document.createElement("div");
  overlay.id = "fb-auth-overlay";
  overlay.innerHTML = `
    <form id="fb-auth-card" autocomplete="on">
      <h2>🔐 Přihlášení</h2>
      <p class="sub">iAUKRO – přístup jen pro vlastníka.</p>
      <label for="fb-email">E-mail</label>
      <input id="fb-email" type="email" autocomplete="username" required />
      <label for="fb-pass">Heslo</label>
      <input id="fb-pass" type="password" autocomplete="current-password" required />
      <button id="fb-auth-btn" type="submit">Přihlásit se</button>
      <p id="fb-auth-err"></p>
    </form>`;

  const signout = document.createElement("button");
  signout.id = "fb-signout";
  signout.textContent = "Odhlásit";
  signout.addEventListener("click", function () { auth.signOut(); });

  function mount() {
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", mount);
      return;
    }
    document.body.appendChild(overlay);
    document.body.appendChild(signout);
    const form = overlay.querySelector("#fb-auth-card");
    const err = overlay.querySelector("#fb-auth-err");
    const btn = overlay.querySelector("#fb-auth-btn");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      err.textContent = "";
      btn.disabled = true;
      btn.textContent = "Přihlašuji…";
      const email = overlay.querySelector("#fb-email").value.trim();
      const pass = overlay.querySelector("#fb-pass").value;
      auth.signInWithEmailAndPassword(email, pass)
        .catch(function (e2) { err.textContent = humanErr(e2); })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = "Přihlásit se";
        });
    });
  }

  function humanErr(e) {
    const c = (e && e.code) || "";
    if (c.indexOf("wrong-password") >= 0 || c.indexOf("invalid-credential") >= 0) return "Špatný e-mail nebo heslo.";
    if (c.indexOf("user-not-found") >= 0) return "Uživatel neexistuje.";
    if (c.indexOf("too-many-requests") >= 0) return "Příliš mnoho pokusů, zkus to prosím za chvíli.";
    if (c.indexOf("invalid-email") >= 0) return "Neplatný e-mail.";
    if (c.indexOf("network") >= 0) return "Chyba sítě – zkontroluj připojení.";
    return (e && e.message) || "Přihlášení selhalo.";
  }

  function showOverlay() { overlay.style.display = "flex"; signout.style.display = "none"; }
  function hideOverlay() { overlay.style.display = "none"; signout.style.display = "block"; }

  mount();

  auth.onAuthStateChanged(function (user) {
    const isOwner = user && String(user.email || "").toLowerCase() === OWNER;
    if (isOwner) {
      hideOverlay();
      if (!ready) {
        ready = true;
        readyCbs.forEach(function (fn) { try { fn(); } catch (e) { /* noop */ } });
      }
    } else if (user) {
      // Přihlášený, ale nesprávný účet – hned odhlásit.
      const err = overlay.querySelector("#fb-auth-err");
      if (err) err.textContent = "Tento účet nemá přístup.";
      auth.signOut();
      showOverlay();
    } else {
      showOverlay();
    }
  });
})();
