document.addEventListener('DOMContentLoaded', () => {
  /* ---------- SABİT LİSTELER ---------- */
  const EKIP_LISTESI = [
    "Mekanik","Elektrik","Çatı (Kereste)","Çatı (Kiremit)","Çatı (Oluk)",
    "Denizlik","Parke","Seramik","Boya","TG5","PVC","Kör Kasa","Şap",
    "Dış Cephe","Makina Alçı","Saten Alçı","Kaba Sıva (İç)","Yerden Isıtma",
    "Asma Tavan","Klima Tesisat","Mobilya","Çelik Kapı","Korkuluk"
  ];
  const KULLANICI_LISTESI = ["Muhammet","Harun","Metin","Mert","Fuat","Furkan","Misafir"];
  const BLOK_LISTESI = [
    "AC","AD","AE","AF","AG","AH","AI","AJ","AK","AL","AM","AN",
    "AB","Y","V","S","R","P","O","N","M","L","K","J","I",
    "AA","Z","U","T","A","B","C","D","E","F","G","H"
  ];

  /* ---------- BLOK SAHİPLİK HARİTASI (yazı etiketi) ---------- */
  const OWNER_MAP = BLOK_LISTESI.reduce((acc, b) => (acc[b] = "Müteahhit", acc), {});
  OWNER_MAP["R"] = "Patron";
  // Arsa Sahibine ait 16 blok (senin verdiğin liste)
  ["AC","AD","AH","AI","AJ","Y","P","O","N","J","I","Z","A","B","C","H"]
    .forEach(b => OWNER_MAP[b] = "Arsa Sahibi");

  /* ---------- KÜÇÜK ARAÇLAR ---------- */
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);
  const todayKey = () => new Date().toISOString().slice(0,10); // YYYY-MM-DD
  const fmtDateTime = (d=new Date()) => {
    const p=(n)=> (n<10?'0':'')+n;
    return `${p(d.getDate())}.${p(d.getMonth()+1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  const flashMsg = (sel, text) => {
    const el = $(sel); if(!el) return;
    el.textContent = text; el.style.opacity='1';
    setTimeout(()=>{el.style.opacity='0.6';},1500);
    setTimeout(()=>{el.textContent=''; el.style.opacity='1';},3000);
  };

  /* ---------- SELECT DOLDURUCULAR ---------- */
  function populateSelect(selectId, list, placeholder="-- Seçiniz --"){
    const el = $(`#${selectId}`); if(!el) return;
    el.innerHTML = `<option value="">${placeholder}</option>` + list.map(v=>`<option value="${v}">${v}</option>`).join("");
  }
  populateSelect('yoklamaEkip', EKIP_LISTESI);
  populateSelect('kayitEkip', EKIP_LISTESI);
  populateSelect('kayitKullanici', KULLANICI_LISTESI);
  populateSelect('yoklamaBlok', BLOK_LISTESI);
  populateSelect('kayitBlok', BLOK_LISTESI);
  populateSelect('filtreBlok', ["(Hepsi)", ...BLOK_LISTESI], "Blok seç");
  populateSelect('panoEkipFiltre', EKIP_LISTESI, 'Tüm Ekipler (Genel Bakış)');

  /* ---------- NAV (sekme) ---------- */
  const navButtons = $$('.nav-btn');
  const pages = $$('.page');
  navButtons.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.page;
      pages.forEach(p=>p.classList.remove('active'));
      navButtons.forEach(b=>b.classList.remove('active'));
      $(`#${id}`).classList.add('active');
      btn.classList.add('active');
    });
  });

  /* ---------- SAHİPLİK ETİKETLERİ (pano) ---------- */
  const addOwnerTags = (rootSel) => {
    $$(rootSel + ' .blok:not(.sosyal-tesis)').forEach(el=>{
      if(el.querySelector('.owner-tag')) return; // tekrar ekleme
      const id = el.dataset.blokId;
      const tag = document.createElement('div');
      tag.className = 'owner-tag';
      tag.textContent = OWNER_MAP[id] || '—';
      el.appendChild(tag);
    });
  };
  addOwnerTags('#projePaftasi');
  addOwnerTags('#modalPafta');

  /* ---------- PAFTA MODAL ---------- */
  const modal = $('#paftaModal');
  let paftaTargetSelectId = null;

  const openModal = (targetSelectId) => {
    paftaTargetSelectId = targetSelectId;
    modal.classList.add('open');
  };
  const closeModal = () => {
    modal.classList.remove('open');
    paftaTargetSelectId = null;
  };

  // Modal kapatma
  $$('.modal-close, .modal-backdrop').forEach(el=>{
    el.addEventListener('click', ()=> closeModal());
  });

  // “Paftadan Seç” butonları
  $$('.btn-pafta').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const target = btn.dataset.target; // yoklamaBlok | kayitBlok
      openModal(target);
    });
  });

  // Select’lere tıklayınca da modal aç (istenen davranış)
  ['yoklamaBlok','kayitBlok'].forEach(id=>{
    const sel = $(`#${id}`);
    // Mobilde native dropdown açılmasına izin veriyoruz ama önce modal açıyoruz
    sel.addEventListener('mousedown', (e)=>{ e.preventDefault(); openModal(id); });
    sel.addEventListener('focus', (e)=>{ /* klavye gezginleri için */ openModal(id); });
  });

  // Modal pafta içinde blok seçimi → hedef select’e yaz & modalı kapa
  $$('#modalPafta .blok:not(.sosyal-tesis)').forEach(el=>{
    el.addEventListener('click', ()=>{
      const id = el.dataset.blokId;
      if(paftaTargetSelectId){
        const sel = $(`#${paftaTargetSelectId}`);
        if (sel){
          sel.value = id;
          // hangi formdaysak mesaj göster
          if(paftaTargetSelectId==='yoklamaBlok') flashMsg('#yoklamaMsg', `${id} blok seçildi.`);
          if(paftaTargetSelectId==='kayitBlok')   flashMsg('#kayitMsg',   `${id} blok seçildi.`);
        }
      }
      closeModal();
    });
  });

  /* ---------- PANO BLOK TIK → formda blok seçme ---------- */
  $$('#projePaftasi .blok:not(.sosyal-tesis)').forEach(el=>{
    el.addEventListener('click', ()=>{
      const id = el.dataset.blokId;
      const activePage = $('.page.active')?.id;
      if (activePage === 'bolum1') {
        $('#yoklamaBlok').value = id;
        flashMsg('#yoklamaMsg', `${id} blok seçildi.`);
      } else if (activePage === 'bolum2') {
        $('#kayitBlok').value = id;
        flashMsg('#kayitMsg', `${id} blok seçildi.`);
      } else {
        $('[data-page="bolum2"]').click();
        $('#kayitBlok').value = id;
        flashMsg('#kayitMsg', `${id} blok seçildi.`);
      }
    });
  });

  /* ---------- BÖLÜM 1: GÜNLÜK YOKLAMA ---------- */
  const YOKLAMA_KEY_PREFIX = 'yoklama_'; // yoklama_YYYY-MM-DD
  const loadYoklama = (dk=todayKey()) => JSON.parse(localStorage.getItem(YOKLAMA_KEY_PREFIX + dk)||'[]');
  const saveYoklama = (arr, dk=todayKey()) => localStorage.setItem(YOKLAMA_KEY_PREFIX + dk, JSON.stringify(arr));

  function renderYoklama(){
    const list = loadYoklama();
    const ul = $('#yoklamaListesi');
    ul.innerHTML = '';
    if (!list.length){
      ul.innerHTML = '<li class="muted">Bugün için kayıt yok.</li>';
      return;
    }
    list.forEach(item=>{
      const li = document.createElement('li');
      li.textContent = `${item.ekip} – ${item.kisi} kişi – ${item.blok}` + (item.not?` — ${item.not}`:'');
      ul.appendChild(li);
    });
  }
  renderYoklama();

  $('#formYoklama').addEventListener('submit', (e)=>{
    e.preventDefault();
    const ekip = $('#yoklamaEkip').value;
    const kisi = parseInt($('#yoklamaKisi').value||'0',10);
    const blok = $('#yoklamaBlok').value;
    const not  = $('#yoklamaNot').value.trim();

    if (!ekip) return flashMsg('#yoklamaMsg','Ekip seçiniz.');
    if (!kisi || kisi<1) return flashMsg('#yoklamaMsg','Kişi sayısı 1 veya daha büyük olmalı.');
    if (!blok) return flashMsg('#yoklamaMsg','Blok seçiniz.');

    const list = loadYoklama();
    list.push({ekip,kisi,blok,not,ts:Date.now()});
    saveYoklama(list);
    $('#formYoklama').reset();
    renderYoklama();
    flashMsg('#yoklamaMsg','Günlük yoklama kaydedildi.');
  });

  /* ---------- BÖLÜM 2: HIZLI KAYIT ---------- */
  const HK_KEY = 'hizliKayit_list';
  const loadHK = () => JSON.parse(localStorage.getItem(HK_KEY)||'[]');
  const saveHK = (arr) => localStorage.setItem(HK_KEY, JSON.stringify(arr));
  const nextIdHK = () => loadHK().reduce((m,x)=>Math.max(m,x.id||0),0)+1;

  function etiketDurum(k){
    if (k==="Basladi") return "Başladı";
    if (k==="Devam") return "Devam";
    if (k==="Bitti") return "Bitti";
    if (k==="TeslimAlindi") return "Teslim Alındı";
    return k;
  }
  const escapeHtml = (s) => s.replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));

  function renderHK(){
    const tbody = $('#arsivTablosu tbody');
    const arr = loadHK();
    const fb = $('#filtreBlok').value;
    const filtered = (!fb || fb==="(Hepsi)") ? arr : arr.filter(r=>r.blok===fb);

    tbody.innerHTML = '';
    if (!filtered.length){
      tbody.innerHTML = `<tr><td colspan="7" class="muted">Gösterilecek kayıt yok.</td></tr>`;
      return;
    }
    filtered.sort((a,b)=>b.ts-a.ts).forEach(rec=>{
      const tr = document.createElement('tr');
      tr.dataset.id = rec.id;
      tr.innerHTML = `
        <td>${rec.tarih}</td>
        <td>${rec.kullanici}</td>
        <td>${rec.ekip}</td>
        <td>${rec.blok}</td>
        <td><span class="durum-badge durum-${rec.durum}">${etiketDurum(rec.durum)}</span></td>
        <td>${rec.not?escapeHtml(rec.not):""}</td>
        <td>
          <button class="btn-icon btn-edit" title="Düzenle"><i class="fas fa-edit"></i></button>
          <button class="btn-icon btn-del" title="Sil"><i class="fas fa-trash"></i></button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }
  renderHK();

  $('#formHizliKayit').addEventListener('submit', (e)=>{
    e.preventDefault();
    const kullanici = $('#kayitKullanici').value;
    const ekip = $('#kayitEkip').value;
    const blok = $('#kayitBlok').value;
    const durum = $('#kayitDurum').value;
    const not = $('#kayitNot').value.trim();

    if (!kullanici) return flashMsg('#kayitMsg','Kullanıcı seçiniz.');
    if (!ekip) return flashMsg('#kayitMsg','Ekip seçiniz.');
    if (!blok) return flashMsg('#kayitMsg','Blok seçiniz.');

    const now = new Date();
    const rec = {
      id: nextIdHK(),
      tarih: fmtDateTime(now).split(' ').slice(0,2).join(' '),
      ts: now.getTime(),
      kullanici, ekip, blok, durum, not
    };
    const arr = loadHK();
    arr.push(rec); saveHK(arr);
    $('#formHizliKayit').reset();
    renderHK();
    flashMsg('#kayitMsg','Kayıt eklendi.');
  });

  // Düzenle / Sil
  $('#arsivTablosu').addEventListener('click', (e)=>{
    const btn = e.target.closest('button'); if(!btn) return;
    const tr = e.target.closest('tr'); const id = parseInt(tr?.dataset.id||'0',10); if(!id) return;
    const arr = loadHK(); const idx = arr.findIndex(x=>x.id===id); if(idx<0) return;

    if (btn.classList.contains('btn-del')){
      if (confirm('Bu kaydı silmek istiyor musunuz?')){
        arr.splice(idx,1); saveHK(arr); renderHK();
      }
      return;
    }

    if (btn.classList.contains('btn-edit')){
      const cur = arr[idx];
      const yeniDurum = prompt("Yeni durum (Basladi/Devam/Bitti/TeslimAlindi):", cur.durum) || cur.durum;
      const yeniNot = prompt("Not (boş bırakabilirsiniz):", cur.not||"") ?? cur.not;
      const okSet = new Set(["Basladi","Devam","Bitti","TeslimAlindi"]);
      if (!okSet.has(yeniDurum)){ alert("Geçersiz durum girdiniz."); return; }
      arr[idx] = {...cur, durum:yeniDurum, not:yeniNot};
      saveHK(arr); renderHK();
    }
  });

  // Filtre
  $('#filtreBlok').addEventListener('change', renderHK);
  $('#filtreTemizle').addEventListener('click', ()=>{
    $('#filtreBlok').value = ""; renderHK();
  });

  /* ---------- PANO DEMO FİLTRE ---------- */
  $('#panoEkipFiltre').addEventListener('change', ()=>{
    // Şimdilik görsel işaretleme eklemiyoruz.
  });
});
