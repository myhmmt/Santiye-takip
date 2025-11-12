// Vista Premium – Şantiye Takip v1.4.1
// Notlar:
// - Eski mekanikler korunur.
// - Açılır listeler alfabetik (tr-TR).
// - Yeni imalat kalemleri eklendi.
// - “Başladı” ve “Devam Ediyor” aynı (sarı), “Bitti” yeşil, “Teslim” koyu yeşil + tik, “Başlanmadı” renksiz.
// - Bölüm 2’de seçilen kalemin altında pafta önizleme (scroll çalışır).
// - Bölüm 3’te her imalat kalemi için ayrı pafta (verdiğin sırada).
// - İcmal PDF yalnızca tablo üretir (paftasız).

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getFirestore, collection, addDoc, serverTimestamp,
  query, orderBy, onSnapshot, doc, deleteDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

/* -------------------- FIREBASE -------------------- */
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

/* -------------------- SABİTLER -------------------- */
// Pano sırası (kesin sıra)
const CREW_ORDER = [
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
  "Çelik Kapı"
];

// Form açılırları (alfabetik)
const CREWS_FOR_FORMS = Array.from(new Set([
  ...CREW_ORDER
])).sort((a,b)=>a.localeCompare(b,"tr"));

const USERS = ["Muhammet","Harun","Metin","Mert","Fuat","Furkan","Misafir"]
  .sort((a,b)=>a.localeCompare(b,"tr"));

// Blok dizilimi (3 satır)
const TOP = ["AC","AD","AE","AF","AG","AH","AI","AJ","AK","AL","AM","AN"];
const MID = ["AB","Y","V","S","R","P","O","N","M","L","K","J","I"];
const BOT = ["AA","Z","U","T","Sosyal","A","B","C","D","E","F","G","H"];

const ALL_BLOCKS = [...TOP, ...MID.filter(x=>"Sosyal"!==x), ...BOT.filter(x=>"Sosyal"!==x)];

// Sahibiyet rozetleri (AS / P / MÜT)
const AS_SET = new Set(["AC","AD","AH","AL","AJ","Y","P","O","N","J","I","Z","A","B","C","H"]);
const PATRON_SET = new Set(["R"]); // Harun Bey
const OWN = {};
[...TOP, ...MID, ...BOT].forEach(b=>{
  if(b==="Sosyal"){ OWN[b] = ""; return; }
  if (PATRON_SET.has(b)) OWN[b] = "P";
  else if (AS_SET.has(b)) OWN[b] = "AS";
  else OWN[b] = "MÜT";
});

/* -------------------- HELPER -------------------- */
const el  = s => document.querySelector(s);
const els = s => document.querySelectorAll(s);

function fillSelect(id, list, placeholder="— Seçiniz —"){
  const s = el("#"+id);
  s.innerHTML = `<option value="">${placeholder}</option>` +
    list.map(v=>`<option value="${v}">${v}</option>`).join("");
}

function makeBlok(label){
  const div = document.createElement("div");
  div.className = "blok"+(label==="Sosyal"?" sosyal":"");
  div.dataset.id = label;
  const badge = label!=="Sosyal" ? `<span class="own">${OWN[label]||""}</span>` : "";
  div.innerHTML = `<span>${label==="Sosyal"?"SOSYAL":label}</span>${badge}`;
  return div;
}
function drawRow(rowEl, arr){
  rowEl.innerHTML = "";
  arr.forEach(b=> rowEl.appendChild(makeBlok(b)));
}
function drawRowsByIds(topId, midId, botId){
  const rTop = el(topId), rMid = el(midId), rBot = el(botId);
  if(rTop) drawRow(rTop, TOP);
  if(rMid) drawRow(rMid, MID);
  if(rBot) drawRow(rBot, BOT);
}
function formatDateFromTS(ts){
  if (!ts) return "-";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("tr-TR",{day:"2-digit",month:"2-digit",year:"numeric"})+" "+
         d.toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"});
}
function todayKey(){
  const d = new Date();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const dy= String(d.getDate()).padStart(2,"0");
  return `${d.getFullYear()}-${m}-${dy}`;
}

/* -------------------- NAV -------------------- */
els(".nav-btn").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    els(".nav-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    const id = btn.dataset.page;
    els(".page").forEach(p=>p.classList.remove("active"));
    el("#"+id).classList.add("active");
  });
});

/* -------------------- SELECTLER (alfabetik) -------------------- */
fillSelect("yoklamaEkip", CREWS_FOR_FORMS);
fillSelect("kayitEkip", CREWS_FOR_FORMS);
fillSelect("kayitKullanici", USERS, "— Kullanıcı —");
fillSelect("yoklamaBlok", ALL_BLOCKS);
fillSelect("kayitBlok", ALL_BLOCKS);
fillSelect("filtreEkip", ["(Tümü)", ...CREWS_FOR_FORMS], "Ekip (Tümü)");
fillSelect("filtreBlok", ["(Tümü)", ...ALL_BLOCKS], "Blok (Tümü)");

/* -------------------- PAFTA ÇİZİMLERİ -------------------- */
// Modal paftası
drawRowsByIds("#m-top", "#m-mid", "#m-bot");
// Bölüm 2 önizleme paftası (başlangıçta boş renk, sadece grid)
drawRowsByIds("#prev-top", "#prev-mid", "#prev-bot");

/* -------------------- BÖLÜM 1: GÜNLÜK YOKLAMA -------------------- */
let ATT_TODAY = [];
let EDIT_ATT_ID = null;
const yoklamaMsg = el("#yoklamaMsg");

function setEditMode(on, data=null){
  const btnSave = el("#btnYoklamaKaydet");
  const btnCancel= el("#btnYoklamaIptal");
  if(on){
    btnSave.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Güncelle`;
    btnCancel.style.display = "inline-flex";
    if(yoklamaMsg){ yoklamaMsg.style.display="block"; yoklamaMsg.textContent = "Düzenleme modundasın. Kaydet ile güncellersin."; }
    if(data){
      el("#yoklamaEkip").value = data.crew || "";
      el("#yoklamaKisi").value = data.count || "";
      el("#yoklamaBlok").value = data.block || "";
      el("#yoklamaNot").value  = data.note || "";
    }
  }else{
    btnSave.innerHTML = `<i class="fa-solid fa-user-check"></i> Giriş Yap`;
    btnCancel.style.display = "none";
    if(yoklamaMsg) yoklamaMsg.style.display="none";
    el("#formYoklama").reset();
  }
}
el("#btnYoklamaIptal").addEventListener("click", ()=>{ EDIT_ATT_ID=null; setEditMode(false); });

el("#formYoklama").addEventListener("submit", async (e)=>{
  e.preventDefault();
  const crew  = el("#yoklamaEkip").value;
  const count = parseInt(el("#yoklamaKisi").value||"0",10);
  const block = el("#yoklamaBlok").value;
  const note  = el("#yoklamaNot").value.trim();
  if(!crew||!count||!block){ alert("Ekip, kişi sayısı ve blok zorunludur."); return; }

  if(EDIT_ATT_ID){
    await updateDoc(doc(db,"daily_attendance",todayKey(),"entries",EDIT_ATT_ID),
      { crew, count, block, note, ts: serverTimestamp() });
    EDIT_ATT_ID = null;
    setEditMode(false);
  }else{
    await addDoc(collection(db,"daily_attendance",todayKey(),"entries"),{
      crew, count, block, note, user:"Sistem", ts: serverTimestamp()
    });
    el("#yoklamaKisi").value=""; el("#yoklamaNot").value="";
  }
});

function renderDaily(entries){
  const ul = el("#yoklamaListesi");
  ul.innerHTML = entries.length ? entries.map(x=>`
    <li class="yoklama-item">
      <span class="yoklama-text">
        <b>${x.crew}</b> — <b>${x.count}</b> kişi — <b>${x.block}</b>
        <span style="color:#777">(${formatDateFromTS(x.ts)})</span>${x.note?` — ${x.note}`:""}
      </span>
      <span class="yoklama-actions">
        <button class="icon-btn edit" title="Düzenle" data-att-edit="${x.id}">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="icon-btn del" title="Sil" data-att-del="${x.id}">
          <i class="fa-solid fa-trash"></i>
        </button>
      </span>
    </li>
  `).join("") : "<li>Bugün henüz kayıt yok.</li>";
}
onSnapshot(
  query(collection(db,"daily_attendance",todayKey(),"entries"),orderBy("ts","desc")),
  (snap)=>{
    ATT_TODAY = snap.docs.map(d=>({id:d.id, ...d.data()}));
    renderDaily(ATT_TODAY);
  }
);
document.addEventListener("click", async (e)=>{
  const editBtn = e.target.closest("[data-att-edit]");
  const delBtn  = e.target.closest("[data-att-del]");
  if(editBtn){
    const id = editBtn.getAttribute("data-att-edit");
    const data = ATT_TODAY.find(x=>x.id===id);
    if(!data) return;
    EDIT_ATT_ID = id;
    setEditMode(true, data);
  }
  if(delBtn){
    const id = delBtn.getAttribute("data-att-del");
    if(confirm("Kaydı silmek istiyor musun?")){
      await deleteDoc(doc(db,"daily_attendance", todayKey(), "entries", id));
      if(EDIT_ATT_ID === id){ EDIT_ATT_ID = null; setEditMode(false); }
    }
  }
});

/* -------------------- BÖLÜM 2: HIZLI KAYIT + ÖNİZLEME -------------------- */
el("#formHizliKayit").addEventListener("submit", async (e)=>{
  e.preventDefault();
  const rec = {
    user:  el("#kayitKullanici").value,
    crew:  el("#kayitEkip").value,
    block: el("#kayitBlok").value,
    status:el("#kayitDurum").value, // "Baslanmadi" da gelebilir -> renksiz
    note:  el("#kayitNot").value.trim(),
    ts:    serverTimestamp()
  };
  if(!rec.user||!rec.crew||!rec.block){ alert("Kullanıcı, ekip ve blok zorunludur."); return; }
  await addDoc(collection(db,"fast_logs"), rec);
  el("#kayitNot").value = "";
});

let FAST_ALL = [];

function statusClass(st){
  // Başladı = Devam rengi; Başlanmadı/boş = renksiz
  if(st==="Devam"||st==="Devam Ediyor"||st==="Basladi"||st==="Başladı") return "d-devam";
  if(st==="Bitti") return "d-bitti";
  if(st==="Teslim"||st==="Teslim Alındı"||st==="TeslimAlindi") return "d-teslim";
  return "";
}
function latestCls(block, crew){
  const data = FAST_ALL.filter(x=>x.block===block && (!crew || x.crew===crew));
  if(!data.length) return "";
  data.sort((a,b)=> (b.ts?.toMillis?.()??0) - (a.ts?.toMillis?.()??0));
  return statusClass(data[0].status);
}
function paintRowIn(root, rowSelector, arr, crew){
  const row = root.querySelector(rowSelector);
  if(!row) return;
  row.querySelectorAll(".blok").forEach(b=>b.classList.remove("d-devam","d-bitti","d-teslim"));
  arr.forEach(id=>{
    const box = row.querySelector(`.blok[data-id="${id}"]`);
    const cls = latestCls(id, crew);
    if(cls && box) box.classList.add(cls);
  });
}
function renderPreviewPafta(crew){
  const wrap = el("#previewPafta");
  if(!wrap) return;
  // grid zaten çizildi; sadece boyama güncellensin
  paintRowIn(wrap, "#prev-top", TOP, crew);
  paintRowIn(wrap, "#prev-mid", MID, crew);
  paintRowIn(wrap, "#prev-bot", BOT, crew);
}
el("#kayitEkip").addEventListener("change", (e)=> renderPreviewPafta(e.target.value));

function renderArchiveTable(){
  const eFilter = el("#filtreEkip").value;
  const bFilter = el("#filtreBlok").value;
  const filtered = FAST_ALL.filter(x=>{
    const ek = (eFilter==="" || eFilter==="(Tümü)" || x.crew===eFilter);
    const bl = (bFilter==="" || bFilter==="(Tümü)" || x.block===bFilter);
    return ek && bl;
  });
  const tbody = el("#arsivBody");
  tbody.innerHTML = filtered.length ? filtered.map(x=>`
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
    </tr>
  `).join("") : `<tr><td colspan="7" style="padding:14px;text-align:center;color:#666">Kayıt yok</td></tr>`;
}
onSnapshot(query(collection(db,"fast_logs"),orderBy("ts","desc")),(snap)=>{
  FAST_ALL = snap.docs.map(d=>({id:d.id, ...d.data()}));
  renderArchiveTable();
  renderAllPanos();           // Bölüm 3 çoklu paftaları da canlı güncelle
  renderPreviewPafta(el("#kayitEkip").value || ""); // seçili kalem değişmemişse de güncelle
});

document.addEventListener("click", async (e)=>{
  const del  = e.target.closest("[data-del]");
  const edit = e.target.closest("[data-edit]");
  if(del){
    const id = del.getAttribute("data-del");
    await deleteDoc(doc(db,"fast_logs", id));
  }
  if(edit){
    const id = edit.getAttribute("data-edit");
    const x  = FAST_ALL.find(r=>r.id===id);
    if(!x) return;
    el("#kayitKullanici").value = x.user||"";
    el("#kayitEkip").value      = x.crew||"";
    el("#kayitBlok").value      = x.block||"";
    el("#kayitDurum").value     = x.status||"Basladi";
    el("#kayitNot").value       = x.note||"";
    await deleteDoc(doc(db,"fast_logs", id));
    alert("Kayıt düzenleme modunda forma alındı. Kaydet ile güncelle.");
    renderPreviewPafta(x.crew||"");
  }
});

el("#filtreEkip").addEventListener("change", renderArchiveTable);
el("#filtreBlok").addEventListener("change", renderArchiveTable);
el("#btnFiltreTemizle").addEventListener("click", ()=>{
  el("#filtreEkip").selectedIndex = 0;
  el("#filtreBlok").selectedIndex = 0;
  renderArchiveTable();
});

/* -------------------- BÖLÜM 2: PAFTADAN SEÇ MODAL -------------------- */
let activeTarget = null;
function openPicker(targetId){ activeTarget = targetId; el("#modal").classList.add("active"); }
function closePicker(){ el("#modal").classList.remove("active"); activeTarget=null; }
el("#btnPaftaYoklama").addEventListener("click",()=>openPicker("yoklamaBlok"));
el("#btnPaftaKayit").addEventListener("click",()=>openPicker("kayitBlok"));
el("#btnClose").addEventListener("click",closePicker);
el("#modal").addEventListener("click",(e)=>{ if(e.target.id==="modal") closePicker(); });
["#m-top","#m-mid","#m-bot"].forEach(sel=>{
  const row = el(sel);
  if(!row) return;
  row.addEventListener("click",(ev)=>{
    const box = ev.target.closest(".blok"); if(!box||!activeTarget) return;
    const id  = box.dataset.id; if(id==="Sosyal") return;
    el("#"+activeTarget).value = id;
    closePicker();
  });
});

/* -------------------- BÖLÜM 3: ÇOKLU PANO -------------------- */
function buildPaftaHTML(){
  return `
    <div class="pafta">
      <div class="pafta-row">${TOP.map(b=>makeBlok(b).outerHTML).join("")}</div>
      <div class="pafta-row">${MID.map(b=>makeBlok(b).outerHTML).join("")}</div>
      <div class="pafta-row">${BOT.map(b=>makeBlok(b).outerHTML).join("")}</div>
    </div>
  `;
}
function renderPaftaGroup(crew){
  const grp = document.createElement("div");
  grp.className = "pano-group";
  grp.innerHTML = `<h3>${crew}</h3>${buildPaftaHTML()}`;
  // Boyama
  const rows = grp.querySelectorAll(".pafta-row");
  rows[0].querySelectorAll(".blok").forEach(()=>{});
  // Paint
  const paint = (rowEl, arr)=> {
    rowEl.querySelectorAll(".blok").forEach(b=>b.classList.remove("d-devam","d-bitti","d-teslim"));
    arr.forEach(id=>{
      const box = rowEl.querySelector(`.blok[data-id="${id}"]`);
      const cls = latestCls(id, crew);
      if(cls && box) box.classList.add(cls);
    });
  };
  paint(rows[0], TOP);
  paint(rows[1], MID);
  paint(rows[2], BOT);
  return grp;
}
function renderAllPanos(){
  const root = el("#panoMulti");
  if(!root) return;
  root.innerHTML = "";
  CREW_ORDER.forEach(c=>{
    root.appendChild(renderPaftaGroup(c));
  });
}

/* -------------------- İCMAL (PDF/PRINT) -------------------- */
// Yalnızca tablo; yüzdeler (bitti + teslim) / toplam blok
function buildIcmalHTML(){
  const totalBlocks = ALL_BLOCKS.length;
  const rows = CREW_ORDER.map(crew=>{
    const done = ALL_BLOCKS.filter(b=>{
      const cls = latestCls(b, crew);
      return cls==="d-bitti" || cls==="d-teslim";
    }).length;
    const pct = totalBlocks ? (done/totalBlocks*100) : 0;
    return `<tr>
      <td style="padding:8px;border:1px solid #bbb">${crew}</td>
      <td style="padding:8px;border:1px solid #bbb;text-align:center">${totalBlocks}</td>
      <td style="padding:8px;border:1px solid #bbb;text-align:center">${done}</td>
      <td style="padding:8px;border:1px solid #bbb;text-align:center"><b>%${pct.toFixed(1)}</b> <span style="color:#666">(${done}/${totalBlocks})</span></td>
    </tr>`;
  }).join("");

  const avg = (CREW_ORDER.reduce((acc, crew)=>{
    const done = ALL_BLOCKS.filter(b=>{
      const cls = latestCls(b, crew);
      return cls==="d-bitti" || cls==="d-teslim";
    }).length;
    return acc + (totalBlocks ? (done/totalBlocks*100) : 0);
  },0) / (CREW_ORDER.length||1)).toFixed(1);

  return `
    <div style="font-family:Roboto,Arial,sans-serif">
      <h2 style="margin:0 0 10px">Şantiye İlerleme İcmali — Vista Premium</h2>
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
            <td style="padding:10px;border:1px solid #bbb;text-align:center" colspan="3"><b>%${avg}</b></td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
}

function exportIcmalPDF(){
  const container = document.createElement("div");
  container.innerHTML = buildIcmalHTML();

  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  const fileName = `icmal_${yyyy}-${mm}-${dd}.pdf`;

  const opt = {
    margin:       10,
    filename:     fileName,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true, allowTaint: true },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  // @ts-ignore (CDN global)
  html2pdf().from(container).set(opt).save();
}
el("#btnPdfIcmal")?.addEventListener("click", exportIcmalPDF);

/* -------------------- BAŞLANGIÇ -------------------- */
(function init(){
  // Bölüm 2 önizleme başlangıç boyaması (ekip seçiliyse)
  renderPreviewPafta(el("#kayitEkip").value || "");
  // Bölüm 3 panoları ilk çizim (FAST_ALL geldikçe yeniden boyanıyor)
  renderAllPanos();
})();
