# Hisse Atlası

Türkçe şirket araştırmaları ve tarihli PDF arşivi. Hisse Araştırma Kütüphanesi.

Canlı site: https://aliizzetkaya01.github.io/hisse-atlasi/

Araştırma arşivi sahibi: **Ali İzzet KAYA**.

Veri laboratuvarı: https://aliizzetkaya01.github.io/hisse-atlasi/explore/

97 PDF'nin 2.660 sayfası aranabilir metin ve sayfa/bölüm dizinine çevrilmiştir.
Şirket, sektör ve tarih filtreleri; rapor içi arama, kaynak sayfası bağlantısı,
JSON/CSV indirme ve en fazla beş raporun kapak göstergelerini karşılaştırma vardır.
10.323 otomatik tablo-adayı satır, denetlenmiş/normalize edilmiş mali seri değildir.
Resim grafikler sayısallaştırılmamıştır. Eksik veya kurulamadı alanlar null tutulur.
Fiyat ve hedefler tarihlidir; hedef/spot farkı gerçekleşmiş getiri değildir.

## Grafikler ve DXY

Veri laboratuvarındaki Grafikler ve DXY alanı seçilen hisseyi TradingView'in
ücretsiz gömülü grafiğinde TVC:DXY ile karşılaştırır. Piyasa serileri sitede
yeniden dağıtılmaz; JSON/CSV arşiv ihracına dahil değildir. Sağlayıcının gecikme,
sembol kapsamı ve kullanım şartları geçerlidir. Fiyat karşılaştırması yüzde
ölçeğindedir; arşiv fiyatlarıyla aynı veri kesimi değildir.

NVDA, SITM, OLED, MXL, CEVA, TSEM, ALGM, KLIC, COHU ve UCTT'nin eşleşen
raporlarında yıllık gerçekleşen mali seriler bulunur. Kaynak birimi,
başlangıç=100 ve ilk döneme göre değişim görünümleri; mali yıl filtreleri,
PDF sayfa bağlantıları ve seçili veri indirme desteklenir. Sıfır/negatif
seriler endekslenmez; N/M gözlemler boşluk olarak korunur. DXY ayrı panelde
incelenebilir; mali yıllarla eşleştirilmiş korelasyon hesabı yapılmaz.
Diğer raporların kapak göstergeleri çizilebilir, ham tablo adayları ise
doğrulanmış mali seri gibi sunulmaz. Eski PDF'ler değişmemiştir.
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

## Türkçe / English arayüz

Ana sayfa, veri laboratuvarı ve lisans sayfasının sağ üstündeki dil seçimi
aynı tercihi paylaşır. `?lang=tr` ve `?lang=en` doğrudan bağlantılarda da
kullanılabilir; tercih bu sitenin yerel depolamasında saklanır. Bu yalnız
arayüz çevirisidir: kaynak PDF, rapor alıntıları ve özgün veri kayıtları
çevrilmez. Haricî TradingView paneline seçilen arayüz dili aktarılır.

19 Kasım 2026 güncellemesi: 98 belge, 87 şirket, 2.707 PDF sayfası.
AOSL'nin 12 aylık hedefi kurulamadığından eksik bırakılmış; koşullu stratejik
DCF ayrı alanda tutulmuştur. 11 şirketin eşleşen yıllık finansal serilerinde
545 gözlem vardır. Bu sayısallaştırma yeni bir finansal denetim değildir.

Yayın öncesi kontroller:

    node scripts/test-bilingual-addition.mjs
    node scripts/test-watch-charts.mjs
    node scripts/validate-site.mjs

Arayüzün ortak çeviri kaynağı `explorer-source/shared/i18n.mjs` dosyasıdır.
Tam Data uygulamasında düzenleme sonrası `scripts/sync-authored-sources.mjs`
ile paylaşılan dosyalar kopyalanır; ardından mevcut derleyici kullanılır.

## Haklar ve kapsam

Özgün yazılım kodu [MIT](LICENSE), özgün rapor ve analizler
[CC BY-NC 4.0](LICENSE-CONTENT.md) kapsamındadır. Üçüncü taraf kaynakların
hakları saklıdır; salt olgular üzerinde yeni bir telif hakkı ileri sürülmez.
Geçmiş raporlar yayın için yeniden finansal denetime tabi tutulmamıştır.

Resmî kurulum açıklaması:
https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
