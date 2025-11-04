// firebase.js – Şantiye Takip (Firestore + yardımcılar) // Bu dosyayı index.html ile aynı klasöre koy. app.jsx bu modülden içe aktarır.

import { initializeApp, getApps, getApp } from "firebase/app"; import { getFirestore, collection, addDoc, query, where, orderBy, limit, getDocs, serverTimestamp, updateDoc, doc, } from "firebase/firestore";

/************************************

🔧 Firebase yapılandırması

Aşağıyı kendi projenin değerleriyle doldur. ************************************/ export const firebaseConfig = { apiKey: "YOUR_API_KEY", authDomain: "YOUR_AUTH_DOMAIN", projectId: "YOUR_PROJECT_ID", storageBucket: "YOUR_STORAGE_BUCKET", messagingSenderId: "YOUR_MSG_SENDER_ID", appId: "YOUR_APP_ID", };


export function initFirebase() { return getApps().length ? getApp() : initializeApp(firebaseConfig); }

export const app = initFirebase(); export const db = getFirestore(app);

/************************************

🧱 Sabitler (UI ve veri için) ************************************/ export const BLOCKS = [ "A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z" ]; export const TEAMS = ["Kalip","Demir","Beton","Siva","Mekanik","Elektrik"]; // örnek export const STATUSES = ["Planlandı","Devam","Bitti"];


/************************************

⏱️ Yardımcılar ************************************/ export function nowTs() { return serverTimestamp(); } export function tsToMillis(ts) { try { return ts?.toMillis?.() ?? 0; } catch { return 0; } } export function tsToLocal(ts) { try { return ts?.toDate?.().toLocaleString?.() ?? "-"; } catch { return "-"; } }


/************************************

🔌 Firestore – Event tabanlı CRUD

action ∈ create | edit | delete | revert

superseded: true → eski olay geçersiz kılındı ************************************/ export async function createEvent({ blockId, teamId, status, note, userId }) { return addDoc(collection(db, "events"), { action: "create", blockId, teamId, status, note: note || "", userId: userId || "demo", superseded: false, timestamp: nowTs(), }); }


export async function editEvent({ eventId, changes, userId }) { // önceki olayı geçersiz kıl await updateDoc(doc(db, "events", eventId), { superseded: true }); // yeni edit olayı ekle return addDoc(collection(db, "events"), { action: "edit", prevEventId: eventId, ...changes, note: changes?.note ?? "", userId: userId || "demo", superseded: false, timestamp: nowTs(), }); }

export async function deleteEvent({ eventId, reason, userId }) { await updateDoc(doc(db, "events", eventId), { superseded: true }); return addDoc(collection(db, "events"), { action: "delete", prevEventId: eventId, note: reason || "", userId: userId || "demo", superseded: false, timestamp: nowTs(), }); }

export async function revertEvent({ eventId, reason, userId }) { return addDoc(collection(db, "events"), { action: "revert", prevEventId: eventId, note: reason || "", userId: userId || "demo", superseded: false, timestamp: nowTs(), }); }

/************************************

📥 Okuma – Filtreli liste çekme

Not: qText (not içinde arama) ve tarih aralığı

Firestore'da LIKE yok; bu nedenle client-side filtre uygulanır. ************************************/ export async function fetchEvents({ blockId, teamId, status, qText, from, to, pageSize = 200 }) { const cons = []; if (blockId && blockId !== "Tümü") cons.push(where("blockId", "==", blockId)); if (teamId && teamId !== "Tümü") cons.push(where("teamId", "==", teamId)); if (status && status !== "Tümü") cons.push(where("status", "==", status)); cons.push(orderBy("timestamp", "desc")); cons.push(limit(pageSize));


const qy = query(collection(db, "events"), ...cons); const snap = await getDocs(qy); let rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

// Tarih aralığı (client-side) if (from || to) { const fromMs = from ? new Date(from).getTime() : 0; const toMs = to ? new Date(to).getTime() : Number.MAX_SAFE_INTEGER; rows = rows.filter((r) => { const ms = tsToMillis(r.timestamp); return ms >= fromMs && ms <= toMs; }); }

// Not içinde arama (client-side) if (qText) { const ql = qText.trim().toLowerCase(); rows = rows.filter((r) => (r.note || "").toLowerCase().includes(ql)); }

return rows; }
