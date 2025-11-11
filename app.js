// ===== Vista Premium – Şantiye Takip v1.5.1 =====

// Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getFirestore, collection, addDoc, serverTimestamp,
  query, orderBy, onSnapshot, doc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// !!! KENDİ PROJE AYARLARIN (daha önce kullandığımız):
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

// ---------- Sabitler
const CREWS = [
  "Elektrik","Mekanik","Kör Kasa","TG5",
  "Çatı (Kereste)","Çatı (Oluk)","Çatı (Kiremit)",
  "Kaba Sıva (İç)","Makina Alçı","Saten Alçı",
  "Dış Cephe Sıva","Dış Cephe Kenet","Denizlik",
  "Dış Cephe Bordex","Dış Cephe Çizgi Sıva",
  "PVC","Klima Tesisat","Asma Tavan","Yerden Isıtma",
  "Şap","İç Boya","Parke","Seramik","Mobilya","Çelik Kapı"
];

const USERS = ["Muhammet","Harun","Metin","Mert","Fuat","Furkan","Misafir"];

const TOP = ["AC","AD","AE","AF","AG","AH","AI","AJ","AK","AL","AM","AN"];
const MID = ["AB","Y","V","S","R","P","O","N","M","L","K","J","I"];
const BOT = ["AA","Z","U","T","Sosyal","A","B","C","D","E","F","G","H"];

const ALL_BLOCKS = [...TOP, ...MID.filter(x=>"Sosyal"!==x), ...BOT.filter(x=>"Sosyal"!==x)];

// Mülkiyet: AS / MÜT (senin onayladığın dağılım)
const OWN = {};
const asSet = new Set(["AC","AE","AG","AI","AK","AM","AB","V","R","O","M","K","I","AA","U","A","C","E","G"]);
[...TOP,...MID,...BOT].forEach(b=>{ OWN[b] = (b==="Sosyal")?"":(asSet.has(b)?"AS":"MÜT"); });

// ---------- Kısa yardımcılar
const el  = s=>document.querySelector(s);
const els = s=>document.querySelectorAll(s);

function fillSelect(sel, list, placeholder="— Seçiniz —") {
  sel.innerHTML = `<option value="">${placeholder}</option>` +
    list.map(v=>`<option value="${v}">${v}</option>`).join("");
}
function formatTS(ts){
  if(!ts) return "-";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("tr-TR",{day:"2-digit",month:"2-digit",year:"numeric"})+" "+
         d.toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"});
}
function todayKey(){
  const d=new Date(), m=String(d.getMonth()+1).padStart(2,"0"), day=String(d.getDate()).padStart(2,"0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// ---------- Navigasyon
els(".nav-btn").forEach(btn=>{
  btn.addEventListener("click",()=>{
    els(".nav-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    els(".page").forEach(p=>p.classList.remove("active"));
    el("#"+btn.dataset.page).classList.add("active");
  });
});

// ---------- Selectleri doldur (alfabetik)
function sortTR(a,b){ return a.localeCompare(b,"tr"); }
fillSelect(el("#yoklamaEkip"), [...CREWS].sort(sortTR));
fillSelect(el("#kayitEkip"),   [...CREWS].sort(sortTR));
fillSelect(el("#panoEkipFiltre"), ["Tüm Ekipler (Genel)", ...[...CREWS].sort(sortTR)], "Tüm Ekipler (Genel)");
fillSelect(el("#kayitKullanici"), USERS);
fillSelect(el("#yoklamaBlok"), ALL_BLOCKS);
fillSelect(el("#kayitBlok"), ALL_BLOCKS);

// ---------- Pafta çizimi
function makeBlok(id){
  const div=document.createElement("div");
  div.className="blok"+(id==="Sosyal"?" sosyal":"");
  div.dataset.id=id;
  div.innerHTML = `<span>${id==="Sosyal"?"SOSYAL":id}</span>${id!=="Sosyal"?`<span class="own">${OWN[id]||""}</span>`:""}`;
  return div;
}
function drawPafta(rowSel, arr){
  const row=el(rowSel); row.innerHTML="";
  arr.forEach(b=>row.appendChild(makeBlok(b)));
}
drawPafta("#row-top", TOP);
drawPafta("#row-mid", MID);
drawPafta("#row-bot", BOT);

// Modal içi
drawPafta("#m-top", TOP);
drawPafta("#m-mid", MID);
drawPafta("#m-bot", BOT);

// ---------- YOKLAMA: yaz
el("#formYoklama").addEventListener("submit", async (e)=>{
  e.preventDefault();
  const crew = el("#yoklamaEkip").value;
  const count = parseInt(el("#yoklamaKisi").value||"0",10);
  const block = el("#yoklamaBlok").value;
  const note = el("#yoklamaNot").value.trim();
  if(!crew||!count||!block){ alert("Ekip, kişi sayısı ve blok gerekli."); return; }
  await addDoc(collection(db,"daily_attendance", todayKey(), "entries"), {
    crew, count, block, note, user:"Sistem", ts: serverTimestamp()
  });
  el("#yoklamaKisi").value=""; el("#yoklamaNot").value="";
});

// YOKLAMA: canlı oku
function renderDaily(list){
  const ul=el("#yoklamaListesi");
  ul.innerHTML = list.length
   ? list.map(x=>`<li style="padding:8px 0;border-bottom:1px dashed #e6e6e6">
       <b>${x.crew}</b> — <b>${x.count}</b> kişi — <b>${x.block}</b>
       <span style="color:#777"> (${formatTS(x.ts)})</span>${x.note?` — ${x.note}`:""}
     </li>`).join("")
   : `<li>Bugün henüz kayıt yok.</li>`;
}
onSnapshot(
  query(collection(db,"daily_attendance", todayKey(), "entries"), orderBy("ts","desc")),
  snap=>renderDaily(snap.docs.map(d=>({id:d.id, ...d.data()})))
);

// ---------- HIZLI KAYIT: yaz
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
  if(!rec.user||!rec.crew||!rec.block){ alert("Kullanıcı, ekip ve blok zorunlu."); return; }
  await addDoc(collection(db,"fast_logs"), rec);
  el("#kayitNot").value="";
});

// ---------- HIZLI KAYIT: canlı oku + pafta boyama + tablo
let FAST_ALL = [];

function latestCls(block, crewOpt){
  const data = FAST_ALL.filter(x=>x.block===block && (!crewOpt || x.crew===crewOpt));
  if(!data.length) return "";
  data.sort((a,b)=>{
    const ta=a.ts?.toMillis?.() ?? 0;
    const tb=b.ts?.toMillis?.() ?? 0;
    return tb-ta;
  });
  const s=data[0].status;
  if(s==="Devam"||s==="Devam Ediyor"||s==="Başladı") return "d-devam";
  if(s==="Bitti") return "d-bitti";
  if(s==="Teslim"||s==="Teslim Alındı"||s==="TeslimAlindi") return "d-teslim";
  return "";
}

function paintRow(rowSel, arr, crewOpt){
  const row=el(rowSel);
  row.querySelectorAll(".blok").forEach(b=>b.classList.remove("d-devam","d-bitti","d-teslim"));
  arr.forEach(id=>{
    const box=row.querySelector(`.blok[data-id="${id}"]`);
    const cls=latestCls(id, crewOpt);
    if(cls && box) box.classList.add(cls);
  });
}
function renderPafta(){
  const crew = el("#panoEkipFiltre")?.value || "";
  const useCrew = (crew && crew!=="Tüm Ekipler (Genel)") ? crew : "";
  paintRow("#row-top", TOP, useCrew);
  paintRow("#row-mid", MID, useCrew);
  paintRow("#row-bot", BOT, useCrew);
}

function renderTable(){
  const tbody=el("#arsivBody");
  if(!tbody) return;
  tbody.innerHTML = FAST_ALL.length ? FAST_ALL.map(x=>`
    <tr>
      <td>${formatTS(x.ts)}</td>
      <td>${x.user}</td>
      <td>${x.crew}</td>
      <td>${x.block}</td>
      <td><b>${x.status}</b></td>
      <td>${x.note?x.note:"-"}</td>
      <td>
        <button class="btn btn-secondary btn-icon" data-edit="${x.id}"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-icon" style="background:#ffe6e6;color:#c62828" data-del="${x.id}"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`).join("")
    : `<tr><td colspan="7" style="padding:14px;text-align:center;color:#666">Kayıt yok</td></tr>`;
}

onSnapshot(
  query(collection(db,"fast_logs"), orderBy("ts","desc")),
  snap=>{
    FAST_ALL = snap.docs.map(d=>({id:d.id, ...d.data()}));
    renderTable();
    renderPafta();
  }
);

// Edit / Delete
document.addEventListener("click", async (e)=>{
  const del = e.target.closest("[data-del]");
  const edit = e.target.closest("[data-edit]");
  if(del){
    const id=del.getAttribute("data-del");
    await deleteDoc(doc(db,"fast_logs", id));
  }
  if(edit){
    const id=edit.getAttribute("data-edit");
    const x=FAST_ALL.find(r=>r.id===id);
    if(!x) return;
    el("#kayitKullanici").value=x.user||"";
    el("#kayitEkip").value=x.crew||"";
    el("#kayitBlok").value=x.block||"";
    el("#kayitDurum").value=x.status||"Basladi";
    el("#kayitNot").value=x.note||"";
    await deleteDoc(doc(db,"fast_logs", id));
    alert("Kayıt düzenleme modunda forma alındı. Kaydet ile güncel halini ekle.");
  }
});

// ---------- Pafta Modal (Picker)
let activeTarget=null;
function openPicker(targetId){ activeTarget=targetId; el("#modal").classList.add("active"); }
function closePicker(){ el("#modal").classList.remove("active"); activeTarget=null; }

const btnY = el("#btnPaftaYoklama"), btnK = el("#btnPaftaKayit");
if(btnY) btnY.addEventListener("click",()=>openPicker("yoklamaBlok"));
if(btnK) btnK.addEventListener("click",()=>openPicker("kayitBlok"));
el("#btnClose")?.addEventListener("click",closePicker);
el("#modal")?.addEventListener("click",(e)=>{ if(e.target.id==="modal") closePicker(); });

["#m-top","#m-mid","#m-bot"].forEach(sel=>{
  el(sel)?.addEventListener("click",(ev)=>{
    const box = ev.target.closest(".blok");
    if(!box||!activeTarget) return;
    const id=box.dataset.id;
    if(id==="Sosyal") return;
    el("#"+activeTarget).value=id;
    closePicker();
  });
});

// ---------- Pano filtre
el("#panoEkipFiltre")?.addEventListener("change", renderPafta);

// ---------- İCMAL (yalnızca pafta + tablo, arşiv hariç)
function buildIcmalHTML(){
  const total = ALL_BLOCKS.length;
  const rows = CREWS.map(t=>{
    const done = ALL_BLOCKS
      .map(b=>latestCls(b,t))
      .filter(c=>c==="d-bitti"||c==="d-teslim").length;
    const pct = total ? (done/total*100) : 0;
    return `<tr>
      <td style="padding:8px;border:1px solid #bbb">${t}</td>
      <td style="padding:8px;border:1px solid #bbb;text-align:center">${total}</td>
      <td style="padding:8px;border:1px solid #bbb;text-align:center">${done}</td>
      <td style="padding:8px;border:1px solid #bbb;text-align:center"><b>%${pct.toFixed(1)}</b> <span style="color:#666">(${done}/${total})</span></td>
    </tr>`;
  }).join("");

  const avg = (()=>{
    const arr = CREWS.map(t=>{
      const done = ALL_BLOCKS
        .map(b=>latestCls(b,t))
        .filter(c=>c==="d-bitti"||c==="d-teslim").length;
      return total ? (done/total*100) : 0;
    });
    return arr.reduce((a,b)=>a+b,0)/(arr.length||1);
  })();

  return `
    <h3 style="margin:8px 0 10px">Şantiye İlerleme İcmali — Vista Premium</h3>
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
  `;
}

el("#btnPdfIcmal")?.addEventListener("click", ()=>{
  // Sadece pafta + icmal tablosu
  const w = window.open("", "_blank", "noopener,noreferrer");
  const html = `
  <html><head><meta charset="UTF-8"><title>İcmal</title>
  <style>
    body{font-family:Arial,sans-serif;margin:20px}
    .grid{margin-bottom:16px}
    .pafta-row{display:flex;gap:8px;margin:6px 0}
    .blok{flex:0 0 50px;height:50px;border:1px solid #ccc;border-radius:6px;display:flex;align-items:center;justify-content:center;font:bold 12px/1 Arial}
    .blok.d-devam{background:#fdd835}
    .blok.d-bitti{background:#43a047;color:#fff}
    .blok.d-teslim{background:#2e7d32;color:#fff}
  </style></head><body>
    <h2>Görsel Proje Paftası</h2>
    <div class="grid">
      <div class="pafta-row">${TOP.map(b=>`<div class="blok ${latestCls(b,"")}">${b}</div>`).join("")}</div>
      <div class="pafta-row">${MID.map(b=>`<div class="blok ${latestCls(b,"")}">${b}</div>`).join("")}</div>
      <div class="pafta-row">${BOT.map(b=>`<div class="blok ${latestCls(b,"")}">${b}</div>`).join("")}</div>
    </div>
    ${buildIcmalHTML()}
    <script>window.onload=()=>window.print()</script>
  </body></html>`;
  w.document.write(html); w.document.close();
});

// ---------- Başlat
(function init(){
  renderPafta(); // snapshot gelince tekrar boyanır
})();
