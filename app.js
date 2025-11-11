// v1.6 – Vista Premium Şantiye Takip (yalnız app.js)
// - Alfabetik ekip listesi + yeni kalemler
// - Başladı = Devam (sarı); renk yoksa Başlanmadı
// - Çoklu pafta (Bölüm 3) + seçili kalem pafta önizleme (Bölüm 2)
// - İcmal sadece fast_logs'tan, doğru yüzdeler
// - Tüm cihazlarda pafta/Modal drag-scroll akıcı
// - Defansif DOM erişimi (eleman yoksa atlar)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getFirestore, collection, addDoc, serverTimestamp,
  query, orderBy, onSnapshot, doc, deleteDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

/* Firebase config (sizin proje) */
const firebaseConfig = {
  apiKey: "AIzaSyAdvmca8C-RXTrnvhH4dEX1bFhYrMlyhSE",
  authDomain: "santiye-takip-83874.firebaseapp.com",
  projectId: "santiye-takip-83874",
  storageBucket: "santiye-takip-83874.firebasestorage.app",
  messagingSenderId: "893666575482",
  appId: "1:893666575482:web:762be4fb7feea74a7aa7c3"
};
const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

/* --------- SABİTLER --------- */

// Blok dizilişi (3 sıra)
const TOP = ["AC","AD","AE","AF","AG","AH","AI","AJ","AK","AL","AM","AN"];
const MID = ["AB","Y","V","S","R","P","O","N","M","L","K","J","I"];
const BOT = ["AA","Z","U","T","Sosyal","A","B","C","D","E","F","G","H"];
const ALL_BLOCKS = [...TOP, ...MID.filter(x=>"Sosyal"!==x), ...BOT.filter(x=>"Sosyal"!==x)];

// Mülkiyet (AS/MÜT) – kısa rozet
const OWN = {};
const asSet = new Set(["AC","AE","AG","AI","AK","AM","AB","V","R","O","M","K","I","AA","U","A","C","E","G"]);
[...TOP,...MID,...BOT].forEach(b=>{ OWN[b] = (b==="Sosyal") ? "" : (asSet.has(b) ? "AS" : "MÜT"); });

// Ekip listesi – v1.6 sırası (Bölüm 3 çoklu pafta için kesin sıra)
const CREW_ORDER = [
  "Elektrik","Mekanik","Kör Kasa","TG5","Çatı (Kereste)","Çatı (Oluk)","Çatı (Kiremit)",
  "Kaba Sıva (İç)","Makina Alçı","Saten Alçı","Dış Cephe Sıva","Dış Cephe Kenet","Denizlik",
  "Dış Cephe Bordex","Dış Cephe Çizgi Sıva","PVC","Klima Tesisat","Asma Tavan","Yerden Isıtma",
  "Şap","İç Boya","Parke","Seramik","Mobilya","Çelik Kapı"
];

// Form açılırlarında alfabetik gösterilecek ekip listesi
const CREWS_ALPHA = Array.from(new Set([
  // Eski + yeni kalemler
  "Mekanik","Elektrik","Çatı (Kereste)","Çatı (Kiremit)","Çatı (Oluk)","Denizlik","Parke",
  "Seramik","Boya","TG5","PVC","Kör Kasa","Şap","Makina Alçı","Saten Alçı","Kaba Sıva (İç)",
  "Yerden Isıtma","Asma Tavan","Klima Tesisat","Mobilya","Çelik Kapı","Korkuluk",
  // Dış cephe 4'e bölündü
  "Dış Cephe Bordex","Dış Cephe Sıva","Dış Cephe Çizgi Sıva","Dış Cephe Kenet",
  // Yeni
  "İç Boya"
])).sort((a,b)=>a.localeCompare(b,"tr-TR"));

// “Başladı” = “Devam” renk sınıfı
function statusToClass(s){
  if(!s) return ""; // Başlanmadı
  const v = s.trim();
  if (v==="Basladi" || v==="Başladı" || v==="Devam" || v==="Devam Ediyor") return "d-devam";
  if (v==="Bitti") return "d-bitti";
  if (v==="Teslim" || v==="Teslim Alındı" || v==="TeslimAlindi") return "d-teslim";
  return "";
}

/* --------- YARDIMCILAR --------- */

const el  = s=>document.querySelector(s);
const els = s=>document.querySelectorAll(s);

function fillSelect(id, list, placeholder="— Seçiniz —"){
  const s = el('#'+id); if(!s) return;
  s.innerHTML = `<option value="">${placeholder}</option>` + list.map(v=>`<option value="${v}">${v}</option>`).join("");
}

function formatDateFromTS(ts){
  if (!ts) return "-";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("tr-TR",{day:"2-digit",month:"2-digit",year:"numeric"})+" "+
         d.toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"});
}

function todayKey(){
  const d = new Date();
  const m = (d.getMonth()+1).toString().padStart(2,'0');
  const day = d.getDate().toString().padStart(2,'0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function makeBlok(label){
  const div = document.createElement("div");
  div.className = "blok"+(label==="Sosyal"?" sosyal":"");
  div.dataset.id = label;
  div.innerHTML = `<span>${label==="Sosyal"?"SOSYAL":label}</span>${label!=="Sosyal"?`<span class="own">${OWN[label]||""}</span>`:""}`;
  return div;
}

function drawPaftaInto(container, topArr=TOP, midArr=MID, botArr=BOT){
  if(!container) return;
  container.innerHTML = "";
  const pafta = document.createElement("div");
  pafta.className = "pafta";
  const r1 = document.createElement("div"); r1.className = "pafta-row";
  const r2 = document.createElement("div"); r2.className = "pafta-row";
  const r3 = document.createElement("div"); r3.className = "pafta-row";
  topArr.forEach(b=>r1.appendChild(makeBlok(b)));
  midArr.forEach(b=>r2.appendChild(makeBlok(b)));
  botArr.forEach(b=>r3.appendChild(makeBlok(b)));
  pafta.append(r1,r2,r3);
  container.appendChild(pafta);
  enableDragScroll(pafta);
}

function clearStatusClasses(elm){
  elm.classList.remove("d-devam","d-bitti","d-teslim","durum-devam","durum-bitti","durum-teslim");
}

/* Drag-scroll: pointer + touch + wheel */
function enableDragScroll(container){
  if(!container) return;

  // Pointer
  let pDown=false, pStartX=0, pStartLeft=0;
  container.addEventListener('pointerdown', e=>{
    pDown=true; pStartX=e.clientX; pStartLeft=container.scrollLeft;
    container.style.cursor="grabbing";
    container.setPointerCapture(e.pointerId);
  });
  container.addEventListener('pointermove', e=>{
    if(!pDown) return;
    container.scrollLeft = pStartLeft - (e.clientX - pStartX);
  });
  ['pointerup','pointercancel','pointerleave'].forEach(evt=>{
    container.addEventListener(evt, ()=>{ pDown=false; container.style.cursor="grab"; });
  });

  // Touch – yatay öncelik
  let tStartX=0, tStartY=0, tStartLeft=0, decided=false, horizontal=false;
  container.addEventListener('touchstart', e=>{
    if(e.touches.length!==1) return;
    const t = e.touches[0];
    tStartX=t.clientX; tStartY=t.clientY; tStartLeft=container.scrollLeft;
    decided=false; horizontal=false;
  }, {passive:true});

  container.addEventListener('touchmove', e=>{
    if(e.touches.length!==1) return;
    const t = e.touches[0];
    const dx = t.clientX - tStartX;
    const dy = t.clientY - tStartY;
    if(!decided){
      horizontal = Math.abs(dx) > Math.abs(dy);
      decided = true;
    }
    if(horizontal){
      e.preventDefault();
      container.scrollLeft = tStartLeft - dx;
    }
  }, {passive:false});

  // Wheel/trackpad
  container.addEventListener('wheel', e=>{
    if(Math.abs(e.deltaX) > Math.abs(e.deltaY)){
      container.scrollLeft += e.deltaX;
      e.preventDefault();
    }
  }, {passive:false});
}

/* --------- NAV --------- */
els(".nav-btn").forEach(btn=>{
  btn.addEventListener("click",()=>{
    els(".nav-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    const id = btn.dataset.page;
    els(".page").forEach(p=>p.classList.remove("active"));
    const page = el("#"+id);
    if(page) page.classList.add("active");
  });
});

/* --------- FORM SELECTLER (alfabetik) --------- */
fillSelect("yoklamaEkip", CREWS_ALPHA);
fillSelect("kayitEkip",   CREWS_ALPHA);
fillSelect("kayitKullanici", ["Muhammet","Harun","Metin","Mert","Fuat","Furkan","Misafir"].sort((a,b)=>a.localeCompare(b,"tr-TR")));
fillSelect("yoklamaBlok", ALL_BLOCKS.slice().sort((a,b)=>a.localeCompare(b,"tr-TR")));
fillSelect("kayitBlok",   ALL_BLOCKS.slice().sort((a,b)=>a.localeCompare(b,"tr-TR")));
fillSelect("filtreEkip",  ["Tümü", ...CREWS_ALPHA], "Ekip (Tümü)");
fillSelect("filtreBlok",  ["Tümü", ...ALL_BLOCKS.slice().sort((a,b)=>a.localeCompare(b,"tr-TR"))], "Blok (Tümü)");

/* --------- BÖLÜM 1: GÜNLÜK YOKLAMA --------- */
const formYok = el("#formYoklama");
if(formYok){
  formYok.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const crew = el("#yoklamaEkip")?.value || "";
    const count = parseInt(el("#yoklamaKisi")?.value||"0",10);
    const block = el("#yoklamaBlok")?.value || "";
    const note  = (el("#yoklamaNot")?.value || "").trim();
    if(!crew||!count||!block){ alert("Ekip, kişi sayısı ve blok zorunludur."); return; }
    await addDoc(collection(db,"daily_attendance", todayKey(), "entries"), {
      crew, count, block, note, user: "Sistem", ts: serverTimestamp()
    });
    const kisi = el("#yoklamaKisi"); const not = el("#yoklamaNot");
    if(kisi) kisi.value=""; if(not) not.value="";
  });
}

function renderDaily(entries){
  const ul = el("#yoklamaListesi"); if(!ul) return;
  if(!entries.length){ ul.innerHTML="<li>Bugün henüz kayıt yok.</li>"; return; }
  ul.innerHTML = entries.map(x=>`
    <li style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <b>${x.crew}</b> — <b>${x.count}</b> kişi — <b>${x.block}</b>
      <span style="color:#777">(${formatDateFromTS(x.ts)})</span>${x.note?` — ${x.note}`:""}
      <span class="inline" style="gap:6px;margin-left:auto">
        <button class="btn btn-secondary btn-icon" data-edit-att="${x.id}" title="Düzenle"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-icon" style="background:#ffe6e6;color:#c62828" data-del-att="${x.id}" title="Sil"><i class="fa-solid fa-trash"></i></button>
      </span>
    </li>`).join("");
}
onSnapshot(
  query(collection(db,"daily_attendance", todayKey(), "entries"), orderBy("ts","desc")),
  (snap)=>{ renderDaily(snap.docs.map(d=>({id:d.id, ...d.data()}))); }
);

/* --------- BÖLÜM 2: HIZLI KAYIT + ÖNİZLEME PAFTA --------- */
const formFast = el("#formHizliKayit");
if(formFast){
  formFast.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const rec = {
      user:  el("#kayitKullanici")?.value || "",
      crew:  el("#kayitEkip")?.value || "",
      block: el("#kayitBlok")?.value || "",
      status: el("#kayitDurum")?.value || "",     // "Başlanmadı" seçeneği de olabilir
      note:  (el("#kayitNot")?.value || "").trim(),
      ts: serverTimestamp()
    };
    if(!rec.user||!rec.crew||!rec.block){ alert("Kullanıcı, ekip ve blok zorunludur."); return; }
    await addDoc(collection(db,"fast_logs"), rec);
    const not = el("#kayitNot"); if(not) not.value="";
  });

  // Seçilen imalat kaleminin pafta önizlemesi
  const previewHostId = "kayitPreviewHost";
  if(!el("#"+previewHostId)){
    const host = document.createElement("div");
    host.id = previewHostId;
    host.className = "card";
    host.innerHTML = `<h3>Seçili Kalem İçin Pafta Önizleme</h3><div id="kayitPreviewPafta"></div>`;
    formFast.parentElement?.appendChild(host);
    // pafta çiz
    drawPaftaInto(el("#kayitPreviewPafta"));
  }
}

/* FAST LOGS – Canlı oku + tablo + pafta boyama */
let FAST_ALL = [];

function latestClassFor(block, crew){ // blok için, opsiyonel ekip filtresi
  const rows = FAST_ALL.filter(x=>x.block===block && (!crew || x.crew===crew));
  if(!rows.length) return ""; // Başlanmadı
  rows.sort((a,b)=>{
    const ta = a.ts?.toMillis?.() ?? 0;
    const tb = b.ts?.toMillis?.() ?? 0;
    return tb - ta;
  });
  return statusToClass(rows[0].status);
}

function paintPafta(container, crewFilter){
  if(!container) return;
  const boxes = container.querySelectorAll(".blok");
  boxes.forEach(b=>{
    clearStatusClasses(b);
    const id = b.dataset.id;
    if(id && id!=="Sosyal"){
      const cls = latestClassFor(id, crewFilter);
      if(cls) b.classList.add(cls);
    }
  });
}

function ensureArchiveTableRows(rows){
  const tbody = el("#arsivBody"); if(!tbody) return;
  const filtered = rows.filter(matchArchiveFilter);
  tbody.innerHTML = filtered.length ? filtered.map(x=>`
    <tr>
      <td>${formatDateFromTS(x.ts)}</td>
      <td>${x.user}</td>
      <td>${x.crew}</td>
      <td>${x.block}</td>
      <td><b>${x.status||"Başlanmadı"}</b></td>
      <td>${x.note?x.note:"-"}</td>
      <td>
        <button class="btn btn-secondary btn-icon" data-edit="${x.id}" title="Düzenle"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-icon" style="background:#ffe6e6;color:#c62828" data-del="${x.id}" title="Sil"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>
  `).join("") : `<tr><td colspan="7" style="padding:14px;text-align:center;color:#666">Kayıt yok</td></tr>`;
}

function matchArchiveFilter(x){
  const e = el("#filtreEkip")?.value;
  const b = el("#filtreBlok")?.value;
  const ekipOk = !e || e==="Tümü" || x.crew===e;
  const blokOk = !b || b==="Tümü" || x.block===b;
  return ekipOk && blokOk;
}

onSnapshot(
  query(collection(db,"fast_logs"), orderBy("ts","desc")),
  (snap)=>{
    FAST_ALL = snap.docs.map(d=>({id:d.id, ...d.data()}));

    // Bölüm 2: arşiv tablosu
    ensureArchiveTableRows(FAST_ALL);

    // Bölüm 2: seçili kalem önizleme paftası
    const selCrew = el("#kayitEkip")?.value || "";
    const prevPafta = el("#kayitPreviewPafta")?.querySelector(".pafta");
    if(prevPafta) paintPafta(prevPafta, selCrew || undefined);

    // Bölüm 3: çoklu paftalar (index v1.6 ile gelecek konteynerlere boyar)
    renderMultiCrewPanels();
  }
);

/* Archive filtre tetikleme */
el("#filtreEkip")?.addEventListener("change", ()=>ensureArchiveTableRows(FAST_ALL));
el("#filtreBlok")?.addEventListener("change", ()=>ensureArchiveTableRows(FAST_ALL));
el("#btnFiltreTemizle")?.addEventListener("click", ()=>{
  const e = el("#filtreEkip"), b = el("#filtreBlok");
  if(e) e.value=""; if(b) b.value="";
  ensureArchiveTableRows(FAST_ALL);
});

/* Edit / Delete – fast_logs */
document.addEventListener("click", async (e)=>{
  const del = e.target.closest("[data-del]");
  const edit = e.target.closest("[data-edit]");
  const delAtt = e.target.closest("[data-del-att]");
  const editAtt = e.target.closest("[data-edit-att]");

  if(del){
    const id = del.getAttribute("data-del");
    await deleteDoc(doc(db,"fast_logs", id));
  }
  if(edit){
    const id = edit.getAttribute("data-edit");
    const x = FAST_ALL.find(r=>r.id===id);
    if(!x) return;
    if(el("#kayitKullanici")) el("#kayitKullanici").value = x.user||"";
    if(el("#kayitEkip"))      el("#kayitEkip").value      = x.crew||"";
    if(el("#kayitBlok"))      el("#kayitBlok").value      = x.block||"";
    if(el("#kayitDurum"))     el("#kayitDurum").value     = x.status||"Basladi";
    if(el("#kayitNot"))       el("#kayitNot").value       = x.note||"";
    await deleteDoc(doc(db,"fast_logs", id));
    alert("Kayıt düzenleme modunda forma alındı. Kaydet ile güncel halini ekle.");
  }

  // Günlük yoklama sil
  if(delAtt){
    const id = delAtt.getAttribute("data-del-att");
    await deleteDoc(doc(collection(db,"daily_attendance", todayKey(), "entries"), id));
  }

  // Günlük yoklama düzenle (doğrudan update)
  if(editAtt){
    const id = editAtt.getAttribute("data-edit-att");
    // Pratik düzenleme: sayı ve not alanlarını sorup güncelle
    const yeniSayi = prompt("Yeni kişi sayısı?", "");
    const yeniNot  = prompt("Yeni not (boş olabilir)", "");
    if(yeniSayi!==null || yeniNot!==null){
      const ref = doc(collection(db,"daily_attendance", todayKey(), "entries"), id);
      const payload = {};
      if(yeniSayi!==null && yeniSayi.trim()!=="") payload.count = parseInt(yeniSayi,10)||0;
      if(yeniNot!==null) payload.note = yeniNot;
      try{ await updateDoc(ref, payload); } catch(err){ console.error(err); alert("Güncelleme yapılamadı."); }
    }
  }
});

/* --------- BÖLÜM 2: Paftadan Seç (Modal) --------- */
(function setupModalPicker(){
  const modal = el("#modal");
  const btnY  = el("#btnPaftaYoklama");
  const btnK  = el("#btnPaftaKayit");
  const btnC  = el("#btnClose");
  const host  = el("#modalPafta");
  if(host) drawPaftaInto(host); // modal içi pafta

  let activeTarget = null;

  function openPicker(targetId){
    activeTarget = targetId;
    modal?.classList.add("active");
    // güvence – drag scroll
    const p = host?.querySelector(".pafta"); if(p) enableDragScroll(p);
  }
  function closePicker(){
    modal?.classList.remove("active");
    activeTarget = null;
  }

  btnY?.addEventListener("click", ()=>openPicker("yoklamaBlok"));
  btnK?.addEventListener("click", ()=>openPicker("kayitBlok"));
  btnC?.addEventListener("click", closePicker);
  modal?.addEventListener("click", (e)=>{ if(e.target.id==="modal") closePicker(); });

  ["#modalPafta"].forEach(sel=>{
    el(sel)?.addEventListener("click",(ev)=>{
      const box = ev.target.closest(".blok"); if(!box||!activeTarget) return;
      const id = box.dataset.id; if(id==="Sosyal") return;
      const t = el("#"+activeTarget); if(t) t.value = id;
      closePicker();
    });
  });
})();

/* --------- BÖLÜM 3: ÇOKLU PAFTALAR --------- */
// index v1.6 ile .crew-panels içine her kalem için card + pafta konacak.
// app.js, konteyner yoksa oluşturmaya çalışır.
function getOrCreateCrewPanels(){
  let wrap = el("#crewPanels");
  if(!wrap){
    // Bölüm 3 içinde yarat (defansif)
    const b3 = el("#bolum3");
    if(!b3) return null;
    wrap = document.createElement("div");
    wrap.id = "crewPanels";
    b3.appendChild(wrap);
  }
  return wrap;
}

function renderMultiCrewPanels(){
  const wrap = getOrCreateCrewPanels(); if(!wrap) return;
  if(!wrap.dataset.built){   // bir kere skeleton üret
    wrap.innerHTML = "";
    CREW_ORDER.forEach(name=>{
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <h3 style="margin-top:0">${name}</h3>
        <div class="crew-pafta"></div>
      `;
      const area = card.querySelector(".crew-pafta");
      drawPaftaInto(area);    // pafta çiz
      wrap.appendChild(card);
    });
    wrap.dataset.built = "1";
  }
  // Boyama
  wrap.querySelectorAll(".card").forEach(card=>{
    const title = card.querySelector("h3")?.textContent?.trim();
    const pafta = card.querySelector(".pafta");
    if(title && pafta) paintPafta(pafta, title); // o imalat kaleminin paftası
  });
}

/* --------- İCMAL (Yalnız fast_logs) --------- */
function buildIcmalHTML(){
  const totalBlocks = ALL_BLOCKS.length;

  // tek tek ekip için yapılan blok sayısı
  const rows = CREW_ORDER.map(crew=>{
    const doneCount = ALL_BLOCKS.reduce((acc, b)=>{
      const cls = latestClassFor(b, crew);
      return acc + (cls==="d-bitti" || cls==="d-teslim" ? 1 : 0);
    }, 0);
    const percent = totalBlocks ? (doneCount/totalBlocks*100) : 0;
    return `<tr>
      <td style="padding:8px;border:1px solid #bbb">${crew}</td>
      <td style="padding:8px;border:1px solid #bbb;text-align:center">${totalBlocks}</td>
      <td style="padding:8px;border:1px solid #bbb;text-align:center">${doneCount}</td>
      <td style="padding:8px;border:1px solid #bbb;text-align:center"><b>%${percent.toFixed(1)}</b> <span style="color:#666">(${doneCount}/${totalBlocks})</span></td>
    </tr>`;
  }).join("");

  const percents = CREW_ORDER.map(crew=>{
    const doneCount = ALL_BLOCKS.reduce((acc, b)=>{
      const cls = latestClassFor(b, crew);
      return acc + (cls==="d-bitti" || cls==="d-teslim" ? 1 : 0);
    }, 0);
    return totalBlocks ? (doneCount/totalBlocks*100) : 0;
  });
  const avg = percents.reduce((a,b)=>a+b,0)/(percents.length||1);

  return `
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <thead>
        <tr style="background:#f1f5f9">
          <th style="padding:10px;border:1px solid #bbb;text-align:left">İMALAT KALEMİ</th>
          <th style="padding:10px;border:1px solid #bbb">YAPILACAK BLOK</th>
          <th style="padding:10px;border:1px solid #bbb">YAPILAN BLOK</th>
          <th style="padding:10px;border:1px solid #bbb">İLERLEME</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr style="background:#f9fafb;font-weight:700">
          <td style="padding:10px;border:1px solid #bbb">GENEL ORTALAMA</td>
          <td style="padding:10px;border:1px solid #bbb;text-align:center" colspan="3"><b>%${avg.toFixed(1)}</b></td>
        </tr>
      </tfoot>
    </table>
    <p style="margin-top:8px;color:#555">Toplam blok sayısı: <b>${totalBlocks}</b></p>
  `;
}

el("#btnPdfIcmal")?.addEventListener("click", ()=>{
  const printHost = el("#printTable"); if(!printHost) return;
  printHost.innerHTML = buildIcmalHTML();
  window.print();
});

/* --------- BAŞLANGIÇ --------- */
(function init(){
  // Ana pano eski tek pafta varsa, çiz ve boyamayı sürdür (geri uyum)
  const anaPaftaHost = el("#projePaftasi .pafta");
  if(!anaPaftaHost && el("#projePaftasi")){
    // eski tek pafta düzenini kur (geri uyumluluk)
    const cont = el("#projePaftasi");
    const shell = document.createElement("div");
    shell.className = "pafta";
    const r1 = document.createElement("div"); r1.className="pafta-row";
    const r2 = document.createElement("div"); r2.className="pafta-row";
    const r3 = document.createElement("div"); r3.className="pafta-row";
    TOP.forEach(b=>r1.appendChild(makeBlok(b)));
    MID.forEach(b=>r2.appendChild(makeBlok(b)));
    BOT.forEach(b=>r3.appendChild(makeBlok(b)));
    shell.append(r1,r2,r3); cont.appendChild(shell);
    enableDragScroll(shell);
  }else if(anaPaftaHost){
    enableDragScroll(anaPaftaHost);
  }

  // Bölüm 2: seçili kalem değiştikçe önizleme boyansın
  el("#kayitEkip")?.addEventListener("change", ()=>{
    const prev = el("#kayitPreviewPafta")?.querySelector(".pafta");
    if(prev){
      const crew = el("#kayitEkip").value || undefined;
      paintPafta(prev, crew);
    }
  });

  // Çoklu pafta panellerini üret (index v1.6 gelince tam görünür)
  renderMultiCrewPanels();
})();
