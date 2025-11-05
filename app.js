import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getFirestore, collection, addDoc, serverTimestamp,
  query, orderBy, onSnapshot, doc, deleteDoc, updateDoc
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

/* Listeler */
const CREWS = ["Mekanik","Elektrik","Çatı (Kereste)","Çatı (Kiremit)","Çatı (Oluk)","Denizlik","Parke","Seramik","Boya","TG5","PVC","Kör Kasa","Şap","Dış Cephe","Makina Alçı","Saten Alçı","Kaba Sıva (İç)","Yerden Isıtma","Asma Tavan","Klima Tesisat","Mobilya","Çelik Kapı","Korkuluk"];
const USERS = ["Muhammet","Harun","Metin","Mert","Fuat","Furkan","Misafir"];

const TOP = ["AC","AD","AE","AF","AG","AH","AI","AJ","AK","AL","AM","AN"];
const MID = ["AB","Y","V","S","R","P","O","N","M","L","K","J","I"];
const BOT = ["AA","Z","U","T","Sosyal","A","B","C","D","E","F","G","H"];

const OWN = {};
const asSet = new Set(["AC","AE","AG","AI","AK","AM","AB","V","R","O","M","K","I","AA","U","A","C","E","G"]);
[...TOP,...MID,...BOT].forEach(b=>{ OWN[b] = (b==="Sosyal") ? "" : (asSet.has(b) ? "AS" : "MÜT"); });

/* Helpers */
const el = s=>document.querySelector(s);
const els = s=>document.querySelectorAll(s);
function fillSelect(id, list, placeholder="— Seçiniz —"){
  const s = el('#'+id);
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

/* Nav */
els(".nav-btn").forEach(btn=>{
  btn.addEventListener("click",()=>{
    els(".nav-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    const id = btn.dataset.page;
    els(".page").forEach(p=>p.classList.remove("active"));
    el("#"+id).classList.add("active");
  });
});

/* Selectler */
const ALL_BLOCKS = [...TOP, ...MID.filter(x=>"Sosyal"!==x), ...BOT.filter(x=>"Sosyal"!==x)];
fillSelect("yoklamaEkip", CREWS);
fillSelect("kayitEkip", CREWS);
fillSelect("panoEkipFiltre", CREWS, "Tüm Ekipler (Genel)");
fillSelect("kayitKullanici", USERS);
fillSelect("yoklamaBlok", ALL_BLOCKS);
fillSelect("kayitBlok", ALL_BLOCKS);
fillSelect("filtreEkip", ["(Tümü)",...CREWS], "Ekip (Tümü)");
fillSelect("filtreBlok", ["(Tümü)",...ALL_BLOCKS], "Blok (Tümü)");

/* Pafta */
function makeBlok(label){
  const div = document.createElement("div");
  div.className = "blok"+(label==="Sosyal"?" sosyal":"");
  div.dataset.id = label;
  div.innerHTML = `<span>${label==="Sosyal"?"SOSYAL":label}</span>${label!=="Sosyal"?`<span class="own">${OWN[label]||""}</span>`:""}`;
  return div;
}
function drawPafta(rowSel, arr){
  const row = el(rowSel);
  row.innerHTML="";
  arr.forEach(b=>row.appendChild(makeBlok(b)));
}
drawPafta("#row-top", TOP);
drawPafta("#row-mid", MID);
drawPafta("#row-bot", BOT);
drawPafta("#m-top", TOP);
drawPafta("#m-mid", MID);
drawPafta("#m-bot", BOT);

/* --------- BÖLÜM 1: GÜNLÜK YOKLAMA (Edit/Sil + Update) --------- */
let ATT_TODAY = [];          // bugünkü yoklama listesi cache
let EDIT_ATT_ID = null;      // düzenlenen belge id
const yoklamaMsg = el("#yoklamaMsg");

function setEditMode(on, data=null){
  const btnSave = el("#btnYoklamaKaydet");
  const btnCancel = el("#btnYoklamaIptal");
  if(on){
    btnSave.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Güncelle`;
    btnCancel.style.display = "inline-flex";
    yoklamaMsg.style.display = "block";
    yoklamaMsg.textContent = "Düzenleme modundasın. Kaydet ile güncellersin.";
    if(data){
      el("#yoklamaEkip").value = data.crew || "";
      el("#yoklamaKisi").value = data.count || "";
      el("#yoklamaBlok").value = data.block || "";
      el("#yoklamaNot").value  = data.note || "";
    }
  }else{
    btnSave.innerHTML = `<i class="fa-solid fa-user-check"></i> Giriş Yap`;
    btnCancel.style.display = "none";
    yoklamaMsg.style.display = "none";
    el("#formYoklama").reset();
  }
}

el("#btnYoklamaIptal").addEventListener("click", ()=>{
  EDIT_ATT_ID = null;
  setEditMode(false);
});

el("#formYoklama").addEventListener("submit", async (e)=>{
  e.preventDefault();
  const crew = el("#yoklamaEkip").value;
  const count = parseInt(el("#yoklamaKisi").value||"0",10);
  const block = el("#yoklamaBlok").value;
  const note = el("#yoklamaNot").value.trim();
  if(!crew||!count||!block){alert("Ekip, kişi sayısı ve blok zorunludur.");return;}

  if(EDIT_ATT_ID){
    // UPDATE
    const ref = doc(db, "daily_attendance", todayKey(), "entries", EDIT_ATT_ID);
    await updateDoc(ref, { crew, count, block, note, ts: serverTimestamp() });
    EDIT_ATT_ID = null;
    setEditMode(false);
  }else{
    // CREATE
    await addDoc(collection(db,"daily_attendance", todayKey(), "entries"), {
      crew, count, block, note, user: "Sistem", ts: serverTimestamp()
    });
    el("#yoklamaKisi").value=""; el("#yoklamaNot").value="";
  }
});

function renderDaily(entries){
  const ul = el("#yoklamaListesi");
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

// Yoklama Edit/Sil Event Delegation
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

/* --------- BÖLÜM 2: HIZLI KAYIT (aynı) --------- */
el("#formHizliKayit").addEventListener("submit", async (e)=>{
  e.preventDefault();
  const rec = {
    user: el("#kayitKullanici").value,
    crew: el("#kayitEkip").value,
    block: el("#kayitBlok").value,
    status: el("#kayitDurum").value,
    note: el("#kayitNot").value.trim(),
    ts: serverTimestamp()
  };
  if(!rec.user||!rec.crew||!rec.block){alert("Kullanıcı, ekip ve blok zorunludur.");return;}
  await addDoc(collection(db,"fast_logs"), rec);
  el("#kayitNot").value="";
});

/* Hızlı Kayıt — canlı oku / tablo / pafta boyama */
let FAST_ALL = [];
function statusClass(st){
  if(st==="Devam"||st==="Devam Ediyor"||st==="Basladi"||st==="Başladı") return "d-devam";
  if(st==="Bitti") return "d-bitti";
  if(st==="Teslim"||st==="Teslim Alındı"||st==="TeslimAlindi") return "d-teslim";
  return "";
}
function getLatestStatusFor(block, crew){
  const data = FAST_ALL.filter(x=>x.block===block && (!crew || x.crew===crew));
  if(!data.length) return "";
  data.sort((a,b)=>{
    const ta = a.ts?.toMillis?.() ?? 0;
    const tb = b.ts?.toMillis?.() ?? 0;
    return tb - ta;
  });
  return statusClass(data[0].status);
}
function paintRow(rowSel, arr, crew){
  const row = el(rowSel);
  row.querySelectorAll(".blok").forEach(b=>b.classList.remove("d-devam","d-bitti","d-teslim"));
  arr.forEach(id=>{
    const box = row.querySelector(`.blok[data-id="${id}"]`);
    const cls = getLatestStatusFor(id, crew);
    if(cls && box) box.classList.add(cls);
  });
}
function renderPafta(){
  const crew = el("#panoEkipFiltre").value || "";
  paintRow("#row-top", TOP, crew);
  paintRow("#row-mid", MID, crew);
  paintRow("#row-bot", BOT, crew);
}
function renderTable(){
  const eFilter = el("#filtreEkip").value;
  const bFilter = el("#filtreBlok").value;
  const filtered = FAST_ALL.filter(x=>{
    const ek = (eFilter==="" || eFilter==="(Tümü)" || x.crew===eFilter);
    const bl = (bFilter==="" || bFilter==="(Tümü)" || x.block===bFilter);
    return ek && bl;
  });
  const tbody = el("#arsivBody");
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
onSnapshot(
  query(collection(db,"fast_logs"), orderBy("ts","desc")),
  (snap)=>{
    FAST_ALL = snap.docs.map(d=>({id:d.id, ...d.data()}));
    renderTable();
    renderPafta();
  }
);
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

/* Pafta modal (seçim) */
let activeTarget = null;
function openPicker(targetId){ activeTarget = targetId; el("#modal").classList.add("active"); }
function closePicker(){ el("#modal").classList.remove("active"); activeTarget=null; }
el("#btnPaftaYoklama").addEventListener("click",()=>openPicker("yoklamaBlok"));
el("#btnPaftaKayit").addEventListener("click",()=>openPicker("kayitBlok"));
el("#btnClose").addEventListener("click",closePicker);
el("#modal").addEventListener("click",(e)=>{ if(e.target.id==="modal") closePicker(); });
["#m-top","#m-mid","#m-bot"].forEach(sel=>{
  el(sel).addEventListener("click",(ev)=>{
    const box = ev.target.closest(".blok"); if(!box||!activeTarget) return;
    const id = box.dataset.id; if(id==="Sosyal") return;
    el("#"+activeTarget).value = id;
    closePicker();
  });
});

/* Filtre */
el("#panoEkipFiltre").addEventListener("change", renderPafta);
el("#filtreEkip").addEventListener("change", renderTable);
el("#filtreBlok").addEventListener("change", renderTable);
el("#btnFiltreTemizle").addEventListener("click",()=>{
  el("#filtreEkip").selectedIndex = 0;
  el("#filtreBlok").selectedIndex = 0;
  renderTable();
});

/* --------- İCMAL → PDF EXPORT (yalnız pafta + tablo) --------- */
function clonePaftaForExport() {
  const src = document.querySelector('#projePaftasi .pafta');
  const clone = src ? src.cloneNode(true) : document.createElement('div');
  // A4’e daha iyi sığması için hafif küçült
  clone.style.transform = 'scale(0.95)';
  clone.style.transformOrigin = 'top left';
  clone.style.marginBottom = '12px';
  // Yatay taşmaları gizlemesin; html2pdf genişliği okuyacak
  clone.style.overflow = 'visible';
  return clone;
}
function buildIcmalHTML(){
  const totalBlocks = ALL_BLOCKS.length;
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

function exportIcmalPDF(){
  const container = el("#pdfArea");
  container.innerHTML = ""; // temizle

  const head = document.createElement("div");
  head.innerHTML = `<h2 style="margin:0 0 10px;font-family:Roboto,Arial">Şantiye İlerleme İcmali — Vista Premium</h2>
                    <h4 style="margin:0 0 12px;color:#555;font-family:Roboto,Arial">Görsel Proje Paftası</h4>`;
  container.appendChild(head);

  const paftaClone = clonePaftaForExport();
  container.appendChild(paftaClone);

  const tableWrap = document.createElement("div");
  tableWrap.style.marginTop = "10px";
  tableWrap.innerHTML = buildIcmalHTML();
  container.appendChild(tableWrap);

  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  const fileName = `icmal_${yyyy}-${mm}-${dd}.pdf`;

  // html2pdf ayarları
  const opt = {
    margin:       10,
    filename:     fileName,
    image:        { type: 'jpeg', quality: 0.95 },
    html2canvas:  { scale: 2, useCORS: true, allowTaint: true },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  // İndir
  // @ts-ignore (CDN global)
  html2pdf().from(container).set(opt).save().then(()=>{
    // iş bittiğinde istersen temizleyebilirsin
    // container.innerHTML = "";
  });
}

el("#btnPdfIcmal")?.addEventListener("click", exportIcmalPDF);

/* Başlangıç */
(function init(){ renderPafta(); })();
