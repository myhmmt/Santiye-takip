// app.js — v1.6.1 (Parça 1/4)

// Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getFirestore, collection, addDoc, serverTimestamp,
  query, orderBy, onSnapshot, doc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

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

// --- Bloklar (pafta düzeni) ---
const TOP = ["AC","AD","AE","AF","AG","AH","AI","AJ","AK","AL","AM","AN"];
const MID = ["AB","Y","V","S","R","P","O","N","M","L","K","J","I"];
const BOT = ["AA","Z","U","T","Sosyal","A","B","C","D","E","F","G","H"];
const ALL_BLOCKS = [...TOP, ...MID.filter(x=>"Sosyal"!==x), ...BOT.filter(x=>"Sosyal"!==x)];

// --- Mülkiyet (AS/MÜT) kısa rozetler ---
const OWN = {};
const asSet = new Set(["AC","AE","AG","AI","AK","AM","AB","V","R","O","M","K","I","AA","U","A","C","E","G"]);
[...TOP,...MID,...BOT].forEach(b=>{ OWN[b] = asSet.has(b) ? "AS" : (b==="Sosyal"?"":"MÜT"); });

// --- İmalat kalemleri (sıralı pano için) ---
const CREWS_ORDER = [
  "Elektrik",
  "Mekanik",
  "Kör Kasa",
  "TG5",
  "Çatı (Kereste)",
  "Çatı (Oluk)",
  "Çatı (Kiremit)",
  "Kaba Sıva (İç)",
  "Makina Alçı",
  "Saten Alçı",
  "Dış Cephe Sıva",
  "Dış Cephe Kenet",
  "Denizlik",
  "Dış Cephe Bordex",
  "Dış Cephe Çizgi Sıva",
  "PVC",
  "Klima Tesisat",
  "Asma Tavan",
  "Yerden Isıtma",
  "Şap",
  "İç Boya",
  "Parke",
  "Seramik",
  "Mobilya",
  "Çelik Kapı",
];

// Form açılırları alfabetik (yeni eklenenler dahil)
const CREWS_FORMS = [...new Set(CREWS_ORDER)].slice().sort((a,b)=>a.localeCompare(b,"tr"));
const USERS = ["Muhammet","Harun","Metin","Mert","Fuat","Furkan","Misafir"];

// --- Yardımcılar ---
const $  = (s,root=document)=>root.querySelector(s);
const $$ = (s,root=document)=>root.querySelectorAll(s);

function fillSelect(id, list, placeholder="— Seçiniz —"){
  const s = $('#'+id);
  if(!s) return;
  s.innerHTML = `<option value="">${placeholder}</option>` + list.map(v=>`<option value="${v}">${v}</option>`).join("");
}

function formatDate(ts){
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

// Nav
$$(".nav-btn").forEach(btn=>{
  btn.addEventListener("click",()=>{
    $$(".nav-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    const id = btn.dataset.page;
    $$(".page").forEach(p=>p.classList.remove("active"));
    $("#"+id).classList.add("active");
  });
});

// Form/selectleri doldur
fillSelect("yoklamaEkip", CREWS_FORMS);
fillSelect("kayitEkip",  CREWS_FORMS);
fillSelect("kayitKullanici", USERS);
fillSelect("yoklamaBlok", ALL_BLOCKS);
fillSelect("kayitBlok",   ALL_BLOCKS);
// Arşiv filtreleri (Bölüm 2)
fillSelect("filtreEkip", ["Tümü", ...CREWS_FORMS], "Ekip (Tümü)");
fillSelect("filtreBlok", ["Tümü", ...ALL_BLOCKS], "Blok (Tümü)");
// app.js — v1.6.1 (Parça 2/4)

// --- Blok kutusu üretimi ---
function makeBlok(label){
  const div = document.createElement("div");
  div.className = "blok"+(label==="Sosyal"?" sosyal":"");
  div.dataset.id = label;
  // AS/MÜT rozet kısa (blok adını kapatmasın)
  const tag = (label!=="Sosyal" && OWN[label]) ? `<span class="own">${OWN[label]}</span>` : "";
  div.innerHTML = `<span>${label==="Sosyal"?"SOSYAL":label}</span>${tag}`;
  return div;
}
function drawRow(rowEl, arr){
  rowEl.innerHTML = "";
  arr.forEach(id=>rowEl.appendChild(makeBlok(id)));
}

// --- Tek pafta (3 satır) çiz ---
function drawSinglePafta(container){
  container.innerHTML = `
    <div class="pafta">
      <div class="pafta-row"></div>
      <div class="pafta-row"></div>
      <div class="pafta-row"></div>
    </div>
  `;
  const rows = container.querySelectorAll(".pafta-row");
  drawRow(rows[0], TOP);
  drawRow(rows[1], MID);
  drawRow(rows[2], BOT);
  // sürükleyerek kaydırma
  enableDragScroll(container.querySelector(".pafta"));
}

// --- Modal pafta (Paftadan Seç) çiz ---
function drawModalPafta(){
  const modalPafta = $("#modalPafta");
  modalPafta.innerHTML = `
    <div class="row" id="m-top"></div>
    <div class="row" id="m-mid"></div>
    <div class="row" id="m-bot"></div>
  `;
  drawRow($("#m-top"), TOP);
  drawRow($("#m-mid"), MID);
  drawRow($("#m-bot"), BOT);
  enableDragScroll(modalPafta);

  // blok seçimi → aktif hedef select'e yaz
  ["m-top","m-mid","m-bot"].forEach(id=>{
    $("#"+id).addEventListener("click",(ev)=>{
      const box = ev.target.closest(".blok");
      if(!box || !activePickerTarget) return;
      const bid = box.dataset.id;
      if(bid==="Sosyal") return;
      $("#"+activePickerTarget).value = bid;
      closePicker();
    });
  });
}

// --- Çoklu pafta (Bölüm 3) oluştur ---
// Her imalat kalemi için başlık + pafta (alt alta)
function buildMultiPafta(){
  const host = $("#multiPaftaHost");
  host.innerHTML = "";
  CREWS_ORDER.forEach(crew=>{
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3 style="margin-top:0">${crew}</h3>
      <div class="one-pafta"></div>
    `;
    host.appendChild(card);
    drawSinglePafta(card.querySelector(".one-pafta"));
  });
}
// app.js — v1.6.1 (Parça 3/4)

// --- Durum sınıfı eşlemesi ---
function statusToClass(status){
  if(!status) return "";                          // Başlanmadı
  const s = (status||"").toLowerCase();
  if (s==="basladi" || s==="devam" || s==="devam ediyor") return "d-devam"; // sarı
  if (s==="bitti") return "d-bitti";                                     // yeşil
  if (s==="teslim" || s==="teslim alındı" || s==="teslimalindi") return "d-teslim"; // koyu yeşil + tik
  return ""; // diğerleri → renksiz = Başlanmadı
}

// --- Seçilen kalem ve blok için en-güncel statünün sınıfını bul ---
function latestClassFor(blockId, crewName){
  const rows = FAST_ALL.filter(r => r.block===blockId && r.crew===crewName);
  if (!rows.length) return "";
  rows.sort((a,b)=>{
    const ta = a.ts?.toMillis?.() ?? 0;
    const tb = b.ts?.toMillis?.() ?? 0;
    return tb - ta;
  });
  return statusToClass(rows[0].status);
}

// --- Bir paftanın tek tek kutularını güncelle ---
function paintOnePafta(paftaRoot, crewName){
  // üç satırı sırayla bul
  const rows = paftaRoot.querySelectorAll(".pafta-row");
  const sets = [TOP, MID, BOT];

  rows.forEach((rowEl, idx)=>{
    const line = sets[idx];
    // önce tüm sınıfları temizle
    rowEl.querySelectorAll(".blok").forEach(b=>{
      b.classList.remove("d-devam","d-bitti","d-teslim");
    });
    // sonra en güncel sınıfı ekle
    line.forEach(blockId=>{
      const box = rowEl.querySelector(`.blok[data-id="${blockId}"]`);
      if (!box) return;
      const cls = latestClassFor(blockId, crewName);
      if (cls) box.classList.add(cls);
    });
  });
}

// --- Bölüm 3: Çoklu paftaların tamamını güncelle ---
function repaintAllCrews(){
  // Her kartın başlığı crew adıdır
  $$("#multiPaftaHost .card").forEach(card=>{
    const crewName = card.querySelector("h3")?.textContent?.trim();
    const paftaRoot = card.querySelector(".one-pafta .pafta");
    if (crewName && paftaRoot) paintOnePafta(paftaRoot, crewName);
  });
}

// --- İcmal (PDF/Print) sadece pafta verileriyle ---
// Not: Arşiv tablosu dahil edilmiyor.
function buildIcmalHTML(){
  const totalBlocks = ALL_BLOCKS.length;

  // CREWS_ORDER’daki sıraya göre satırlar
  const rowsHTML = CREWS_ORDER.map(crew=>{
    const doneCount = ALL_BLOCKS.reduce((acc, blockId)=>{
      const cls = latestClassFor(blockId, crew);
      return acc + (cls==="d-bitti" || cls==="d-teslim" ? 1 : 0);
    }, 0);
    const percent = totalBlocks ? (doneCount/totalBlocks*100) : 0;
    return `
      <tr>
        <td style="padding:8px;border:1px solid #bbb">${crew}</td>
        <td style="padding:8px;border:1px solid #bbb;text-align:center">${totalBlocks}</td>
        <td style="padding:8px;border:1px solid #bbb;text-align:center">${doneCount}</td>
        <td style="padding:8px;border:1px solid #bbb;text-align:center">
          <b>%${percent.toFixed(1)}</b> <span style="color:#666">(${doneCount}/${totalBlocks})</span>
        </td>
      </tr>`;
  }).join("");

  // Genel ortalama
  const percents = CREWS_ORDER.map(crew=>{
    const done = ALL_BLOCKS.reduce((acc, blockId)=>{
      const cls = latestClassFor(blockId, crew);
      return acc + (cls==="d-bitti" || cls==="d-teslim" ? 1 : 0);
    }, 0);
    return totalBlocks ? (done/totalBlocks*100) : 0;
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
      <tbody>${rowsHTML}</tbody>
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

// --- Modal (Paftadan Seç) kontrolü ---
let activePickerTarget = null;
function openPicker(targetSelectId){
  activePickerTarget = targetSelectId;
  $("#modal").classList.add("active");
}
function closePicker(){
  $("#modal").classList.remove("active");
  activePickerTarget = null;
}

// Butonlar
$("#btnPaftaYoklama").addEventListener("click", ()=>openPicker("yoklamaBlok"));
$("#btnPaftaKayit").addEventListener("click", ()=>openPicker("kayitBlok"));
$("#btnClose").addEventListener("click", closePicker);
// backdrop tıklama ile kapat
$("#modal").addEventListener("click",(e)=>{
  if(e.target.id==="modal") closePicker();
});

// İcmal butonu
$("#btnPdfIcmal").addEventListener("click", ()=>{
  $("#printTable").innerHTML = buildIcmalHTML();
  window.print();
});
// app.js — v1.6.1 (Parça 4/4)

// ---------- Arşiv Tablosu (Bölüm 2) ----------
function matchArchiveFilter(row){
  const e = $("#filtreEkip")?.value || "";
  const b = $("#filtreBlok")?.value || "";
  const ekipOK = !e || e==="Tümü" || row.crew===e;
  const blokOK = !b || b==="Tümü" || row.block===b;
  return ekipOK && blokOK;
}
function renderArchiveTable(){
  const tbody = $("#arsivBody");
  if (!tbody) return;
  const rows = FAST_ALL.filter(matchArchiveFilter);
  tbody.innerHTML = rows.length ? rows.map(x=>`
    <tr>
      <td>${formatDateFromTS(x.ts)}</td>
      <td>${x.user}</td>
      <td>${x.crew}</td>
      <td>${x.block}</td>
      <td><b>${x.status}</b></td>
      <td>${x.note?x.note:"-"}</td>
      <td>
        <button class="btn btn-secondary btn-icon" data-edit="${x.id}"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-icon" style="background:#ffe6e6;color:#c62828" data-del="${x.id}"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`).join("") : `<tr><td colspan="7" style="padding:14px;text-align:center;color:#666">Kayıt yok</td></tr>`;
}

// Filtre tetikleyiciler
$("#filtreEkip")?.addEventListener("change", renderArchiveTable);
$("#filtreBlok")?.addEventListener("change", renderArchiveTable);
$("#btnFiltreTemizle")?.addEventListener("click", ()=>{
  if ($("#filtreEkip")) $("#filtreEkip").value = "";
  if ($("#filtreBlok")) $("#filtreBlok").value = "";
  renderArchiveTable();
});

// ---------- Hızlı Kayıt canlı dinleme ----------
onSnapshot(
  query(collection(db,"fast_logs"), orderBy("ts","desc")),
  (snap)=>{
    FAST_ALL = snap.docs.map(d=>({id:d.id, ...d.data()}));
    renderArchiveTable();
    repaintAllCrews();   // Bölüm 3’te tüm paftaları güncelle
    repaintInlinePreview(); // Bölüm 2’de seçilen kalem altındaki mini paftayı güncelle (Parça 2/4’te tanımlı)
  }
);

// ---------- Yoklama (günlük) düzenle / sil ----------
document.addEventListener("click", async (e)=>{
  const delAtt = e.target.closest("[data-del-att]");
  const editAtt = e.target.closest("[data-edit-att]");
  if (delAtt){
    const id = delAtt.getAttribute("data-del-att");
    await deleteDoc(doc(collection(db,"daily_attendance", todayKey(), "entries"), id));
    return;
  }
  if (editAtt){
    // Not: basit akış — düzenlenecek satırı formda aç, eski kaydı sil; kaydettiğinde yeni kayıt oluşur
    const id = editAtt.getAttribute("data-edit-att");
    // id ile kaydı bulmak için anlık listeden aramak yerine, li içeriğinden alanları çekmek yerine
    // pratik yol: kullanıcıya yeniden giriş yaptıracağız (daha güvenli/temiz):
    alert("Kayıt düzenleme için değerleri formdan yeniden giriniz. Eski kayıt siliniyor.");
    await deleteDoc(doc(collection(db,"daily_attendance", todayKey(), "entries"), id));
  }
});

// Günlük yoklama canlı liste + butonlar (renderDaily bu parçada buton data-*’larını ekler)
function renderDaily(entries){
  const ul = $("#yoklamaListesi");
  if(!entries.length){ ul.innerHTML="<li>Bugün henüz kayıt yok.</li>"; return; }
  ul.innerHTML = entries.map(x=>`
    <li>
      <b>${x.crew}</b> — <b>${x.count}</b> kişi — <b>${x.block}</b>
      <span style="color:#777">(${formatDateFromTS(x.ts)})</span>${x.note?` — ${x.note}`:""}
      <span class="inline" style="gap:6px;margin-left:auto">
        <button class="btn btn-secondary btn-icon" data-edit-att="${x.id}"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-icon" style="background:#ffe6e6;color:#c62828" data-del-att="${x.id}"><i class="fa-solid fa-trash"></i></button>
      </span>
    </li>`).join("");
}
onSnapshot(
  query(collection(db,"daily_attendance", todayKey(), "entries"), orderBy("ts","desc")),
  (snap)=>{ renderDaily(snap.docs.map(d=>({id:d.id, ...d.data()}))); }
);

// ---------- Modal içinde blok seçimi ----------
["#m-top","#m-mid","#m-bot"].forEach(sel=>{
  $(sel)?.addEventListener("click",(ev)=>{
    const box = ev.target.closest(".blok");
    if(!box || !activePickerTarget) return;
    const id = box.dataset.id;
    if(id==="Sosyal") return;
    const target = $("#"+activePickerTarget);
    if (target) target.value = id;
    closePicker();
  });
});

// ---------- Drag-scroll (tüm cihazlar) ----------
function enableDragScroll(container){
  if(!container) return;

  // Pointer (fare/kalem)
  let pDown=false, pStartX=0, pStartLeft=0;
  container.addEventListener('pointerdown', e=>{
    pDown=true; pStartX=e.clientX; pStartLeft=container.scrollLeft;
    container.setPointerCapture(e.pointerId);
    container.style.cursor = "grabbing";
  });
  container.addEventListener('pointermove', e=>{
    if(!pDown) return;
    container.scrollLeft = pStartLeft - (e.clientX - pStartX);
  });
  ['pointerup','pointercancel','pointerleave'].forEach(evt=>{
    container.addEventListener(evt, ()=>{
      pDown=false; container.style.cursor = "grab";
    });
  });

  // Touch (MIUI / OneUI uyumlu – yatay hareketi tercih et)
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

  // Trackpad / wheel
  container.addEventListener('wheel', e=>{
    if(Math.abs(e.deltaX) > Math.abs(e.deltaY)){
      container.scrollLeft += e.deltaX;
      e.preventDefault();
    }
  }, {passive:false});
}

// Ana pano paftası
enableDragScroll($("#projePaftasi .pafta"));
// Modal pafta(lar)
$$(".modal .pafta").forEach(enableDragScroll);

// ---------- INIT ----------
(function init(){
  // Çoklu pafta hostu oluştur (Parça 2/4’te createCrewPaftaCards tanımlı)
  createCrewPaftaCards();
  repaintAllCrews();           // ilk boyama
  repaintInlinePreview();      // Bölüm 2 inline mini pafta (seçili kaleme göre)
})();
