import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import {
  getFirestore, collection, addDoc, serverTimestamp,
  query, orderBy, onSnapshot, doc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

/* Firebase config */
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

/* Kısa yardımcılar */
const el = s=>document.querySelector(s);
const els = s=>document.querySelectorAll(s);
const printRoot = el("#printRoot");

/* Veriler */
const CREWS = [
  "Mekanik","Elektrik","Çatı (Kereste)","Çatı (Kiremit)","Çatı (Oluk)","Denizlik","Parke",
  "Seramik","Boya","TG5","PVC","Kör Kasa","Şap","Dış Cephe","Makina Alçı","Saten Alçı",
  "Kaba Sıva (İç)","Yerden Isıtma","Asma Tavan","Klima Tesisat","Mobilya","Çelik Kapı","Korkuluk"
];
const USERS = ["Muhammet","Harun","Metin","Mert","Fuat","Furkan","Misafir"];

const TOP = ["AC","AD","AE","AF","AG","AH","AI","AJ","AK","AL","AM","AN"];
const MID = ["AB","Y","V","S","R","P","O","N","M","L","K","J","I"];
const BOT = ["AA","Z","U","T","Sosyal","A","B","C","D","E","F","G","H"];
const ALL_BLOCKS = [...TOP, ...MID.filter(x=>"Sosyal"!==x), ...BOT.filter(x=>"Sosyal"!==x)];

/* AS/MÜT */
const OWN = {};
const asSet = new Set(["AC","AE","AG","AI","AK","AM","AB","V","R","O","M","K","I","AA","U","A","C","E","G"]);
[...TOP,...MID,...BOT].forEach(b=>{ OWN[b] = asSet.has(b) ? "AS" : (b==="Sosyal"?"":"MÜT"); });

/* UI helpers */
function fillSelect(id, list, placeholder="— Seçiniz —"){
  const s = el('#'+id);
  s.innerHTML = `<option value="">${placeholder}</option>` + list.map(v=>`<option value="${v}">${v}</option>`).join("");
}
function formatDate(ts){
  if(!ts) return "-";
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

/* Select doldurma */
fillSelect("yoklamaEkip", CREWS);
fillSelect("kayitEkip", CREWS);
fillSelect("panoEkipFiltre", ["Tüm Ekipler (Genel)", ...CREWS], "Tüm Ekipler (Genel)");
fillSelect("kayitKullanici", USERS);
fillSelect("yoklamaBlok", ALL_BLOCKS);
fillSelect("kayitBlok", ALL_BLOCKS);

/* Arşiv filtreleri ana panoda */
fillSelect("filtreEkip", ["Ekip (Tümü)", ...CREWS], "Ekip (Tümü)");
fillSelect("filtreBlok", ["Blok (Tümü)", ...ALL_BLOCKS], "Blok (Tümü)");
el("#btnFiltreTemizle").addEventListener("click",()=>{
  el("#filtreEkip").selectedIndex = 0;
  el("#filtreBlok").selectedIndex = 0;
  renderTable();
});

/* Pafta çizimi */
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

/* Modal pafta */
drawPafta("#m-top", TOP);
drawPafta("#m-mid", MID);
drawPafta("#m-bot", BOT);

/* Günlük Yoklama — yaz */
el("#formYoklama").addEventListener("submit", async (e)=>{
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

/* Günlük Yoklama — canlı oku + düzenle/sil */
function renderDaily(entries){
  const ul = el("#yoklamaListesi");
  ul.innerHTML = entries.length
    ? entries.map(x=>`<li>
        <b>${x.crew}</b> — <b>${x.count}</b> kişi — <b>${x.block}</b>
        <span style="color:#777">(${formatDate(x.ts)})</span> ${x.note?`— ${x.note}`:""}
        <span class="inline" style="gap:6px;margin-top:6px">
          <button class="btn btn-secondary btn-icon" data-edit-att="${x.id}"><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn-icon" style="background:#ffe6e6;color:#c62828" data-del-att="${x.id}"><i class="fa-solid fa-trash"></i></button>
        </span>
      </li>`).join("")
    : "<li>Bugün henüz kayıt yok.</li>";
}
onSnapshot(
  query(collection(db,"daily_attendance", todayKey(), "entries"), orderBy("ts","desc")),
  (snap)=>{ DAILY = snap.docs.map(d=>({id:d.id, ...d.data()})); renderDaily(DAILY); }
);
let DAILY = [];
document.addEventListener("click", async (e)=>{
  const del = e.target.closest("[data-del-att]");
  const edit = e.target.closest("[data-edit-att]");
  if(del){
    const id = del.getAttribute("data-del-att");
    await deleteDoc(doc(db,"daily_attendance", todayKey(), "entries", id));
  }
  if(edit){
    const id = edit.getAttribute("data-edit-att");
    const x = DAILY.find(r=>r.id===id);
    if(!x) return;
    el("#yoklamaEkip").value = x.crew||"";
    el("#yoklamaKisi").value = x.count||"";
    el("#yoklamaBlok").value = x.block||"";
    el("#yoklamaNot").value = x.note||"";
    await deleteDoc(doc(db,"daily_attendance", todayKey(), "entries", id));
    alert("Yoklama kaydı forma alındı. Gerekliyse düzenleyip tekrar kaydet.");
  }
});

/* Hızlı Kayıt — yaz */
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

/* Hızlı Kayıt — oku / tablo / pafta boyama */
let FAST_ALL = [];
onSnapshot(
  query(collection(db,"fast_logs"), orderBy("ts","desc")),
  (snap)=>{
    FAST_ALL = snap.docs.map(d=>({id:d.id, ...d.data()}));
    renderTable();   // filtreli
    renderPafta();   // pano boyama
  }
);

/* Durum sınıfı */
function statusToClass(st){
  if(st==="Devam" || st==="Devam Ediyor" || st==="Basladi" || st==="Basladı" || st==="Basladi"){ return "d-devam"; }
  if(st==="Bitti"){ return "d-bitti"; }
  if(st==="Teslim"||st==="Teslim Alındı"||st==="TeslimAlindi"){ return "d-teslim"; }
  return "";
}

/* Son durum – bir blok + (opsiyonel) belirli ekip */
function getLatestStatusFor(block, crew){
  const data = FAST_ALL.filter(x=>x.block===block && (!crew || x.crew===crew));
  if(!data.length) return "";
  data.sort((a,b)=>{
    const ta = a.ts?.toMillis?.() ?? 0;
    const tb = b.ts?.toMillis?.() ?? 0;
    return tb - ta;
  });
  return statusToClass(data[0].status);
}

/* Pano boyama (filtreli) */
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
  const sel = el("#panoEkipFiltre").value;
  const crew = (sel && sel!=="Tüm Ekipler (Genel)") ? sel : "";
  paintRow("#row-top", TOP, crew);
  paintRow("#row-mid", MID, crew);
  paintRow("#row-bot", BOT, crew);
}
el("#panoEkipFiltre").addEventListener("change", renderPafta);

/* Arşiv tablo (filtre ana panoya taşındı) */
function renderTable(){
  const ek = el("#filtreEkip").value;
  const bl = el("#filtreBlok").value;
  const f = FAST_ALL.filter(x=>{
    const okE = !ek || ek==="Ekip (Tümü)" || x.crew===ek;
    const okB = !bl || bl==="Blok (Tümü)" || x.block===bl;
    return okE && okB;
  });
  const tbody = el("#arsivBody");
  tbody.innerHTML = f.length ? f.map((x)=>`
    <tr>
      <td>${formatDate(x.ts)}</td>
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

/* Pafta modal – aç/kapat + kaydırma */
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

/* PDF İcmal – Sadece Pafta + İcmal */
function buildIcmalHTML(){
  const totalBlocks = ALL_BLOCKS.length;
  const rows = CREWS.map(t=>{
    const latestPerBlock = ALL_BLOCKS.map(b=>getLatestStatusFor(b, t));
    const done = latestPerBlock.filter(cls=>cls==="d-bitti"||cls==="d-teslim").length;
    const percent = totalBlocks ? (done/totalBlocks*100) : 0;
    return `<tr>
      <td>${t}</td>
      <td style="text-align:center">${totalBlocks}</td>
      <td style="text-align:center">${done}</td>
      <td style="text-align:center"><b>%${percent.toFixed(1)}</b> <span style="color:#666">(${done}/${totalBlocks})</span></td>
    </tr>`;
  }).join("");
  const percents = CREWS.map(t=>{
    const latestPerBlock = ALL_BLOCKS.map(b=>getLatestStatusFor(b, t));
    const done = latestPerBlock.filter(cls=>cls==="d-bitti"||cls==="d-teslim").length;
    return totalBlocks ? (done/totalBlocks*100) : 0;
  });
  const avg = percents.reduce((a,b)=>a+b,0)/(percents.length||1);

  return `
    <table>
      <thead>
        <tr><th>İMALAT KALEMİ</th><th>YAPILACAK BLOK</th><th>YAPILAN BLOK</th><th>İLERLEME</th></tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr><td><b>GENEL ORTALAMA</b></td><td colspan="3" style="text-align:center"><b>%${avg.toFixed(1)}</b></td></tr>
      </tfoot>
    </table>
  `;
}
function buildPrintDoc(){
  const pafta = el("#paftaLive");
  const paftaClone = pafta ? pafta.cloneNode(true) : document.createElement("div");
  const headerHTML = `
    <h2 style="text-align:center; margin:0 0 10px;">Şantiye İlerleme İcmali — Vista Premium</h2>
    <p style="text-align:center; margin:0 0 14px; color:#555;">Tarih: ${new Date().toLocaleString("tr-TR")}</p>
    <h3 style="margin:8px 0;">Görsel Proje Paftası</h3>
  `;
  printRoot.innerHTML = headerHTML;
  const wrap = document.createElement("div");
  wrap.className = "card";
  wrap.style.border = "1px solid #bbb";
  wrap.style.padding = "10px";
  wrap.appendChild(paftaClone);
  printRoot.appendChild(wrap);
  const ic = document.createElement("div");
  ic.innerHTML = `<h3 style="margin:16px 0 8px;">İcmal Tablosu</h3>${buildIcmalHTML()}`;
  printRoot.appendChild(ic);
}
el("#btnPdfIcmal").addEventListener("click",()=>{
  buildPrintDoc();
  window.print();
  setTimeout(()=>{ printRoot.innerHTML=""; },300);
});

/* Başlangıç */
renderPafta();

/* SW */
if("serviceWorker" in navigator){
  window.addEventListener("load", ()=> navigator.serviceWorker.register("sw.js"));
                       }
