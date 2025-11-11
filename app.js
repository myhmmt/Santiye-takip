// app.js (v1.5.1)

// --- Firebase (modular CDN) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getFirestore, collection, addDoc, serverTimestamp,
  query, orderBy, onSnapshot, doc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// -- Proje config (sende aynı) --
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

// --------- Sabitler / Yardımcılar ----------
const el  = s => document.querySelector(s);
const els = s => document.querySelectorAll(s);

function fillSelect(id, list, placeholder="— Seçiniz —") {
  const s = el('#'+id);
  if (!s) return;
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

// --- Ekipler (select’lerde alfabetik) ---
const CREWS_RAW = [
  "Mekanik","Elektrik","Çatı (Kereste)","Çatı (Kiremit)","Çatı (Oluk)",
  "Denizlik","Parke","Seramik","Boya","TG5","PVC","Kör Kasa","Şap",
  "Dış Cephe","Makina Alçı","Saten Alçı","Kaba Sıva (İç)","Yerden Isıtma",
  "Asma Tavan","Klima Tesisat","Mobilya","Çelik Kapı","Korkuluk",
  // sonradan eklediklerin:
  "Dış Cephe Bordex","Dış Cephe Sıva","Dış Cephe Çizgi Sıva","Dış Cephe Kenet","İç Boya"
];
// Select’lerde alfabetik; pano/hesapta aynı liste kullanıyoruz
const CREWS = [...new Set(CREWS_RAW)].sort((a,b)=>a.localeCompare(b,'tr'));

// --- Kullanıcılar (sabit) ---
const USERS = ["Muhammet","Harun","Metin","Mert","Fuat","Furkan","Misafir"];

// --- Pafta blok dizilimi ---
const TOP = ["AC","AD","AE","AF","AG","AH","AI","AJ","AK","AL","AM","AN"];
const MID = ["AB","Y","V","S","R","P","O","N","M","L","K","J","I"];
const BOT = ["AA","Z","U","T","Sosyal","A","B","C","D","E","F","G","H"];
const ALL_BLOCKS = [...TOP, ...MID.filter(x=>"Sosyal"!==x), ...BOT.filter(x=>"Sosyal"!==x)];

// --- Mülkiyet (AS/MÜT/P) rozetleri ---
const OWN = {};
const ARSA_SAHIBI = new Set(["AC","AE","AG","AI","AK","AM","AB","V","R","O","M","K","I","AA","U","A","C","E","G"]); // onayladığın set
[...TOP, ...MID, ...BOT].forEach(b=>{
  OWN[b] = b==="Sosyal" ? "" : (ARSA_SAHIBI.has(b) ? "AS" : "MÜT");
});

// --- Nav (sekme) ---
els(".nav-btn").forEach(btn=>{
  btn.addEventListener("click",()=>{
    els(".nav-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    const id = btn.dataset.page;
    els(".page").forEach(p=>p.classList.remove("active"));
    el("#"+id).classList.add("active");
  });
});

// --- Select doldurma (alfabetik ekip) ---
fillSelect("yoklamaEkip", CREWS);
fillSelect("kayitEkip", CREWS);
fillSelect("panoEkipFiltre", CREWS, "Tüm Ekipler (Genel)");
fillSelect("kayitKullanici", USERS);
fillSelect("yoklamaBlok", ALL_BLOCKS);
fillSelect("kayitBlok", ALL_BLOCKS);

// --- Pafta çizimi ---
function makeBlok(label){
  const div = document.createElement("div");
  div.className = "blok"+(label==="Sosyal"?" sosyal-tesis":"");
  div.dataset.id = label;
  div.innerHTML = `<span>${label==="Sosyal"?"SOSYAL TESİS":label}</span>${label!=="Sosyal"?`<span class="owner-tag">${OWN[label]||""}</span>`:""}`;
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

// --- Modal içindeki pafta (Paftadan Seç) ---
drawPafta("#m-top", TOP);
drawPafta("#m-mid", MID);
drawPafta("#m-bot", BOT);

// --- Günlük Yoklama — yaz ---
const formY = el("#formYoklama");
if (formY){
  formY.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const crew = el("#yoklamaEkip").value;
    const count = parseInt(el("#yoklamaKisi").value||"0",10);
    const block = el("#yoklamaBlok").value;
    const note = el("#yoklamaNot").value.trim();
    if(!crew||!count||!block){alert("Ekip, kişi sayısı ve blok zorunludur.");return;}
    await addDoc(collection(db,"daily_attendance", todayKey(), "entries"), {
      crew, count, block, note, user: "Sistem", ts: serverTimestamp()
    });
    el("#yoklamaKisi").value=""; el("#yoklamaNot").value="";
  });
}

// --- Günlük Yoklama — canlı oku (bugün) ---
function renderDaily(entries){
  const ul = el("#yoklamaListesi");
  if (!ul) return;
  ul.innerHTML = entries.length
    ? entries.map(x=>`<li style="padding:8px 0;border-bottom:1px dashed var(--border-color)"><b>${x.crew}</b> — <b>${x.count}</b> kişi — <b>${x.block}</b> <span style="color:#777">(${formatDateFromTS(x.ts)})</span>${x.note?` — ${x.note}`:""}</li>`).join("")
    : "<li>Bugün henüz kayıt yok.</li>";
}
const dailyRef = collection(db,"daily_attendance", todayKey(), "entries");
onSnapshot(query(dailyRef, orderBy("ts","desc")), (snap)=> {
  renderDaily(snap.docs.map(d=>({id:d.id, ...d.data()})));
});

// --- Hızlı Kayıt — yaz ---
const formH = el("#formHizliKayit");
if (formH){
  formH.addEventListener("submit", async (e)=>{
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
}

// --- Hızlı Kayıt — canlı oku / tablo / pafta boyama ---
let FAST_ALL = [];
function getLatestStatusFor(block, crew){
  const data = FAST_ALL.filter(x=>x.block===block && (!crew || x.crew===crew));
  if(!data.length) return "";
  data.sort((a,b)=>{
    const ta = a.ts?.toMillis?.() ?? 0;
    const tb = b.ts?.toMillis?.() ?? 0;
    return tb - ta;
  });
  const st = data[0].status;
  if(st==="Devam"||st==="Devam Ediyor"||st==="Basladi"||st==="Başladı") return "durum-devam"; // Başladı= sarı
  if(st==="Bitti") return "durum-bitti";
  if(st==="Teslim"||st==="Teslim Alındı"||st==="TeslimAlindi") return "durum-teslim";
  return ""; // (yoksa: başlanmadı = renksiz)
}
function paintRow(rowSel, arr, crew){
  const row = el(rowSel);
  row.querySelectorAll(".blok").forEach(b=>b.classList.remove("durum-devam","durum-bitti","durum-teslim"));
  arr.forEach(id=>{
    const box = row.querySelector(`.blok[data-id="${id}"]`);
    const cls = getLatestStatusFor(id, crew);
    if(cls && box) box.classList.add(cls);
  });
}
function renderPafta(){
  const crew = el("#panoEkipFiltre")?.value || "";
  paintRow("#row-top", TOP, crew);
  paintRow("#row-mid", MID, crew);
  paintRow("#row-bot", BOT, crew);
}
function renderTable(){
  const tbody = el("#arsivBody");
  if(!tbody) return;
  tbody.innerHTML = FAST_ALL.length ? FAST_ALL.map((x)=>`
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
onSnapshot(query(collection(db,"fast_logs"), orderBy("ts","desc")), (snap)=>{
  FAST_ALL = snap.docs.map(d=>({id:d.id, ...d.data()}));
  renderTable();
  renderPafta();
});

// Edit / Delete
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

// --- Pano filtre değişimi ---
el("#panoEkipFiltre")?.addEventListener("change", renderPafta);

// --- Pafta Modal (Paftadan Seç) ---
let activeTarget = null;
function openPicker(targetId){ activeTarget = targetId; el("#modal").classList.add("active"); }
function closePicker(){ el("#modal").classList.remove("active"); activeTarget=null; }
el("#btnPaftaYoklama")?.addEventListener("click",()=>openPicker("yoklamaBlok"));
el("#btnPaftaKayit")?.addEventListener("click",()=>openPicker("kayitBlok"));
el("#btnClose")?.addEventListener("click",closePicker);
el("#modal")?.addEventListener("click",(e)=>{ if(e.target.id==="modal") closePicker(); });
["#m-top","#m-mid","#m-bot"].forEach(sel=>{
  el(sel)?.addEventListener("click",(ev)=>{
    const box = ev.target.closest(".blok"); if(!box||!activeTarget) return;
    const id = box.dataset.id; if(id==="Sosyal") return;
    el("#"+activeTarget).value = id;
    closePicker();
  });
});

// --- İcmal (yalnızca pafta durumlarından üretir; arşiv tablosunu dahil etmez) ---
function buildIcmalHTML(){
  const totalBlocks = ALL_BLOCKS.length;
  const rows = CREWS.map(t=>{
    const latestPerBlock = ALL_BLOCKS.map(b=>getLatestStatusFor(b, t));
    const done = latestPerBlock.filter(cls=>cls==="durum-bitti"||cls==="durum-teslim").length;
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
    const done = latestPerBlock.filter(cls=>cls==="durum-bitti"||cls==="durum-teslim").length;
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
el("#btnPdfIcmal")?.addEventListener("click",()=>{
  const printHost = el("#printTable");
  if(!printHost) return;
  printHost.innerHTML = buildIcmalHTML();
  window.print();
});

// --- Başlangıç ---
(function init(){
  renderPafta(); // snapshot gelmeden önce boş paftayı hazırlasın
})();
