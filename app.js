// v1.4.1-fix — Vista Premium – Şantiye Takip
// - İcmal PDF: ensureHtml2Pdf() ile garanti yükleme
// - Ekip/Blok açılırları alfabetik (tr)
// - Yeni imalat kalemleri eklendi
// - Bölüm 2: Seçili kalemin pafta önizlemesi boyanır
// - Bölüm 3: Her kalem için ayrı pafta (verdiğin sırayla)
// - AS / P(atron) / MÜT rozetleri güncel dağılıma göre

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getFirestore, collection, addDoc, serverTimestamp,
  query, orderBy, onSnapshot, doc, deleteDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

/* Firebase */
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

/* --- Listeler --- */
const CREWS_BASE = [
  "Mekanik","Elektrik","Çatı (Kereste)","Çatı (Kiremit)","Denizlik","Parke","Seramik","Boya","TG5","PVC",
  "Kör Kasa","Şap","Dış Cephe","Makina Alçı","Saten Alçı","Kaba Sıva (İç)","Yerden Isıtma","Asma Tavan",
  "Klima Tesisat","Mobilya","Çelik Kapı","Korkuluk"
];
const CREWS_EXTRA = [
  "Çatı (Oluk)",
  "Dış Cephe Bordex",
  "Dış Cephe Sıva",
  "Dış Cephe Çizgi Sıva",
  "Dış Cephe Kenet",
  "İç Boya"
];
const CREWS = Array.from(new Set([...CREWS_BASE, ...CREWS_EXTRA]))
  .sort((a,b)=>a.localeCompare(b,"tr"));

const USERS = ["Muhammet","Harun","Metin","Mert","Fuat","Furkan","Misafir"];

/* Pafta blokları */
const TOP = ["AC","AD","AE","AF","AG","AH","AI","AJ","AK","AL","AM","AN"];
const MID = ["AB","Y","V","S","R","P","O","N","M","L","K","J","I"];
const BOT = ["AA","Z","U","T","Sosyal","A","B","C","D","E","F","G","H"];
const ALL_BLOCKS = [...TOP, ...MID.filter(x=>"Sosyal"!==x), ...BOT.filter(x=>"Sosyal"!==x)];

/* AS / Patron / MÜT dağılımı (verdiğin liste) */
const AS_SET = new Set([
  // Üst sıra
  "AC","AD","AH","AL","AJ",
  // Orta sıra
  "Y","P","O","N","J","I",
  // Alt sıra
  "Z","A","B","C","H"
]);
const PATRON_SET = new Set(["R"]); // Harun Bey
// Diğer bloklar MÜT kabul edilir
const OWN = {};
[...TOP, ...MID, ...BOT].forEach(b=>{
  if (b==="Sosyal") { OWN[b]=""; return; }
  if (AS_SET.has(b)) OWN[b] = "AS";
  else if (PATRON_SET.has(b)) OWN[b] = "P";
  else OWN[b] = "MÜT";
});

/* Bölüm 3 için sabit pafta sırası */
const TEAMS_ORDER = [
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

/* Helpers */
const el  = s=>document.querySelector(s);
const els = s=>document.querySelectorAll(s);
function fillSelect(id, list, placeholder="— Seçiniz —", sort=true){
  const s = el('#'+id); if(!s) return;
  const arr = sort ? [...list].sort((a,b)=>a.localeCompare(b,"tr")) : list;
  s.innerHTML = `<option value="">${placeholder}</option>` + arr.map(v=>`<option value="${v}">${v}</option>`).join("");
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

/* Nav */
els(".nav-btn").forEach(btn=>{
  btn.addEventListener("click",()=>{
    els(".nav-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    const id = btn.dataset.page;
    els(".page").forEach(p=>p.classList.remove("active"));
    el("#"+id)?.classList.add("active");
  });
});

/* Select doldurma (alfabetik) */
fillSelect("yoklamaEkip", CREWS);
fillSelect("kayitEkip", CREWS);
fillSelect("kayitKullanici", USERS, "— Kullanıcı —", true);
fillSelect("yoklamaBlok", ALL_BLOCKS);
fillSelect("kayitBlok", ALL_BLOCKS);
fillSelect("filtreEkip", ["(Tümü)", ...CREWS], "Ekip (Tümü)");
fillSelect("filtreBlok", ["(Tümü)", ...ALL_BLOCKS], "Blok (Tümü)");

/* Pafta kutusu oluşturucu */
function makeBlok(label){
  const div = document.createElement("div");
  div.className = "blok"+(label==="Sosyal"?" sosyal":"");
  div.dataset.id = label;
  const badge = label!=="Sosyal" ? `<span class="own">${OWN[label]||""}</span>` : "";
  div.innerHTML = `<span>${label==="Sosyal"?"SOSYAL":label}</span>${badge}`;
  return div;
}
function drawPaftaRow(container, arr){
  const row = document.createElement("div");
  row.className = "pafta-row";
  arr.forEach(b=>row.appendChild(makeBlok(b)));
  container.appendChild(row);
}

/* --------- BÖLÜM 1: GÜNLÜK YOKLAMA (edit/sil + update) --------- */
let ATT_TODAY = [];
let EDIT_ATT_ID = null;
const yoklamaMsg = el("#yoklamaMsg");

function setEditMode(on, data=null){
  const btnSave = el("#btnYoklamaKaydet");
  const btnCancel = el("#btnYoklamaIptal");
  if(!btnSave) return;
  if(on){
    btnSave.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Güncelle`;
    if(btnCancel) btnCancel.style.display = "inline-flex";
    if(yoklamaMsg){ yoklamaMsg.style.display = "block"; yoklamaMsg.textContent = "Düzenleme modundasın. Kaydet ile güncellersin."; }
    if(data){
      el("#yoklamaEkip").value = data.crew || "";
      el("#yoklamaKisi").value = data.count || "";
      el("#yoklamaBlok").value = data.block || "";
      el("#yoklamaNot").value  = data.note || "";
    }
  }else{
    btnSave.innerHTML = `<i class="fa-solid fa-user-check"></i> Giriş Yap`;
    if(btnCancel) btnCancel.style.display = "none";
    if(yoklamaMsg){ yoklamaMsg.style.display = "none"; }
    el("#formYoklama")?.reset();
  }
}
el("#btnYoklamaIptal")?.addEventListener("click", ()=>{
  EDIT_ATT_ID = null;
  setEditMode(false);
});
el("#formYoklama")?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const crew = el("#yoklamaEkip").value;
  const count = parseInt(el("#yoklamaKisi").value||"0",10);
  const block = el("#yoklamaBlok").value;
  const note = el("#yoklamaNot").value.trim();
  if(!crew||!count||!block){alert("Ekip, kişi sayısı ve blok zorunludur.");return;}

  if(EDIT_ATT_ID){
    const ref = doc(db, "daily_attendance", todayKey(), "entries", EDIT_ATT_ID);
    await updateDoc(ref, { crew, count, block, note, ts: serverTimestamp() });
    EDIT_ATT_ID = null;
    setEditMode(false);
  }else{
    await addDoc(collection(db,"daily_attendance", todayKey(), "entries"), {
      crew, count, block, note, user: "Sistem", ts: serverTimestamp()
    });
    el("#yoklamaKisi").value=""; el("#yoklamaNot").value="";
  }
});
function renderDaily(entries){
  const ul = el("#yoklamaListesi");
  if(!ul) return;
  ul.innerHTML = entries.length
    ? entries.map(x=>`
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
    `).join("")
    : "<li>Bugün henüz kayıt yok.</li>";
}
onSnapshot(
  query(collection(db,"daily_attendance", todayKey(), "entries"), orderBy("ts","desc")),
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

/* --------- Hızlı Kayıt --------- */
el("#formHizliKayit")?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const rec = {
    user: el("#kayitKullanici").value,
    crew: el("#kayitEkip").value,
    block: el("#kayitBlok").value,
    status: el("#kayitDurum").value, // "Başlanmadı" renksiz kabul
    note: el("#kayitNot").value.trim(),
    ts: serverTimestamp()
  };
  if(!rec.user||!rec.crew||!rec.block){alert("Kullanıcı, ekip ve blok zorunludur.");return;}
  await addDoc(collection(db,"fast_logs"), rec);
  el("#kayitNot").value="";
});

/* Durum -> renk sınıfı */
function statusClass(st){
  if(st==="Devam"||st==="Devam Ediyor"||st==="Basladi"||st==="Başladı") return "d-devam";
  if(st==="Bitti") return "d-bitti";
  if(st==="Teslim"||st==="Teslim Alındı"||st==="TeslimAlindi") return "d-teslim";
  return ""; // Başlanmadı veya boş => renksiz
}

/* Son durum hesapla */
let FAST_ALL = [];
function getLatestStatusFor(block, crew){ // crew boşsa o bloğun genel son durumu
  const data = FAST_ALL.filter(x=>x.block===block && (!crew || x.crew===crew));
  if(!data.length) return "";
  data.sort((a,b)=>{
    const ta = a.ts?.toMillis?.() ?? 0;
    const tb = b.ts?.toMillis?.() ?? 0;
    return tb - ta;
  });
  return statusClass(data[0].status);
}

/* Tablo (Arşiv) */
function renderTable(){
  const eFilter = el("#filtreEkip")?.value ?? "";
  const bFilter = el("#filtreBlok")?.value ?? "";
  const filtered = FAST_ALL.filter(x=>{
    const ek = (eFilter==="" || eFilter==="(Tümü)" || x.crew===eFilter);
    const bl = (bFilter==="" || bFilter==="(Tümü)" || x.block===bFilter);
    return ek && bl;
  });
  const tbody = el("#arsivBody");
  if(!tbody) return;
  tbody.innerHTML = filtered.length ? filtered.map((x)=>`
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
document.addEventListener("click", async (e)=>{
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
    el("#kayitEkip").value = x.crew||"";
    el("#kayitBlok").value = x.block||"";
    el("#kayitDurum").value = x.status||"Basladi";
    el("#kayitNot").value = x.note||"";
    await deleteDoc(doc(db,"fast_logs", id));
    alert("Kayıt düzenleme modunda forma alındı. Kaydet ile güncel halini ekle.");
  }
});
el("#filtreEkip")?.addEventListener("change", renderTable);
el("#filtreBlok")?.addEventListener("change", renderTable);
el("#btnFiltreTemizle")?.addEventListener("click",()=>{
  const fe = el("#filtreEkip"); const fb = el("#filtreBlok");
  if(fe) fe.selectedIndex = 0;
  if(fb) fb.selectedIndex = 0;
  renderTable();
});

/* --------- Bölüm 2: Seçili kaleme ait pafta önizleme --------- */
function paintRowInContainer(container, arrBlocks, crew){
  // container: .pafta (içindeki .pafta-row'larda .bloklar var)
  container.querySelectorAll(".blok").forEach(b=>b.classList.remove("d-devam","d-bitti","d-teslim"));
  arrBlocks.forEach(id=>{
    const box = container.querySelector(`.blok[data-id="${id}"]`);
    const cls = getLatestStatusFor(id, crew);
    if(cls && box) box.classList.add(cls);
  });
}
function ensurePreviewPaftaDrawn(){
  const prev = el("#previewPafta");
  if(!prev || prev.dataset.drawn==="1") return;
  // 3 satırı çiz
  prev.innerHTML = "";
  drawPaftaRow(prev, TOP);
  drawPaftaRow(prev, MID);
  drawPaftaRow(prev, BOT);
  prev.dataset.drawn = "1";
}
el("#kayitEkip")?.addEventListener("change", ()=>{
  ensurePreviewPaftaDrawn();
  const prev = el("#previewPafta");
  const crew = el("#kayitEkip").value || "";
  if(prev) paintRowInContainer(prev, ALL_BLOCKS, crew);
});

/* --------- Bölüm 3: Çoklu pafta (her ekip için) --------- */
function buildMultiPano(){
  const host = el("#panoMulti");
  if(!host) return;
  host.innerHTML = "";
  TEAMS_ORDER.forEach(team=>{
    // Grup kapsayıcı
    const group = document.createElement("div");
    group.className = "pano-group";
    group.dataset.team = team;

    const h3 = document.createElement("h3");
    h3.textContent = team;
    group.appendChild(h3);

    const pf = document.createElement("div");
    pf.className = "pafta";
    // 3 satır
    drawPaftaRow(pf, TOP);
    drawPaftaRow(pf, MID);
    drawPaftaRow(pf, BOT);

    group.appendChild(pf);
    host.appendChild(group);
  });
}
function repaintMultiPano(){
  const host = el("#panoMulti");
  if(!host) return;
  TEAMS_ORDER.forEach(team=>{
    const group = host.querySelector(`.pano-group[data-team="${CSS.escape(team)}"]`);
    if(!group) return;
    const pf = group.querySelector(".pafta");
    if(!pf) return;
    paintRowInContainer(pf, ALL_BLOCKS, team);
  });
}

/* Firestore fast_logs — canlı */
onSnapshot(
  query(collection(db,"fast_logs"), orderBy("ts","desc")),
  (snap)=>{
    FAST_ALL = snap.docs.map(d=>({id:d.id, ...d.data()}));
    renderTable();
    // Önizleme seçili ekip varsa güncelle
    const selCrew = el("#kayitEkip")?.value || "";
    if (el("#previewPafta") && selCrew) {
      paintRowInContainer(el("#previewPafta"), ALL_BLOCKS, selCrew);
    }
    // Çoklu pano güncelle
    repaintMultiPano();
  }
);

/* Pafta modal (seçim) */
let activeTarget = null;
function openPicker(targetId){ activeTarget = targetId; el("#modal")?.classList.add("active"); }
function closePicker(){ el("#modal")?.classList.remove("active"); activeTarget=null; }
el("#btnPaftaYoklama")?.addEventListener("click",()=>openPicker("yoklamaBlok"));
el("#btnPaftaKayit")?.addEventListener("click",()=>openPicker("kayitBlok"));
el("#btnClose")?.addEventListener("click",closePicker);
el("#modal")?.addEventListener("click",(e)=>{ if(e.target.id==="modal") closePicker(); });
["#m-top","#m-mid","#m-bot"].forEach(sel=>{
  const holder = el(sel);
  if(holder){
    // bir kez çiz
    holder.innerHTML="";
    drawPaftaRow(holder, sel==="#m-top"?TOP: sel==="#m-mid"?MID:BOT);
    holder.addEventListener("click",(ev)=>{
      const box = ev.target.closest(".blok"); if(!box||!activeTarget) return;
      const id = box.dataset.id; if(id==="Sosyal") return;
      el("#"+activeTarget).value = id;
      closePicker();
    });
  }
});

/* --------- İCMAL → PDF EXPORT (YALNIZCA TABLO) --------- */
function buildIcmalHTML(){
  const totalBlocks = ALL_BLOCKS.length; // Sosyal hariç
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
            <td style="padding:10px;border:1px solid #bbb;text-align:center" colspan="3"><b>%${avg.toFixed(1)}</b></td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
}

// html2pdf yoksa otomatik yükle
async function ensureHtml2Pdf() {
  if (typeof window.html2pdf !== "undefined") return;
  await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    s.onload = resolve;
    s.onerror = () => reject(new Error("html2pdf yüklenemedi"));
    document.head.appendChild(s);
  });
}

async function exportIcmalPDF(){
  try {
    await ensureHtml2Pdf(); // garanti yükle
    const container = document.createElement("div");
    container.innerHTML = buildIcmalHTML();

    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    const fileName = `icmal_${yyyy}-${mm}-${dd}.pdf`;

    const opt = {
      margin: 10,
      filename: fileName,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, allowTaint: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // @ts-ignore
    window.html2pdf().from(container).set(opt).save();
  } catch (err) {
    alert("PDF oluşturulamadı: " + (err?.message || err));
    console.error(err);
  }
}
el("#btnPdfIcmal")?.addEventListener("click", exportIcmalPDF);

/* Başlangıç */
(function init(){
  // Bölüm 2 önizleme paftası henüz çizilmez (ekip seçilince çiziliyor)
  // Bölüm 3 çoklu pafta hemen oluşturulur
  buildMultiPano();
})();
