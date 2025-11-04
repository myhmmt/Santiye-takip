// app.js — FULL (paftayı canlı veriye bağlayan sürüm)

document.addEventListener('DOMContentLoaded', () => {
  // ------ SABİT LİSTELER ------
  const EKIP_LISTESI = [
    "Mekanik","Elektrik","Çatı (Kereste)","Çatı (Kiremit)","Çatı (Oluk)",
    "Denizlik","Parke","Seramik","Boya","TG5","PVC","Kör Kasa","Şap",
    "Dış Cephe","Makina Alçı","Saten Alçı","Kaba Sıva (İç)","Yerden Isıtma",
    "Asma Tavan","Klima Tesisat","Mobilya","Çelik Kapı","Korkuluk"
  ];

  const KULLANICI_LISTESI = [
    "Muhammet","Harun","Metin","Mert","Fuat","Furkan","Misafir"
  ];

  const BLOK_LISTESI = [
    "AC","AD","AE","AF","AG","AH","AI","AJ","AK","AL","AM","AN",
    "AB","Y","V","S","R","P","O","N","M","L","K","J","I",
    "AA","Z","U","T","A","B","C","D","E","F","G","H"
  ];

  // ------ YARDIMCI: select doldur ------
  function populateSelect(selectId, list, defaultOptionText) {
    const el = document.getElementById(selectId);
    if (!el) return;
    el.innerHTML = `<option value="">${defaultOptionText ?? '-- Seçiniz --'}</option>`;
    list.forEach(v => el.insertAdjacentHTML('beforeend', `<option value="${v}">${v}</option>`));
  }

  // Formlardaki açılırlar
  populateSelect('yoklamaEkip', EKIP_LISTESI);
  populateSelect('kayitEkip', EKIP_LISTESI);
  populateSelect('panoEkipFiltre', EKIP_LISTESI, 'Tüm Ekipler (Genel Bakış)');
  populateSelect('kayitKullanici', KULLANICI_LISTESI);
  populateSelect('yoklamaBlok', BLOK_LISTESI);
  populateSelect('kayitBlok', BLOK_LISTESI);

  // ------ SAYFA GEÇİŞLERİ ------
  const navButtons = document.querySelectorAll('.nav-btn');
  const pages = document.querySelectorAll('.page');
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.page;
      pages.forEach(p => p.classList.remove('active'));
      navButtons.forEach(b => b.classList.remove('active'));
      document.getElementById(target)?.classList.add('active');
      btn.classList.add('active');
    });
  });

  // =========================================================
  //           CANLI PAF TA BAĞLANTISI (LOCALSTORAGE)
  // =========================================================
  // Ekip+Blok -> Durum haritası
  const durumHaritasi = JSON.parse(localStorage.getItem('durumHaritasi') || '{}');

  function setDurum(ekip, blok, durum) {
    if (!ekip || !blok || !durum) return;
    durumHaritasi[`${ekip}::${blok}`] = durum;                 // örn: "Elektrik::AC" -> "Bitti"
    localStorage.setItem('durumHaritasi', JSON.stringify(durumHaritasi));
  }
  function getDurum(ekip, blok) {
    return durumHaritasi[`${ekip}::${blok}`] || '';
  }

  // ------ Hızlı Kayıt Submit ------
  const formHizliKayit = document.getElementById('formHizliKayit');
  formHizliKayit?.addEventListener('submit', (e) => {
    e.preventDefault();
    const user  = document.getElementById('kayitKullanici').value;
    const ekip  = document.getElementById('kayitEkip').value;
    const blok  = document.getElementById('kayitBlok').value;
    const durum = document.getElementById('kayitDurum').value;
    const notx  = document.getElementById('kayitNot').value.trim();

    if (!user || !ekip || !blok || !durum) {
      alert('Lütfen kullanıcı, ekip, blok ve durum seçiniz.');
      return;
    }

    // 1) Arşive ekle
    const arsiv = JSON.parse(localStorage.getItem('hk_arsiv') || '[]');
    arsiv.unshift({
      ts: Date.now(),
      tarih: new Date().toLocaleDateString('tr-TR'),
      user, ekip, blok, durum, not: notx
    });
    localStorage.setItem('hk_arsiv', JSON.stringify(arsiv));

    // 2) Pafta durumunu güncelle
    setDurum(ekip, blok, durum);

    // 3) UI yenile
    renderPafta();
    renderArsiv();

    alert('Kayıt eklendi ve pafta güncellendi.');
    formHizliKayit.reset();
  });

  // ------ PAF TA RENDER ------
  const panoFiltre = document.getElementById('panoEkipFiltre');
  const paftaBloklari = document.querySelectorAll('#projePaftasi .blok:not(.sosyal-tesis)');

  panoFiltre?.addEventListener('change', renderPafta);

  function renderPafta() {
    const seciliEkip = panoFiltre?.value || '';

    paftaBloklari.forEach(blokEl => {
      blokEl.classList.remove('durum-devam','durum-bitti','durum-teslim');
      const blok = blokEl.dataset.blokId;

      if (!seciliEkip) return; // "Tüm Ekipler" -> renksiz bırak

      const durum = getDurum(seciliEkip, blok);

      if (durum === 'Devam') {
        blokEl.classList.add('durum-devam');
      } else if (durum === 'Bitti') {
        blokEl.classList.add('durum-bitti');
      } else if (durum === 'TeslimAlindi') {
        blokEl.classList.add('durum-teslim');
      }
      // "Basladi" ya da boş -> nötr
    });
  }

  // ------ ARŞİV TABLOSU (yerel) ------
  function renderArsiv() {
    const tbody = document.querySelector('#arsivTablosu tbody');
    if (!tbody) return;
    const arsiv = JSON.parse(localStorage.getItem('hk_arsiv') || '[]');

    tbody.innerHTML = arsiv.map(r => `
      <tr>
        <td>${r.tarih}</td>
        <td>${r.user}</td>
        <td>${r.ekip}</td>
        <td>${r.blok}</td>
        <td><span class="durum-badge durum-${r.durum}">${r.durum}</span></td>
        <td>
          <button class="btn-icon" data-edit="${r.ts}"><i class="fas fa-edit"></i></button>
          <button class="btn-icon" data-del="${r.ts}"><i class="fas fa-trash"></i></button>
        </td>
      </tr>
    `).join('');
  }

  // Silme (basit)
  document.addEventListener('click', (e) => {
    const delBtn = e.target.closest('[data-del]');
    if (delBtn) {
      const ts = delBtn.dataset.del;
      let arsiv = JSON.parse(localStorage.getItem('hk_arsiv') || '[]');
      const rec = arsiv.find(x => String(x.ts) === String(ts));
      // Paftayı da geri al: bu kayıt en güncelse null yapabiliriz (basit yaklaşım)
      if (rec) {
        // Bu ekip-blok için en güncel başka kayıt varsa onu uygula, yoksa temizle
        const kalan = arsiv.filter(x => !(x.ekip===rec.ekip && x.blok===rec.blok && x.ts===rec.ts));
        const enYeni = kalan.find(x => x.ekip===rec.ekip && x.blok===rec.blok);
        if (enYeni) setDurum(enYeni.ekip, enYeni.blok, enYeni.durum);
        else {
          delete durumHaritasi[`${rec.ekip}::${rec.blok}`];
          localStorage.setItem('durumHaritasi', JSON.stringify(durumHaritasi));
        }
        arsiv = kalan;
      } else {
        arsiv = arsiv.filter(x => String(x.ts) !== String(ts));
      }
      localStorage.setItem('hk_arsiv', JSON.stringify(arsiv));
      renderArsiv();
      renderPafta();
    }
  });

  // İlk çizimler
  renderPafta();
  renderArsiv();

  // ------ (Opsiyonel) Yoklama formu dummy ------
  const formYoklama = document.getElementById('formYoklama');
  formYoklama?.addEventListener('submit', (e) => {
    e.preventDefault();
    // Basit demo: listeye ekle
    const ekip = document.getElementById('yoklamaEkip').value;
    const sayi = document.getElementById('yoklamaKisi').value;
    const blok = document.getElementById('yoklamaBlok').value;
    const notx = document.getElementById('yoklamaNot').value.trim();

    if (!ekip || !sayi || !blok) {
      alert('Yoklama için ekip, kişi sayısı ve blok seçiniz.');
      return;
    }
    const li = document.createElement('li');
    li.textContent = `${ekip} - ${sayi} Kişi - ${blok}${notx ? ' - ' + notx : ''}`;
    document.getElementById('yoklamaListesi').prepend(li);
    formYoklama.reset();
  });
});
// ====== İCMAL PDF ======
(function setupIcmalPdf() {
  const btn = document.getElementById('btnPdfIcmal');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });

    // Veriyi hazırla
    const TOTAL_BLOCKS = BLOK_LISTESI.length; // 38
    const rows = [];
    let toplamYuzde = 0;
    let sayac = 0;

    EKIP_LISTESI.forEach(ekip => {
      // Bu ekipte “Bitti” veya “TeslimAlindi” olan blokları say
      let bitti = 0;
      BLOK_LISTESI.forEach(blok => {
        const d = getDurum(ekip, blok);
        if (d === 'Bitti' || d === 'TeslimAlindi') bitti++;
      });

      const yuzde = TOTAL_BLOCKS ? Math.round((bitti / TOTAL_BLOCKS) * 100) : 0;
      rows.push([
        ekip,                       // İmalat Kalemi
        `${TOTAL_BLOCKS} Blok`,     // Yapılacak İmalat
        `${bitti} Blok`,            // Yapılan İmalat
        `%${yuzde}`                 // İlerleme Yüzdesi
      ]);

      toplamYuzde += yuzde;
      sayac++;
    });

    const genelOrtalama = sayac ? Math.round(toplamYuzde / sayac) : 0;

    // Başlık
    const today = new Date().toLocaleDateString('tr-TR');
    doc.setFontSize(16);
    doc.text('ŞANTİYE İLERLEME İCMALİ', 40, 40);
    doc.setFontSize(10);
    doc.text(`Tarih: ${today}`, 40, 58);

    // Tablo
    doc.autoTable({
      startY: 80,
      head: [['SIRA NO', 'İMALAT KALEMİ', 'YAPILACAK İMALAT', 'YAPILAN İMALAT', 'İLERLEME YÜZDESİ']],
      body: rows.map((r, i) => [i + 1, ...r]),
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [13, 71, 161], halign: 'center', valign: 'middle', textColor: 255 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 60 },
        1: { cellWidth: 180 },
        2: { halign: 'center', cellWidth: 120 },
        3: { halign: 'center', cellWidth: 120 },
        4: { halign: 'center', cellWidth: 120 }
      }
    });

    // Genel Ortalama kutusu
    const y = doc.lastAutoTable.finalY + 20;
    doc.setLineWidth(0.7);
    doc.rect(40, y, 515, 40);
    doc.setFontSize(12);
    doc.text('GENEL ORTALAMA', 50, y + 25);
    doc.setFontSize(14);
    doc.text(`%${genelOrtalama}`, 520, y + 25, { align: 'right' });

    // Kaydet
    doc.save(`Icmal_${today}.pdf`);
  });
})();
