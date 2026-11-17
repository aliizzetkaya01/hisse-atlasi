# Hisse Atlası

Türkçe şirket araştırmaları ve tarihli PDF arşivi. Hisse Araştırma Kütüphanesi.

Canlı GitHub Pages adresi yayın tamamlandığında deponun Pages bölümünde görünür.
İlk otomatik yayın eksik PDF'leri mevcut herkese açık arşivden indirir, her birinin
SHA-256 değerini katalogla karşılaştırır ve bu depoya kaydeder. Sonraki yayınlar
PDF'ler depoda bulunduğu sürece önceki yayın alanına bağımlı değildir.

Site statiktir; Node.js yalnız katalog güncelleme ve doğrulama için kullanılır.
Ziyaretçinin hesabı, API anahtarı veya herhangi bir kurulum gerektirmez.
Orijinal PDF'ler değişmeden korunur. Rapor tarihleri güncel fiyat değildir;
arşiv kişisel yatırım tavsiyesi değildir.

## GitHub Pages yayını

1. GitHub hesabınızda `hisse-atlasi` adında bir depo oluşturun.
   GitHub Free ile Pages kullanmak için depo herkese açık olmalıdır.
2. Temiz aktarım paketindeki dosyaları aynı dizin yapısıyla `main` dalına yükleyin.
   Gizli `.github/workflows/pages.yml` dosyası da dahil olmalıdır.
3. Deponun Settings → Pages → Build and deployment bölümünde Source olarak
   **GitHub Actions** seçin.
4. Actions bölümünde **Publish Hisse Atlası** iş akışını çalıştırın veya `main`
   dalına değişiklik gönderin. Başarılı yayın adresini bu iş akışı gösterir.

Proje alt dizini (`/hisse-atlasi/`) ve özel alan adı desteklenir: CSS, JavaScript,
katalog ve PDF bağlantıları site köküne değil göreli yollara dayanır.
Otomatik yenileme, depoya gönderilen değişiklikler içindir; masaüstü klasörü
kendi kendine GitHub'a eşitlenmez.

## Yerel kontrol

Node.js 22 veya üstüyle:

    node scripts/validate-site.mjs
    node preview.mjs

Önizleme adresi: http://127.0.0.1:8766/

## Arşivi güncelleme

`build-catalog.mjs`, verilen arşiv kökünün `Günlük NASDAQ Hisse Analizleri` ve
`BIST Hisse Analizleri` alt klasörlerinden PDF'leri alır:

    node build-catalog.mjs "ARSIV_KOK_DIZINI"
    node scripts/validate-site.mjs

Parametre verilmezse yerel kullanıcının masaüstündeki `Nasdaq Hisse Analizi`
klasörü kullanılır. Kişisel portföy raporları ve çalışma taslakları kapsam dışıdır.
Katalogdaki `sha256` ve `bytes`, PDF bütünlüğünü doğrulamaya yarar.

## Haklar ve kapsam

Bu depo kaynak kodu ve araştırma arşivini yayınlar. Genel bir yeniden kullanım
lisansı verilmemiştir. PDF'lerde anılan üçüncü taraf kaynakların hakları saklıdır.
Geçmiş raporlar yayın için yeniden finansal denetime tabi tutulmamıştır.

Resmî kurulum açıklaması:
https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
