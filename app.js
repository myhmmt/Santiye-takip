import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

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

/* Sabitler */
const CREWS = ["Mekanik","Elektrik","Çatı (Kereste)","Çatı (Kiremit)","Çatı (Oluk)","Denizlik","Parke","Seramik","Boya","TG5","PVC","Kör Kasa","Şap","Dış Cephe","Makina Alçı","Saten Alçı","Kaba Sıva (İç)","Yerden Isıtma","Asma Tavan","Klima Tesisat","Mobilya","Çelik Kapı","Korkuluk"];
const USERS = ["Muhammet","Harun","Metin","Mert","Fuat","Furkan","Misafir"];
const TOP = ["AC","AD","AE","AF","AG","AH","AI","AJ","AK","AL","AM","AN"];
const MID = ["AB","Y","V","S","R","P","O","N","M","L","K","J","I"];
const BOT = ["AA","Z","U","T","Sosyal","A","B","C","D","E","F","G","H"];
const OWN = {}; const asSet = new Set(["AC","AE","AG","AI","AK","AM","AB","V","R","O","M","K","I","AA","U","A","C","E","G"]);
[...TOP,...MID,...BOT].forEach(b=>OWN[b]= asSet.has(b) ? "AS" : (b==="Sosyal"?"":"MÜT"));

/* helpers */
const el = s=>document.querySelector(s);
const els = s=>document.querySelectorAll(s);
const ALL_BLOCKS = [...TOP, ...MID.filter(x=>"Sosyal"!==x), ...BOT.filter(x=>"Sosyal"!==x)];
function fillSelect(id, list, placeholder="— Seçiniz —"){
  const s = el('#'+id);
  s.innerHTML = `<option value="">${placeholder}</option>` + list.map(v=>`<option value="${v}">${v}</option>`).join("");
}
function formatDateFromTS(ts){ if(!ts) return "-"; const d = ts.toDate ? ts.toDate() : new Date(ts); return d.toLocaleDateString("tr-TR",{day:"2-digit",month:"2-digit",year:"numeric"})+" "+d.toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"}); }
function todayKey(){ const d=new Date(),m=(d.getMonth()+1+"").padStart(2,"0"),day=(d.getDate()+"").padStart(2,"0"); return `${d.getFullYear()}-${m}-${day}`; }

/* nav */
els(".nav-btn").forEach(btn=>{
  btn.addEventListener("click",()=>{
    els(".nav-btn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    const id = btn.dataset.page;
    els(".page").forEach(p=>p.classList.remove("active"));
    el("#"+id).classList.add("active");
  });
});

/* selects */
fillSelect("yoklamaEkip", CREWS);
fillSelect("kayitEkip", CREWS);
fillSelect("panoEkipFiltre", CREWS, "Tüm Ekipler (Genel)");
fillSelect("kayitKullanici", USERS);
fillSelect("yoklamaBlok", ALL_BLOCKS);
fillSelect("kayitBlok", ALL_BLOCKS);
fillSelect("filtreEkip", ["Tümü", ...CREWS], "Ekip (Tümü)");
fillSelect("filtreBlok", ["Tümü", ...ALL_BLOCKS], "Blok (Tümü)");

/* pafta draw */
function makeBlok(label){
  const div = document.createElement("div");
  div.className = "blok"+(label==="Sosyal"?" sosyal":"");
  div.dataset.id = label;
  div.innerHTML = `<span>${label==="Sosyal"?"SOSYAL":label}</span>${label!=="Sosyal"?`<span class="own">${OWN[label]||""}</span>`:""}`;
  return div;
}
function drawPafta(sel, arr){ const row = el(sel); row.innerHTML=""; arr.forEach(b=>row.appendChild(makeBlok(b))); }
drawPafta("#row-top", TOP); drawPafta("#row-mid", MID); drawPafta("#row-bot", BOT);
drawPafta("#m-top", TOP);  drawPafta("#m-mid", MID);  drawPafta("#m-bot", BOT);

/* yoklama write */
el("#formYoklama").addEventListener("submit", async (e)=>{
  e.preventDefault();
  const crew=el("#yoklamaEkip").value, count=parseInt(el("#yoklamaKisi").value||"0",10), block=el("#yoklamaBlok").value, note=el("#yoklamaNot").value.trim();
  if(!crew||!count||!block){alert("Ekip, kişi sayısı ve blok zorunludur.");return;}
  await addDoc(collection(db,"daily_attendance", todayKey(), "entries"), {crew,count,block,note,user:"Sistem",ts:serverTimestamp()});
  el("#yoklamaKisi").value=""; el("#yoklamaNot").value="";
});

/* yoklama read + düzenle/sil */
function renderDaily(entries){
  const ul = el("#yoklamaListesi");
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
onSnapshot(query(collection(db,"daily_attendance", todayKey(), "entries"), orderBy("ts","desc")), snap=>{
  renderDaily(snap.docs.map(d=>({id:d.id, ...d.data()})));
});

/* hızlı kayıt write */
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

/* hızlı kayıt read/paint/filter */
let FAST_ALL=[];
const statusClass = s=>{
  if(s==="Devam"||s==="Devam Ediyor"||s==="Basladi") return "d-devam";
  if(s==="Bitti") return "d-bitti";
  if(s==="Teslim"||s==="Teslim Alındı"||s==="TeslimAlindi") return "d-teslim";
  return "";
};
function getLatestStatusFor(block, crew){
  const rows = FAST_ALL.filter(x=>x.block===block && (!crew || x.crew===crew));
  if(!rows.length) return "";
  rows.sort((a,b)=> (b.ts?.toMillis?.() ?? 0) - (a.ts?.toMillis?.() ?? 0));
  return statusClass(rows[0].status);
}
function clearStatus(elm){ elm.classList.remove("d-devam","d-bitti","d-teslim"); }
function paintRow(sel, arr, crew){
  const row = el(sel);
  row.querySelectorAll(".blok").forEach(clearStatus);
  arr.forEach(id=>{
    const box = row.querySelector(`.blok[data-id="${id}"]`);
    const cls = getLatestStatusFor(id, crew);
    if(box && cls) box.classList.add(cls);
  });
}
function renderPafta(){
  const crew = el("#panoEkipFiltre").value || "";
  paintRow("#row-top", TOP, crew);
  paintRow("#row-mid", MID, crew);
  paintRow("#row-bot", BOT, crew);
}
function matchFilter(x){
  const fe = el("#filtreEkip").value, fb = el("#filtreBlok").value;
  const okE = !fe || fe==="Tümü" || x.crew===fe;
  const okB = !fb || fb==="Tümü" || x.block===fb;
  return okE && okB;
}
function renderTable(){
  const tbody = el("#arsivBody");
  const rows = FAST_ALL.filter(matchFilter);
  tbody.innerHTML = rows.length ? rows.map(x=>`
    <tr>
      <td>${formatDateFromTS(x.ts)}</td>
      <td>${x.user}</td>
      <td>${x.crew}</td>
      <td>${x.block}</td>
      <td><b>${x.status}</b></td>
      <td>${x.note||"-"}</td>
      <td>
        <button class="btn btn-secondary btn-icon" data-edit="${x.id}"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-icon" style="background:#ffe6e6;color:#c62828" data-del="${x.id}"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`).join("") : `<tr><td colspan="7" style="padding:14px;text-align:center;color:#666">Kayıt yok</td></tr>`;
}
onSnapshot(query(collection(db,"fast_logs"), orderBy("ts","desc")), snap=>{
  FAST_ALL = snap.docs.map(d=>({id:d.id, ...d.data()}));
  renderPafta(); renderTable();
});

/* edit/delete (fast + attendance) */
document.addEventListener("click", async (e)=>{
  const del = e.target.closest("[data-del]"); const edit = e.target.closest("[data-edit]");
  const delAtt = e.target.closest("[data-del-att]"); const editAtt = e.target.closest("[data-edit-att]");
  if(del){ await deleteDoc(doc(db,"fast_logs", del.getAttribute("data-del"))); }
  if(edit){
    const id = edit.getAttribute("data-edit"); const x = FAST_ALL.find(r=>r.id===id); if(!x) return;
    el("#kayitKullanici").value=x.user||""; el("#kayitEkip").value=x.crew||""; el("#kayitBlok").value=x.block||""; el("#kayitDurum").value=x.status||"Basladi"; el("#kayitNot").value=x.note||"";
    await deleteDoc(doc(db,"fast_logs", id));
    alert("Kayıt düzenleme modunda forma alındı. Kaydet ile güncelle.");
  }
  if(delAtt){
    const id = delAtt.getAttribute("data-del-att");
    await deleteDoc(doc(collection(db,"daily_attendance", todayKey(), "entries"), id));
  }
  if(editAtt){
    // pratik: siliyoruz ve forma dolduruyoruz
    const id = editAtt.getAttribute("data-edit-att");
    // yoklamayı Firestore'dan çekmeye gerek yok; listede veri yok
    alert("Yoklama kaydını doğrudan düzenlemek yerine, silip yeniden girin (kısa yol).");
  }
});

/* modal: Paftadan Seç – stabil */
let activeTarget = null;
const openPicker = (targetId)=>{ activeTarget = targetId; el("#modal").classList.add("active"); };
const closePicker = ()=>{ el("#modal").classList.remove("active"); activeTarget=null; };
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

/* pano/filtre tetik */
el("#panoEkipFiltre").addEventListener("change", renderPafta);
el("#filtreEkip").addEventListener("change", renderTable);
el("#filtreBlok").addEventListener("change", renderTable);
el("#btnFiltreTemizle").addEventListener("click", ()=>{ el("#filtreEkip").value=""; el("#filtreBlok").value=""; renderTable(); });

/* İcmal (sadece hızlı kayıt) */
function buildIcmalHTML(){
  const total = ALL_BLOCKS.length;
  const rows = CREWS.map(t=>{
    const done = ALL_BLOCKS.map(b=>getLatestStatusFor(b,t)).filter(c=>c==="d-bitti"||c==="d-teslim").length;
    const pct = total ? (done/total*100) : 0;
    return `<tr><td style="padding:8px;border:1px solid #bbb">${t}</td>
      <td style="padding:8px;border:1px solid #bbb;text-align:center">${total}</td>
      <td style="padding:8px;border:1px solid #bbb;text-align:center">${done}</td>
      <td style="padding:8px;border:1px solid #bbb;text-align:center"><b>%${pct.toFixed(1)}</b> <span style="color:#666">(${done}/${total})</span></td></tr>`;
  }).join("");
  const avg = CREWS.reduce((s,t)=>{const d=ALL_BLOCKS.map(b=>getLatestStatusFor(b,t)).filter(c=>c==="d-bitti"||c==="d-teslim").length; return s + (total?d/total*100:0);},0)/CREWS.length;
  return `<table style="width:100%;border-collapse:collapse;font-size:14px">
  <thead><tr style="background:#f1f5f9"><th style="padding:10px;border:1px solid #bbb;text-align:left">İMALAT KALEMİ</th><th style="padding:10px;border:1px solid #bbb">YAPILACAK BLOK</th><th style="padding:10px;border:1px solid #bbb">YAPILAN BLOK</th><th style="padding:10px;border:1px solid #bbb">İLERLEME</th></tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr style="background:#f9fafb;font-weight:700"><td style="padding:10px;border:1px solid #bbb">GENEL ORTALAMA</td><td style="padding:10px;border:1px solid #bbb;text-align:center" colspan="3"><b>%${avg.toFixed(1)}</b></td></tr></tfoot></table>`;
}
el("#btnPdfIcmal").addEventListener("click",()=>{ el("#printTable").innerHTML = buildIcmalHTML(); window.print(); });

/* Ana pafta yardımcı oklar (native scroll kullan) */
const wrapper = document.querySelector('#projePaftasi');
wrapper?.querySelector('.scroll-arrow.left')?.addEventListener('click', ()=> wrapper.querySelector('.pafta').scrollBy({left:-200,behavior:'smooth'}));
wrapper?.querySelector('.scroll-arrow.right')?.addEventListener('click', ()=> wrapper.querySelector('.pafta').scrollBy({left:200,behavior:'smooth'}));

/* Başlangıç */
renderPafta();
