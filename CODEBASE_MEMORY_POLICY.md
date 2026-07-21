# Taşıburadan — Codebase Memory ve Token-Optimal Keşif Politikası

> Bu dosya repository kökündeki `GPT_AGENTS.md` tarafından gerektiğinde referans
> verilen ayrıntılı keşif politikasıdır. Her görevde otomatik okunmaz. Kod konumu
> zaten biliniyorsa veya görev yalnız belge/config işi ise bu dosyayı bağlama alma.

## Amaç

Doğruluktan ödün vermeden toplam model bağlamını ve token tüketimini azalt.

Amaç Codebase Memory kullanmak değildir. Amaç, görevi doğrulayabilecek en küçük toplam bağlamla tamamlamaktır.

Bu repo için koşullu yönlendirme geçerlidir. Global talimatlarda Codebase Memory veya graph araçlarının önce kullanılması önerilse bile aşağıdaki görev yönlendiricisi uygulanmalıdır.

## Sabit Codebase Memory kimliği

Taşıburadan graph proje kimliği:

`C-Users-eren-Desktop-tasiburada`

Codebase Memory çağrılarında:

- `project` değeri daima yukarıdaki kimlikle birebir aynı olmalıdır.
- `tasiburada`, klasör adı veya tahmini proje kimliği kullanma.
- Kimlik bilindiği için rutin olarak `list_projects` çağırma.
- Proje bulunamazsa farklı kimlikler deneme ve geniş keşif başlatma.
- Kesin kimlikle yapılan çağrı proje bulunamadı hatası verirse graph kullanımını durdur ve indeks sorunu olduğunu bildir.

## 1. Görev yönlendiricisi

Kod keşfinden önce görevi içsel olarak sınıflandır. Kullanıcı istemedikçe bu sınıflandırmayı uzun şekilde anlatma.

### Seviye A — Konum biliniyor

Aşağıdakilerden biri geçerliyse Codebase Memory kullanma:

- Kullanıcı kesin dosya yolu verdiyse.
- Hata mesajı dosya ve satır numarası gösteriyorsa.
- Fonksiyon veya sınıfın dosyası biliniyorsa.
- Görev 1-3 bilinen dosyayla sınırlıysa.
- Dosya yeni veya untracked ise.
- Küçük, yerel veya tek satırlık bir değişiklik yapılacaksa.
- Mevcut görev yalnızca bilinen config, test veya belge dosyasını ilgilendiriyorsa.

Doğrudan yalnızca gerekli satır aralığını oku. Gerekirse tek dosya veya tek dizinde sınırlı `rg` kullan.

### Seviye B — Dar metinsel keşif yeterli

Konum bilinmese bile aşağıdakilerden biri mevcutsa önce Codebase Memory kullanma:

- HTTP metodu veya endpoint parçası.
- Hata mesajı.
- UI düğmesi veya kullanıcı eylemi metni.
- Config anahtarı.
- Tablo, entity, DTO, fonksiyon veya domain terimi.
- Kolayca aranabilecek sabit bir string.

Bu durumda:

1. Önce en fazla 2 dar `rg` araması yap.
2. İlk aramada mümkünse yalnız dosya yollarını getir.
3. Aramayı `src`, `shadcn-ui/src` veya görevle ilgili daha dar dizinle sınırla.
4. İlk sonuçları en fazla 8 dosyayla sınırla.
5. Sonuç en fazla 5 ilgili dosyaya indirgenirse graph kullanma; hedefli okumaya geç.
6. İki dar arama kodun yerini belirleyemezse Seviye C'ye geç.

Aynı terimin farklı varyasyonlarıyla arka arkaya geniş aramalar yapma.

### Seviye C — Graph-native keşif

Aşağıdaki durumlarda Codebase Memory kullan:

- Dar metinsel arama kodun yerini belirleyemediyse.
- Bir sembolün çağıranları veya çağrılanları araştırılıyorsa.
- Dolaylı bağımlılıklar bulunacaksa.
- Bir değişikliğin farklı modül ve katmanlara etkisi araştırılıyorsa.
- Çağrı, import, inheritance, implementation veya veri akışı ilişkisi aranıyorsa.
- Çok sayıda metinsel eşleşme içinden yapısal olarak doğru olanlar seçilecekse.
- Birden fazla olası route, service veya iş akışı birbirinden ayrılacaksa.
- Cross-service veya cross-repo bağlantı araştırılıyorsa.

Basit frontend → endpoint → controller → service takibinde endpoint veya eylem metni aranabiliyorsa önce Seviye B uygulanmalıdır.

### Seviye D — Mimari veya kapsamlı denetim

Yalnızca kullanıcı açıkça mimari inceleme, güvenlik denetimi, kapsamlı etki analizi, dead-code araştırması veya eksiksiz envanter istediğinde kullan.

Repo genelini rutin görevlerde analiz etme.

## 2. Codebase Memory çalışma seviyeleri

### Scout — Hızlı keşif

Varsayılan graph seviyesidir.

- Yalnız olumlu ve geçici adaylar bul.
- Normalde en fazla 2 Codebase Memory çağrısı yap.
- Küçük limitler ve `depth=1` kullan.
- En fazla 1-2 kesin sembol veya yol belirle.
- “Hiç yok”, “tümü bunlar”, “eksiksiz etki” veya “dead code” iddiasında bulunma.
- Aday dosyalar belirlendiğinde graph kullanımını bırak.

### Verify — Kaynakla doğrulama

Kod değişikliği veya kesin teknik sonuç gerektiğinde kullan.

- Graph yalnızca adayları ve ilişkileri bulsun.
- Maddi iddiaları kesin kaynak satırlarıyla doğrula.
- Graph sonucunu kaynak kodun yerine nihai gerçek olarak kabul etme.
- Normal toplam Codebase Memory bütçesi 2 çağrıdır.
- Negatif, kapsamlı veya yüksek riskli iddialarda üçüncü çağrı yalnızca toplu `check_index_coverage` için kullanılabilir.
- Kapsam boşluğu varsa ilgili kaynak aralığını doğrudan oku veya sınırlı `rg` kullan.

### Auditor — Kapsamlı doğrulama

Yalnız kullanıcı açıkça kapsamlı denetim istediğinde kullan.

- Kapsamı önce dizin, modül veya özellik ile sınırla.
- İndeks güncelliğini doğrula.
- Yalnız ilgili sonuç sayfalarını tamamla.
- Kapsam kontrolü yap.
- Eksik, skipped, excluded, stale veya untracked alanları doğrudan kaynak üzerinden doğrula.
- Çözülemeyen sınırlamaları açıkça belirt.

Auditor seviyesini rutin geliştirme görevlerinde kullanma.

## 3. Graph çağrısı bütçesi ve durdurma kuralları

- Araç mevcut olduğu için çağrı yapma.
- Minimum graph çağrısı zorunluluğu yoktur.
- İlk graph çağrısı kapsamı belirgin biçimde daraltmazsa graph kullanımını durdur.
- Normal görevde toplam en fazla 2 Codebase Memory çağrısı yap.
- Üçüncü çağrı yalnızca belirli bir kanıt veya toplu kapsam kontrolü için yapılabilir.
- Mimari denetim hariç otomatik pagination yapma.
- Sonuçta `has_more=true` veya çok büyük bir `total` görülürse tüm sayfaları çekme; sorguyu daralt.
- Tek çağrı çok geniş metadata, çok sayıda edge veya uzun kod döndürürse aynı türde geniş çağrı tekrarlama.
- Dosyalar belirlendiği anda graph kullanımını bırak.
- Kod yazma aşamasında yeni bir ilişki sorusu çıkmadıkça graph'a geri dönme.

## 4. Araçlara özel kurallar

### search_graph

- `project="C-Users-eren-Desktop-tasiburada"`
- `format="toon"`
- `limit=5`
- `include_connected=false`
- Mümkünse `label` veya dar `file_pattern` kullan.
- Önce kesin veya sade `name_pattern` kullan.
- Gereksiz `fields` isteme.
- Tüm sonuç sayfalarını otomatik çekme.
- Kesin sembol sıfır sonuç verirse aynı sembolü bir kez daha sade pattern ile ara.
- İkinci deneme de sıfırsa graph kullanımını durdur ve hedefli `rg` kullan.
- Doğal dil veya vocabulary mismatch yoksa semantic arama kullanma.

### trace_path

- Önce `depth=1` kullan.
- Yalnız gerekli yönü seç: `inbound` veya `outbound`.
- Gerekmedikçe `direction="both"` kullanma.
- `include_tests=false` ile başla.
- `format="toon"` kullan.
- Gerekmedikçe `depth=2` üzerine çıkma.
- Sonuç çok sayıda edge üretiyorsa derinliği artırma; sembolü veya kapsamı daralt.
- Test etkisi araştırılıyorsa testleri ayrı ve bilinçli olarak dahil et.

### get_code_snippet

- Yalnız kesin sembol belirlendikten sonra kullan.
- Bir turda en fazla 2 sembol getir.
- `include_neighbors=false`
- Küçük bir sembol için snippet kullan.
- Büyük sınıf veya metotta tam içerik isteme; dosyadaki hedef satır aralığını doğrudan oku.
- Aynı kodu hem snippet hem tam dosya okumasıyla tekrar bağlama ekleme.

### search_code

- Sabit metin biliniyorsa önce kapsamı daraltılmış `rg` tercih et; untracked dosyalar graph indeksinde olmayabilir.
- Kullanılacaksa önce `mode="files"` veya `mode="compact"` kullan.
- `limit=5`
- Dar `path_filter` veya `file_pattern` kullan.
- Kesin dosya bilinmeden `mode="full"` kullanma.
- Aynı sorguyu hem `search_code` hem geniş `rg` ile tekrarlama.

### query_graph

- `search_graph` ve `trace_path` yetersiz kalmadıkça kullanma.
- Şema bilinmiyorsa sorgu tahmin etme.
- Her Cypher sorgusuna `LIMIT 10` ekle.
- `max_rows=10` kullan.
- Limitsiz sorgu çalıştırma.
- Seed, route, DTO, entity veya node kümelerini topluca döndürme.
- İlk sorgu geniş sonuç üretirse pagination yerine sorguyu daralt.
- Yalnız gereken alanları `RETURN` et.

### get_architecture

- Yalnız mimari görevlerde kullan.
- Mümkünse gerekli dizini `path` ile sınırla.
- `aspects=["overview"]` ile başla.
- Varsayılan olarak `all`, geniş `file_tree` veya kapsamlı metadata isteme.
- Rutin bug fix veya tek özellik değişikliğinde çağırma.

### detect_changes

- Kullanıcı mevcut değişikliklerin etkisini soruyorsa geniş `git diff` okumadan önce kullanılabilir.
- Sonucu ilgili sembol ve dosyalara daralt.
- Maddi etkileri kaynak ve hedefli diff ile doğrula.
- Normal geliştirme görevlerinde sırf araç mevcut diye çağırma.

### check_index_coverage

Aşağıdaki durumlarda kullan:

- “Hiç bulunmuyor” şeklinde negatif iddia yapılacaksa.
- “Tüm çağıranlar/etkiler bunlar” şeklinde kapsamlı iddia yapılacaksa.
- Güvenlik, veri bütünlüğü veya release açısından yüksek riskli sonuç verilecekse.
- Graph sonucundaki dosyaların indeks kapsamı şüpheliyse.

Kurallar:

- Her dosya için ayrı çağrı yapma.
- Tüm kanıt yollarını tek çağrıda toplu kontrol et.
- İlgili negatif iddia için gerekliyse scope kontrolünü de ekle.
- Temiz kapsam sonucu yalnızca kayıtlı bir boşluk olmadığını gösterir; eksiksizliğin mutlak kanıtı değildir.
- `partial`, `skipped`, `excluded`, `stale`, `pending` veya `unknown` sonucu varsa ilgili kaynak alanına doğrudan dön.
- Yeni ve untracked dosyaları graph'ın bildiğini varsayma.

### index_status

Yalnızca aşağıdaki durumlarda kullan:

- Graph projesinin bulunamadığı düşünülüyorsa.
- Sonuçların güncel olmadığına dair somut belirti varsa.
- Kapsamlı veya yüksek riskli bir denetim yapılıyorsa.

Her görevde rutin olarak çağırma ve otomatik yeniden indeksleme başlatma.

## 5. Kaynak okuma bütçesi

- İlk olarak yalnız gerekli satır aralıklarını oku.
- İlk geçişte dosya başına tercihen en fazla 80 satır oku.
- İlk keşif turunda toplam yaklaşık 240 kaynak satırını aşmamaya çalış.
- Daha fazla satır gerekiyorsa yalnız somut kanıt ihtiyacı nedeniyle genişlet.
- Büyük dosyaları baştan sona okuma.
- Aynı satırları farklı araçlarla tekrar getirme.
- `rg` aramasını dosya veya ilgili dizinle sınırla.
- Önce dosya yollarını, sonra yalnız seçilen eşleşmelerin çevresini getir.
- `node_modules`, `dist`, `coverage`, loglar, uploads, test çıktıları ve üretilmiş dosyalarda geniş arama yapma.
- Test veya build çıktısında önce hata özeti ve ilgili bölüm okunmalıdır; tüm log bağlama alınmamalıdır.

## 6. Git ve untracked dosyalar

- Kod değiştirilecekse çalışmaya başlamadan önce `git status --short` ile mevcut kullanıcı değişikliklerini kontrol et.
- Salt okunur ve yolu bilinen analiz görevlerinde sırf kural olduğu için `git status` çağırma.
- İlgili dosya untracked ise Codebase Memory sonucuna güvenme; doğrudan oku.
- Kullanıcının mevcut değişikliklerini koru.
- İlgisiz diff veya logları bağlama alma.

## 7. Negatif ve kapsamlı iddialar

Yalnız graph sonucuna dayanarak şu tür iddialarda bulunma:

- “Frontend bunu çağırmıyor.”
- “Başka çağıran yok.”
- “Tüm etkiler bunlar.”
- “Bu kod kullanılmıyor.”
- “Repository katmanı bulunmuyor.”
- “Güvenlik açığı başka yerde yok.”

Bu iddialar için:

1. İlgili graph ilişkisini kontrol et.
2. Toplu indeks kapsamını kontrol et.
3. İlgili kaynak dizininde dar metinsel arama yap.
4. Untracked ve excluded alanları dikkate al.
5. Kalan sınırlamayı sonuçta belirt.

Pozitif bir akış bulmak için bu doğrulama yükünü gereksiz yere uygulama.

## 8. Uygulama ve doğrulama

- Keşif tamamlandığında yalnız belirlenen dosyaları değiştir.
- Değişiklikten sonra tüm repoyu yeniden keşfetme.
- En dar ilgili test veya typecheck ile başla.
- Test başarısızsa önce yalnız hata özeti ve ilgili stack bölümünü oku.
- Geniş test suite ancak görev riski gerektiriyorsa veya kullanıcı isterse çalıştır.
- Codebase Memory kaynak kodun, testlerin ve çalışma zamanı doğrulamasının yerine geçmez.

## 9. Alt ajan kuralları

- Rutin görevlerde alt ajan başlatma.
- 1-3 dosyalık görevleri delege etme.
- Kullanıcı açıkça istemedikçe paralel ajan kullanma.
- Token tasarrufu amacıyla tek ajanla yapılabilecek işi bölme.
- Alt ajan kullanılsa bile aynı graph keşfini birden fazla ajana tekrarlatma.

## 10. Yanıt ve token raporu

- Kullanıcı istemedikçe uzun keşif günlüğü verme.
- Nihai yanıtta sonuç ve önemli doğrulama bilgisini öne çıkar.
- Kesin telemetri yoksa token rakamı veya tasarruf yüzdesi tahmin etme.
- Araç çağrılarını uzun uzun anlatma.
- Codebase Memory kullanıldıysa yanıtın sonunda tek satır ekle:

`CBM: kullanıldı | çağrı: N | gerekçe: ... | geniş çıktı: evet/hayır`

- Codebase Memory atlandıysa kullanıcı özellikle token raporu istemedikçe rapor ekleme.
- Kullanıcı token raporu isterse yalnız şunları bildir:
  - Codebase Memory kullanıldı mı?
  - Toplam Codebase Memory çağrısı.
  - `rg/search` çağrısı.
  - Okunan kaynak dosyası ve yaklaşık satır sayısı.
  - Geniş sonuç oluştu mu?
  - Sonuç kaynakla doğrulandı mı?

## 11. Son karar ilkesi

Öncelik sırası:

1. Bilinen konum için doğrudan hedefli okuma.
2. Aranabilir metin için sınırlı `rg`.
3. Yapısal ilişki için dar Codebase Memory sorgusu.
4. Maddi iddia için kesin kaynak doğrulaması.
5. Negatif veya kapsamlı iddia için toplu indeks kapsamı ve dar kaynak araması.

En az araç çağrısı tek başına hedef değildir. En küçük toplam model bağlamıyla güvenilir sonuca ulaşmak hedeftir.
