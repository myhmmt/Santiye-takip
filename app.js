// app.js  — Vista Premium v1.6.1

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getFirestore, collection, addDoc, serverTimestamp,
  query, orderBy, onSnapshot, doc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

/* =========================
   Firebase config (senin proje)
   ========================= */
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

/* =========================
   Sabitler / Listeler
   ========================= */
const CREWS_RAW = [
  "Mekanik","Elektrik","Çatı (Kereste)","Çatı (Kiremit)","Çatı (Oluk)","Denizlik",
  "Parke","Seramik","Boya","TG5","PVC","Kör Kasa","Şap","Dış Cephe","Makina Alçı",
  "Saten Alçı","Kaba Sıva (İç)","Yerden Isıtma","Asma Tavan","Klima Tesisat",
  "Mobilya","Çelik Kapı","Korkuluk",
  // eklenenler
  "Dış Cephe Bordex","Dış Cephe Sıva","Dış Cephe Çizgi Sıva","Dış Cephe Kenet","İç Boya"
];
// Form açılırlarında alfabetik
const CREWS = [...new Set(CREWS_RAW)].sort((a,b)=>a.localeCompare(b,"tr"));

const USERS = ["Muhammet","Harun","Metin","Mert","Fuat","Furkan","Misafir"];

const TOP = ["AC","AD","AE","AF","AG","AH","AI","AJ","AK","AL","AM","AN"];
const MID = ["AB","Y","V","S","R","P","O","N","M","L","K","J","I"];
const BOT = ["AA","Z","U","T","Sosyal","A","B","C","D","E","F","G","H"];
const ALL_BLOCKS = [...TOP, ...MID, ...BOT].filter(b => b !== "Sosyal");

/* AS/MÜT kısa rozet haritası — onaylı set */
const OWN = {};
const AS_SET = new Set(["AC","AE","AG","AI","AK","AM","AB","V","R","O","M","K","I","AA","U","A","C","E","G"]);
[...TOP,...MID,...BOT].forEach(b=>{
  OWN[b] = (b==="Sosyal") ? "" : (AS_SET.has(b) ? "AS" : "MÜT");
});

/* =========================
   Yardımcılar
   ========================= */
const el  = s => document.querySelector(s);
const els = s => document.querySelectorAll(s);

function fillSelect(id, list, placeholder="— Seçiniz —") {
  const s = el('#'+id);
  if(!s) return;
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

/* =========================
   Nav
   ========================= */
els(".nav-btn").forEach(btn=>{
  btn.addEventListener("click",()=>{
    els(".nav-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    const id = btn.dataset.page;
    els(".page").forEach(p=>p.classList.remove("active"));
    el("#"+id).classList.add("active");
  });
});

/* =========================
   Select doldurma
   ========================= */
fillSelect("yoklamaEkip", CREWS);
fillSelect("kayitEkip",   CREWS);
fillSelect("kayitKullanici", USERS);

fillSelect("yoklamaBlok", ALL_BLOCKS);
fillSelect("kayitBlok",   ALL_BLOCKS);

// arşiv filtre (Bölüm 2)
fillSelect("filtreEkip", ["Tümü", ...CREWS], "Ekip (Tümü)");
fillSelect("filtreBlok", ["Tümü", ...ALL_BLOCKS], "Blok (Tümü)");

/* =========================
   Pafta çizimi (ana ve modal)
   ========================= */
function makeBlok(label){
  const div = document.createElement("div");
  div.className = "blok"+(label==="Sosyal"?" sosyal":"");
  div.dataset.id = label;
  const owner = OWN[label] || "";
  // AS/MÜT kısa rozet, yazıyı kapatmasın
  div.innerHTML = `
    <span>${label==="Sosyal"?"SOSYAL":label}</span>
    ${label!=="Sosyal" ? `<span class="own">${owner}</span>` : ""}
  `;
  return div;
}
function drawPafta(rowSel, arr){
  const row = el(rowSel);
  if(!row) return;
  row.innerHTML="";
  arr.forEach(b=>row.appendChild(makeBlok(b)));
}
// ana pafta
drawPafta("#row-top", TOP);
drawPafta("#row-mid", MID);
drawPafta("#row-bot", BOT);
// modal pafta
drawPafta("#m-top", TOP);
drawPafta("#m-mid", MID);
drawPafta("#m-bot", BOT);

/* =========================
   Yoklama — yaz / oku / düzenle-sil
   ========================= */
el("#formYoklama")?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const crew = el("#yoklamaEkip").value;
  const count = parseInt(el("#yoklamaKisi").value||"0",10);
  const block = el("#yoklamaBlok").value;
  const note  = el("#yoklamaNot").value.trim();
  if(!crew||!count||!block){alert("Ekip, kişi sayısı ve blok zorunludur.");return;}
  await addDoc(collection(db,"daily_attendance", todayKey(), "entries"), {
    crew, count, block, note, user:"Sistem", ts: serverTimestamp()
  });
  el("#yoklamaKisi").value="";
  el("#yoklamaNot").value="";
});

function renderDaily(entries){
  const ul = el("#yoklamaListesi");
  if(!ul) return;
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

/* =========================
   Hızlı Kayıt — yaz / oku / tablo / boyama
   ========================= */
el("#formHizliKayit")?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const rec = {
    user:  el("#kayitKullanici").value,
    crew:  el("#kayitEkip").value,
    block: el("#kayitBlok").value,
    status:el("#kayitDurum").value, // "Basladi" da olabilir
    note:  el("#kayitNot").value.trim(),
    ts:    serverTimestamp()
  };
  if(!rec.user||!rec.crew||!rec.block){alert("Kullanıcı, ekip ve blok zorunludur.");return;}
  await addDoc(collection(db,"fast_logs"), rec);
  el("#kayitNot").value="";
});

let FAST_ALL = [];
function latestClass(status){
  // Başladı = Devam rengi
  if(status==="Basladi" || status==="Devam" || status==="Devam Ediyor") return "d-devam";
  if(status==="Bitti") return "d-bitti";
  if(status==="Teslim" || status==="Teslim Alındı" || status==="TeslimAlindi") return "d-teslim";
  return ""; // Başlanmadı
}
function getLatestStatusFor(block, crew){ // crew boşsa blok için en son durum
  const rows = FAST_ALL.filter(x=>x.block===block && (!crew || x.crew===crew));
  if(!rows.length) return "";
  rows.sort((a,b)=>{
    const ta = a.ts?.toMillis?.() ?? 0;
    const tb = b.ts?.toMillis?.() ?? 0;
    return tb - ta;
  });
  return latestClass(rows[0].status);
}
function clearStatus(box){
  box.classList.remove("d-devam","d-bitti","d-teslim","durum-devam","durum-bitti","durum-teslim");
}
function paintRow(rowSel, arr, crew){
  const row = el(rowSel);
  if(!row) return;
  row.querySelectorAll(".blok").forEach(clearStatus);
  arr.forEach(id=>{
    const box = row.querySelector(`.blok[data-id="${id}"]`);
    const cls = getLatestStatusFor(id, crew);
    if(box && cls) box.classList.add(cls);
  });
}
function renderPafta(){ // tek pafta (filtreli)
  const crew = el("#panoEkipFiltre")?.value || "";
  paintRow("#row-top", TOP, crew);
  paintRow("#row-mid", MID, crew);
  paintRow("#row-bot", BOT, crew);
}
function matchFilter(x){
  const e = el("#filtreEkip")?.value;
  const b = el("#filtreBlok")?.value;
  const ekipOk = !e || e==="Tümü" || x.crew===e;
  const blokOk = !b || b==="Tümü" || x.block===b;
  return ekipOk && blokOk;
}
function renderTable(){
  const tbody = el("#arsivBody");
  if(!tbody) return;
  const rows = FAST_ALL.filter(matchFilter);
  tbody.innerHTML = rows.length ? rows.map((x)=>`
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
onSnapshot(
  query(collection(db,"fast_logs"), orderBy("ts","desc")),
  (snap)=>{
    FAST_ALL = snap.docs.map(d=>({id:d.id, ...d.data()}));
    renderTable();
    renderPafta();
  }
);

/* Düzenle / Sil (fast_logs + daily_attendance) */
document.addEventListener("click", async (e)=>{
  // fast_logs
  const del = e.target.closest("[data-del]");
  const edit = e.target.closest("[data-edit]");
  if(del){
    const id = del.getAttribute("data-del");
    await deleteDoc(doc(db,"fast_logs", id));
  }
  if(edit){
    const id = edit.getAttribute("data-edit");
    const x = FAST_ALL.find(r=>r.id===id);
    if(!x) return;
    el("#kayitKullanici").value = x.user||"";
    el("#kayitEkip").value     = x.crew||"";
    el("#kayitBlok").value     = x.block||"";
    el("#kayitDurum").value    = x.status||"Basladi";
    el("#kayitNot").value      = x.note||"";
    await deleteDoc(doc(db,"fast_logs", id));
    alert("Kayıt düzenleme modunda forma alındı. Kaydet ile güncel halini ekle.");
  }

  // daily_attendance (bugünkü)
  const delAtt  = e.target.closest("[data-del-att]");
  if(delAtt){
    const id = delAtt.getAttribute("data-del-att");
    await deleteDoc(doc(collection(db,"daily_attendance", todayKey(), "entries"), id));
  }
});

/* =========================
   Pafta modal aç/kapat + seçim
   ========================= */
let activeTarget = null;
function openPicker(targetId){
  activeTarget = targetId;
  el("#modal").classList.add("active");
}
function closePicker(){
  el("#modal").classList.remove("active");
  activeTarget = null;
}
el("#btnPaftaYoklama")?.addEventListener("click",()=>openPicker("yoklamaBlok"));
el("#btnPaftaKayit")  ?.addEventListener("click",()=>openPicker("kayitBlok"));
el("#btnClose")       ?.addEventListener("click",closePicker);
el("#modal")          ?.addEventListener("click",(e)=>{ if(e.target.id==="modal") closePicker(); });

// modal blok tıklama
["#m-top","#m-mid","#m-bot"].forEach(sel=>{
  const container = el(sel);
  container?.addEventListener("click",(ev)=>{
    const box = ev.target.closest(".blok");
    if(!box || !activeTarget) return;
    const id = box.dataset.id;
    if(id==="Sosyal") return;
    el("#"+activeTarget).value = id;
    closePicker();
  });
});

/* =========================
   Filtre değişimleri
   ========================= */
el("#panoEkipFiltre")?.addEventListener("change", renderPafta);
el("#filtreEkip")?.addEventListener("change", renderTable);
el("#filtreBlok")?.addEventListener("change", renderTable);
el("#btnFiltreTemizle")?.addEventListener("click", ()=>{
  if(el("#filtreEkip")) el("#filtreEkip").value="";
  if(el("#filtreBlok")) el("#filtreBlok").value="";
  renderTable();
});

/* =========================
   İcmal (print) — sadece pafta durumu
   ========================= */
function buildIcmalHTML(){
  const totalBlocks = ALL_BLOCKS.length;

  // tek tablo: her ekip için yapılan blok sayısı + yüzde
  const rows = CREWS.map(t=>{
    const latestPerBlock = ALL_BLOCKS.map(b=>getLatestStatusFor(b, t));
    const done = latestPerBlock.filter(cls=>cls==="d-bitti"||cls==="d-teslim").length;
    const percent = totalBlocks ? (done/totalBlocks*100) : 0;
    return `<tr>
      <td style="padding:8px;border:1px solid #bbb">${t}</td>
      <td style="padding:8px;border:1px solid #bbb;text-align:center">${totalBlocks}</td>
      <td style="padding:8px;border:1px solid #bbb;text-align:center">${done}</td>
      <td style="padding:8px;border:1px solid #bbb;text-align:center"><b>%${percent.toFixed(1)}</b> <span style="color:#666">(${done}/${totalBlocks})</span></td>
    </tr>`;
  }).join("");

  const percents = CREWS.map(t=>{
    const latestPerBlock = ALL_BLOCKS.map(b=>getLatestStatusFor(b, t));
    const done = latestPerBlock.filter(cls=>cls==="d-bitti"||cls==="d-teslim").length;
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
  const area = el("#printTable");
  if(!area) return;
  area.innerHTML = buildIcmalHTML();
  window.print();
});

/* =========================
   Drag-scroll — sadece pafta konteynerlerinde
   ========================= */
function enableDragScroll(container){
  if(!container) return;

  // Pointer (mouse/pen)
  let pDown=false, pStartX=0, pStartLeft=0;
  container.addEventListener('pointerdown', e=>{
    pDown=true; pStartX=e.clientX; pStartLeft=container.scrollLeft;
    container.style.cursor='grabbing';
    container.setPointerCapture(e.pointerId);
  });
  container.addEventListener('pointermove', e=>{
    if(!pDown) return;
    container.scrollLeft = pStartLeft - (e.clientX - pStartX);
  });
  ['pointerup','pointercancel','pointerleave'].forEach(evt=>{
    container.addEventListener(evt, ()=>{ pDown=false; container.style.cursor='grab'; });
  });

  // Touch — yatay kaydırma öncelikli
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

// Ana pafta sadece kendi içinde kayar
enableDragScroll(document.querySelector('#projePaftasi .pafta'));
// Modal pafta da kendi içinde kayar
document.querySelectorAll('#modal .pafta').forEach(enableDragScroll);

/* =========================
   Başlangıç
   ========================= */
(function init(){
  // İlk boyama, veriler geldikçe güncellenir
  renderPafta();
})();
