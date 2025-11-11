/* =====================  Firebase  ===================== */
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

/* =====================  Sabitler  ===================== */
/** Blok dizilimi (pafta) */
const TOP = ["AC","AD","AE","AF","AG","AH","AI","AJ","AK","AL","AM","AN"];
const MID = ["AB","Y","V","S","R","P","O","N","M","L","K","J","I"];
const BOT = ["AA","Z","U","T","Sosyal","A","B","C","D","E","F","G","H"];
const ALL_BLOCKS = [...TOP, ...MID.filter(x=>"Sosyal"!==x), ...BOT.filter(x=>"Sosyal"!==x)];

/** Mülkiyet rozetleri */
const OWN = {};
const AS_SET = new Set(["AC","AE","AG","AI","AK","AM","AB","V","R","O","M","K","I","AA","U","A","C","E","G"]);
[...TOP,...MID,...BOT].forEach(b=>{
  OWN[b] = (b==="Sosyal") ? "" : (AS_SET.has(b) ? "AS" : "MÜT");
});

/** Kullanıcı & ekip listeleri */
const USERS = ["Muhammet","Harun","Metin","Mert","Fuat","Furkan","Misafir"];

// Panoda sıralama (senin verdiğin kesin sıra)
const CREW_ORDER = [
  "Elektrik","Mekanik","Kör Kasa","TG5","Çatı (Kereste)","Çatı (Oluk)","Çatı (Kiremit)",
  "Kaba Sıva (İç)","Makina Alçı","Saten Alçı","Dış Cephe Sıva","Dış Cephe Kenet",
  "Denizlik","Dış Cephe Bordex","Dış Cephe Çizgi Sıva","PVC","Klima Tesisat",
  "Asma Tavan","Yerden Isıtma","Şap","İç Boya","Parke","Seramik","Mobilya","Çelik Kapı"
];
// Form açılırları alfabetik görünmeli
const CREW_FORMS = [...new Set(CREW_ORDER)].slice().sort((a,b)=>a.localeCompare(b,"tr"));

/* =====================  Yardımcılar  ===================== */
const el  = s=>document.querySelector(s);
const els = s=>document.querySelectorAll(s);

function fillSelect(id, list, placeholder="— Seçiniz —"){
  const s = el('#'+id);
  if(!s) return;
  s.innerHTML =
    `<option value="">${placeholder}</option>` +
    list.map(v=>`<option value="${v}">${v}</option>`).join("");
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
  const day = String(d.getDate()).padStart(2,"0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/* =====================  Navigasyon  ===================== */
els(".nav-btn").forEach(btn=>{
  btn.addEventListener("click",()=>{
    els(".nav-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    const id = btn.dataset.page;
    els(".page").forEach(p=>p.classList.remove("active"));
    el("#"+id).classList.add("active");
  });
});

/* =====================  Açılırları doldur  ===================== */
fillSelect("yoklamaEkip", CREW_FORMS);
fillSelect("kayitEkip",  CREW_FORMS);
fillSelect("kayitKullanici", USERS);
fillSelect("yoklamaBlok", ALL_BLOCKS);
fillSelect("kayitBlok",   ALL_BLOCKS);
// Arşiv filtre
fillSelect("filtreEkip", ["Tümü", ...CREW_FORMS], "Ekip (Tümü)");
fillSelect("filtreBlok", ["Tümü", ...ALL_BLOCKS], "Blok (Tümü)");

/* =====================  Pafta çizim yardımcıları  ===================== */
function makeBlok(label){
  const d = document.createElement("div");
  d.className = "blok"+(label==="Sosyal"?" sosyal":"");
  d.dataset.id = label;
  d.innerHTML = `<span>${label==="Sosyal"?"SOSYAL":label}</span>${label!=="Sosyal" ? `<span class="own">${OWN[label]||""}</span>` : ""}`;
  return d;
}
function drawPaftaRows(host, idsTop=TOP, idsMid=MID, idsBot=BOT){
  // host: element (container with 3 rows inside or we create)
  host.innerHTML = `
    <div class="pafta-row r-top"></div>
    <div class="pafta-row r-mid"></div>
    <div class="pafta-row r-bot"></div>`;
  const rt = host.querySelector(".r-top");
  const rm = host.querySelector(".r-mid");
  const rb = host.querySelector(".r-bot");
  idsTop.forEach(b=>rt.appendChild(makeBlok(b)));
  idsMid.forEach(b=>rm.appendChild(makeBlok(b)));
  idsBot.forEach(b=>rb.appendChild(makeBlok(b)));
}

/* ====== Drag-scroll (tüm cihazlar) ====== */
function enableDragScroll(container){
  if(!container) return;
  container.style.overflowX = "auto";
  // Pointer
  let pDown=false, sx=0, sl=0;
  container.addEventListener("pointerdown", (e)=>{ pDown=true; sx=e.clientX; sl=container.scrollLeft; container.setPointerCapture(e.pointerId); });
  container.addEventListener("pointermove", (e)=>{ if(!pDown) return; container.scrollLeft = sl - (e.clientX - sx); });
  ["pointerup","pointercancel","pointerleave"].forEach(t=>container.addEventListener(t,()=>pDown=false));
  // Touch yön kararı (MIUI vb.)
  let tx=0, ty=0, tsl=0, decided=false, horiz=false;
  container.addEventListener("touchstart", e=>{ if(e.touches.length!==1) return; const t=e.touches[0]; tx=t.clientX; ty=t.clientY; tsl=container.scrollLeft; decided=false; horiz=false; }, {passive:true});
  container.addEventListener("touchmove", e=>{
    if(e.touches.length!==1) return;
    const t=e.touches[0]; const dx=t.clientX-tx; const dy=t.clientY-ty;
    if(!decided){ horiz = Math.abs(dx) > Math.abs(dy); decided=true; }
    if(horiz){ e.preventDefault(); container.scrollLeft = tsl - dx; }
  }, {passive:false});
  // Wheel
  container.addEventListener("wheel", e=>{
    if(Math.abs(e.deltaX) > Math.abs(e.deltaY)){ container.scrollLeft += e.deltaX; e.preventDefault(); }
  }, {passive:false});
}

/* =====================  Pano: çoklu pafta (alt alta)  ===================== */
const crewHost = el("#crewPaftaHost");
const crewPaftaRefs = new Map(); // crew -> {wrap, rows}
if (crewHost){
  CREW_ORDER.forEach((crewName)=>{
    const card = document.createElement("div");
    card.className = "crew-pafta";
    card.innerHTML = `
      <div class="crew-title"><h3>${crewName}</h3></div>
      <div class="pafta"></div>`;
    crewHost.appendChild(card);
    const wrap = card.querySelector(".pafta");
    drawPaftaRows(wrap);
    enableDragScroll(wrap);
    crewPaftaRefs.set(crewName, { wrap });
  });
}

/* =====================  Modal pafta & mini önizleme  ===================== */
// Modal (seçici)
const modalPafta = el("#modalPafta");
if (modalPafta){
  drawPaftaRows(modalPafta);
  enableDragScroll(modalPafta);
}
// Mini önizleme (Bölüm 2)
const miniWrap = el("#miniPaftaWrap");
if (miniWrap){
  drawPaftaRows(miniWrap);
  enableDragScroll(miniWrap);
}

/* =====================  Günlük Yoklama  ===================== */
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

el("#formYoklama")?.addEventListener("submit", async (e)=>{
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

/* =====================  Hızlı Kayıt  ===================== */
el("#formHizliKayit")?.addEventListener("submit", async (e)=>{
  e.preventDefault();
  const rec = {
    user: el("#kayitKullanici").value,
    crew: el("#kayitEkip").value,
    block: el("#kayitBlok").value,
    status: el("#kayitDurum").value || "Baslanmadi",
    note: el("#kayitNot").value.trim(),
    ts: serverTimestamp()
  };
  if(!rec.user||!rec.crew||!rec.block){alert("Kullanıcı, ekip ve blok zorunludur.");return;}
  await addDoc(collection(db,"fast_logs"), rec);
  el("#kayitNot").value="";
});

/* ====== Kayıtları oku + tablo ve pafta boyama ====== */
let FAST_ALL = [];

function latestClass(status){
  if(status==="Devam"||status==="Devam Ediyor"||status==="Basladi"||status==="Basladı") return "d-devam";
  if(status==="Bitti") return "d-bitti";
  if(status==="Teslim"||status==="Teslim Alındı"||status==="TeslimAlindi") return "d-teslim";
  return ""; // Başlanmadı -> boş
}
function getLatestStatusFor(block, crew){
  const rows = FAST_ALL.filter(x=>x.block===block && (!crew || x.crew===crew));
  if(!rows.length) return "";
  rows.sort((a,b)=>{
    const ta = a.ts?.toMillis?.() ?? 0;
    const tb = b.ts?.toMillis?.() ?? 0;
    return tb - ta;
  });
  return latestClass(rows[0].status);
}
function clearRowColors(wrap){
  wrap.querySelectorAll(".blok").forEach(b=>b.classList.remove("d-devam","d-bitti","d-teslim"));
}
function paintWrap(wrap, crew){
  clearRowColors(wrap);
  [...TOP,...MID,...BOT].forEach(id=>{
    const box = wrap.querySelector(`.blok[data-id="${id}"]`);
    const cls = getLatestStatusFor(id, crew);
    if(box && cls) box.classList.add(cls);
  });
}
function renderAllCrews(){
  // Pano (alt alta)
  crewPaftaRefs.forEach((ref, crew)=> paintWrap(ref.wrap, crew));
  // Mini önizleme (seçili ekip)
  const sel = el("#kayitEkip")?.value || "";
  if (miniWrap) paintWrap(miniWrap, sel || null);
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
    renderAllCrews();
  }
);

/* ====== Edit / Delete ====== */
document.addEventListener("click", async (e)=>{
  const del = e.target.closest?.("[data-del]");
  const edit = e.target.closest?.("[data-edit]");
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
    el("#kayitDurum").value    = x.status||"Baslanmadi";
    el("#kayitNot").value      = x.note||"";
    await deleteDoc(doc(db,"fast_logs", id));
    alert("Kayıt düzenleme modunda forma alındı. Kaydet ile güncel halini ekle.");
  }
});

/* ====== Modal aç/kapat + seçim ====== */
let activeTarget = null;
const openPicker  = (targetId)=>{ activeTarget = targetId; el("#modal")?.classList.add("active"); };
const closePicker = ()=>{ el("#modal")?.classList.remove("active"); activeTarget=null; };
el("#btnPaftaYoklama")?.addEventListener("click",()=>openPicker("yoklamaBlok"));
el("#btnPaftaKayit")?.addEventListener("click",()=>openPicker("kayitBlok"));
el("#btnClose")?.addEventListener("click",closePicker);
el("#modal")?.addEventListener("click",(e)=>{ if(e.target.id==="modal") closePicker(); });
modalPafta?.addEventListener("click",(ev)=>{
  const box = ev.target.closest(".blok"); if(!box||!activeTarget) return;
  const id = box.dataset.id; if(id==="Sosyal") return;
  el("#"+activeTarget).value = id;
  closePicker();
});

/* ====== Form değişimleri ====== */
el("#kayitEkip")?.addEventListener("change", ()=> renderAllCrews());
el("#filtreEkip")?.addEventListener("change", ()=> renderTable());
el("#filtreBlok")?.addEventListener("change", ()=> renderTable());
el("#btnFiltreTemizle")?.addEventListener("click", ()=>{
  if(el("#filtreEkip")) el("#filtreEkip").value = "";
  if(el("#filtreBlok")) el("#filtreBlok").value = "";
  renderTable();
});

/* =====================  İcmal (yalnız tablo + paftaların durumu)  ===================== */
function buildIcmalHTML(){
  const totalBlocks = ALL_BLOCKS.length;

  const rows = CREW_ORDER.map(t=>{
    const done = ALL_BLOCKS
      .map(b=>getLatestStatusFor(b, t))
      .filter(cls=>cls==="d-bitti"||cls==="d-teslim").length;
    const percent = totalBlocks ? (done/totalBlocks*100) : 0;
    return `<tr>
      <td style="padding:8px;border:1px solid #bbb">${t}</td>
      <td style="padding:8px;border:1px solid #bbb;text-align:center">${totalBlocks}</td>
      <td style="padding:8px;border:1px solid #bbb;text-align:center">${done}</td>
      <td style="padding:8px;border:1px solid #bbb;text-align:center"><b>%${percent.toFixed(1)}</b> <span style="color:#666">(${done}/${totalBlocks})</span></td>
    </tr>`;
  }).join("");

  const avg = (()=>{
    const list = CREW_ORDER.map(t=>{
      const done = ALL_BLOCKS
        .map(b=>getLatestStatusFor(b, t))
        .filter(cls=>cls==="d-bitti"||cls==="d-teslim").length;
      return totalBlocks ? (done/totalBlocks*100) : 0;
    });
    return list.reduce((a,b)=>a+b,0)/(list.length||1);
  })();

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
  el("#printTable").innerHTML = buildIcmalHTML();
  window.print(); // Sadece tek sayfalık icmal çıktısı
});

/* =====================  Başlat  ===================== */
(function init(){
  // Pano ve modal/mini zaten çizildi; kayıtlar gelince boyanacak.
  // Eski SW cache’lerinde takılanlar için ufak log:
  console.log("Şantiye v1.6.1 app.js yüklendi");
})();
