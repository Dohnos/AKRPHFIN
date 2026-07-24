/* ==========================================================
   Firebase konfigurace – SPOLEČNÁ pro appku i dashboard.

   Databáze:    Cloud Firestore  (kolekce "products")
   Přihlášení:  Firebase Auth    (jen vlastník – viz OWNER_EMAIL)

   SDK (compat) se načítá v HTML PŘED tímto souborem:
     firebase-app-compat.js
     firebase-auth-compat.js
     firebase-firestore-compat.js
   ==========================================================*/
const firebaseConfig = {
  apiKey: "AIzaSyDS35KWiWHzm5YVxBYP2kXz4i_HdRsoV-4",
  authDomain: "iaukro.firebaseapp.com",
  projectId: "iaukro",
  storageBucket: "iaukro.firebasestorage.app",
  messagingSenderId: "697049455132",
  appId: "1:697049455132:web:d38ac37d8c6eab77a1ddd9"
};

// E-mail vlastníka s plnými právy. MUSÍ přesně sedět s Firestore pravidly
// (malými písmeny). Účet s tímto e-mailem si vytvoř ve Firebase Console
// → Authentication → Users.
window.OWNER_EMAIL = "retroaukce@email.com";

// Inicializace – jen pokud je SDK načtené a ještě neběží jiná instance.
if (window.firebase && firebase.apps && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

window.db = window.firebase && firebase.firestore ? firebase.firestore() : null;
window.fbAuth = window.firebase && firebase.auth ? firebase.auth() : null;

// Zápisy s undefined poli (Firestore je jinak odmítá) se tiše ignorují –
// chová se pak podobně jako JSON v Supabase.
if (window.db && typeof window.db.settings === "function") {
  try {
    window.db.settings({ ignoreUndefinedProperties: true });
  } catch (e) {
    /* settings už mohly být nastaveny – nevadí */
  }
}
