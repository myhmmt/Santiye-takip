// app.js

document.addEventListener('DOMContentLoaded', () => {

    // --- VERİ LİSTELERİ ---
    // (Firebase'den çekilecek verilerin simülasyonu)

    const EKIP_LISTESI = [
        "Mekanik", "Elektrik", "Çatı (Kereste)", "Çatı (Kiremit)", "Çatı (Oluk)",
        "Denizlik", "Parke", "Seramik", "Boya", "TG5", "PVC", "Kör Kasa", "Şap",
        "Dış Cephe", "Makina Alçı", "Saten Alçı", "Kaba Sıva (İç)", "Yerden Isıtma",
        "Asma Tavan", "Klima Tesisat", "Mobilya", "Çelik Kapı", "Korkuluk"
    ];

    const KULLANICI_LISTESI = [
        "Muhammet", "Harun", "Metin", "Mert", "Fuat", "Furkan", "Misafir"
    ];

    const BLOK_LISTESI = [
        "AC", "AD", "AE", "AF", "AG", "AH", "AI", "AJ", "AK", "AL", "AM", "AN",
        "AB", "Y", "V", "S", "R", "P", "O", "N", "M", "L", "K", "J", "I",
        "AA", "Z", "U", "T", "A", "B", "C", "D", "E", "F", "G", "H"
    ];

    // --- 1. AÇILIR MENÜLERİ DOLDURMA ---
    function populateSelect(selectId, list, defaultOptionText) {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        // Sadece pano filtresi için "Tüm Ekipler" seçeneği
        if (defaultOptionText) {
            select.innerHTML = `<option value="">${defaultOptionText}</option>`;
        } else {
            select.innerHTML = `<option value="">-- Seçiniz --</option>`;
        }

        list.forEach(item => {
            select.innerHTML += `<option value="${item}">${item}</option>`;
        });
    }

    // Ekip listelerini doldur
    populateSelect('yoklamaEkip', EKIP_LISTESI);
    populateSelect('kayitEkip', EKIP_LISTESI);
    populateSelect('panoEkipFiltre', EKIP_LISTESI, 'Tüm Ekipler (Genel Bakış)');
    
    // Kullanıcı listesini doldur
    populateSelect('kayitKullanici', KULLANICI_LISTESI);

    // Blok listelerini doldur (Formlardaki basit listeler için)
    populateSelect('yoklamaBlok', BLOK_LISTESI);
    populateSelect('kayitBlok', BLOK_LISTESI);


    // --- 2. SAYFA (SEKME) DEĞİŞTİRME ---
    const navButtons = document.querySelectorAll('.nav-btn');
    const pages = document.querySelectorAll('.page');

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetPageId = button.dataset.page;

            // Tüm sayfa ve butonlardan 'active' sınıfını kaldır
            pages.forEach(page => page.classList.remove('active'));
            navButtons.forEach(btn => btn.classList.remove('active'));

            // Tıklananı aktif et
            document.getElementById(targetPageId).classList.add('active');
            button.classList.add('active');
        });
    });


    // --- 3. BÖLÜM 3 - GÖRSEL PANO DEMOSU ---
    const panoFiltre = document.getElementById('panoEkipFiltre');
    const paftaBloklari = document.querySelectorAll('#projePaftasi .blok:not(.sosyal-tesis)');

    // Filtre değiştiğinde demo fonksiyonu çalıştır
    panoFiltre.addEventListener('change', () => {
        guncellePanoDemo();
    });

    function guncellePanoDemo() {
        const durumlar = ["", "durum-devam", "durum-bitti", "durum-teslim"];

        paftaBloklari.forEach(blok => {
            // Önceki tüm durum sınıflarını temizle
            blok.classList.remove("durum-devam", "durum-bitti", "durum-teslim");

            // Rastgele bir durum ata (Bu kısım Firebase gelince değişecek)
            const rastgeleDurum = durumlar[Math.floor(Math.random() * durumlar.length)];
            if (rastgeleDurum) {
                blok.classList.add(rastgeleDurum);
            }
        });
    }
    
    // Sayfa ilk yüklendiğinde de demoyu çalıştır
    guncellePanoDemo();

});
