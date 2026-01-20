# 🗄️ MySQL Veritabanı Sorgulama Arayüzü

MySQL veritabanı dosyalarından (.frm, .MYD, .MYI) web tabanlı sorgulama ve görüntüleme arayüzü.

## ✨ Özellikler

- 📊 **Tablo Listesi**: Veritabanındaki tüm tabloları görüntüleme
- 🔍 **Arama ve Filtreleme**: Tablolarda ve verilerde hızlı arama
- 📄 **Sayfalama**: Her sayfada 100 kayıt ile optimize edilmiş görüntüleme
- ↕️ **Sütun Sıralama**: Tıklanabilir sütun başlıkları ile veri sıralama
- 📥 **CSV Export**: Tabloları CSV formatında dışa aktarma
- 🎨 **Modern Arayüz**: Responsive ve kullanıcı dostu tasarım
- 🔒 **Güvenlik**: SQL injection koruması ve read-only erişim
- 🇹🇷 **Türkçe Arayüz**: Tamamen Türkçe kullanıcı arayüzü

## 📋 Gereksinimler

- Python 3.8 veya üzeri
- MySQL veritabanı (MyISAM motor desteği ile)
- pip (Python paket yöneticisi)

## 🚀 Kurulum

### 1. Projeyi İndirin

```bash
cd mysql_query_interface
```

### 2. Virtual Environment Oluşturun (Önerilir)

```bash
# Virtual environment oluştur
python3 -m venv venv

# Aktif et (Linux/Mac)
source venv/bin/activate

# Aktif et (Windows)
venv\Scripts\activate
```

### 3. Bağımlılıkları Yükleyin

```bash
pip install -r requirements.txt
```

### 4. Ortam Değişkenlerini Ayarlayın

`.env.example` dosyasını `.env` olarak kopyalayın:

```bash
cp .env.example .env
```

`.env` dosyasını düzenleyin ve veritabanı bilgilerinizi girin:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_DATABASE=tapu
PORT=5000
DEBUG=True
```

### 5. Uygulamayı Başlatın

```bash
python app.py
```

Veya executable olarak:

```bash
chmod +x app.py
./app.py
```

Uygulama başarıyla başladığında şu mesajı göreceksiniz:

```
 * Running on http://0.0.0.0:5000
```

### 6. Web Tarayıcısında Açın

Tarayıcınızda şu adresi açın:

```
http://localhost:5000
```

## 📁 Proje Yapısı

```
mysql_query_interface/
├── app.py                 # Flask backend uygulaması
├── templates/
│   └── index.html        # Ana HTML şablonu
├── static/
│   ├── css/
│   │   └── style.css     # CSS stilleri
│   └── js/
│       └── main.js       # JavaScript frontend mantığı
├── requirements.txt       # Python bağımlılıkları
├── .env.example          # Örnek ortam değişkenleri
└── README.md             # Bu dosya
```

## 🎯 Kullanım

### Tablo Seçme

1. Sol panelden bir tablo seçin
2. Tablo otomatik olarak yüklenecek ve veriler gösterilecektir

### Arama ve Filtreleme

- **Tablo Arama**: Sol paneldeki arama kutusundan tablo adı arayın
- **Veri Arama**: Sağ üstteki arama kutusundan tablodaki verilerde arama yapın
  - Arama tüm sütunlarda yapılır
  - 500ms debounce ile otomatik arama

### Sayfalama

- **İlk/Son Sayfa**: ⏮️ ve ⏭️ butonları ile
- **Önceki/Sonraki**: ◀️ ve ▶️ butonları ile
- **Belirli Sayfa**: Ortadaki sayfa numarasını girerek
- **Klavye Kısayolları**: ← ve → ok tuşları ile gezinme

### Sıralama

- Sütun başlıklarına tıklayarak sıralama yapabilirsiniz
- İlk tıklama: Artan sıralama (▲)
- İkinci tıklama: Azalan sıralama (▼)

### CSV Export

1. CSV İndir butonuna tıklayın
2. Mevcut arama filtresi varsa sadece filtrelenmiş veriler indirilir
3. UTF-8 BOM ile Excel uyumlu format

## 🔧 Yapılandırma

### Sayfa Başına Kayıt Sayısı

Varsayılan olarak her sayfada 100 kayıt gösterilir. Bunu değiştirmek için `static/js/main.js` dosyasında:

```javascript
perPage: 100  // İstediğiniz sayıya değiştirin
```

### Port Değiştirme

`.env` dosyasında `PORT` değerini değiştirin:

```env
PORT=8080
```

### Debug Modu

Production ortamında debug modunu kapatın:

```env
DEBUG=False
```

## 🛡️ Güvenlik

- ✅ SQL Injection koruması
- ✅ Sadece SELECT sorguları (read-only)
- ✅ Tablo adı sanitizasyonu
- ✅ Prepared statements kullanımı
- ✅ .env ile credential yönetimi
- ⚠️ Production'da `.env` dosyasını asla commit etmeyin!

## 🔍 API Endpoints

### GET /api/health
Veritabanı bağlantı kontrolü

### GET /api/tables
Tüm tabloları listele

### GET /api/table/:name
Tablo verilerini getir

**Query Parametreleri:**
- `page`: Sayfa numarası
- `per_page`: Sayfa başına kayıt
- `sort_by`: Sıralama sütunu
- `sort_order`: Sıralama yönü (asc/desc)
- `search`: Arama terimi

### GET /api/export/:name
CSV olarak export

**Query Parametreleri:**
- `search`: Arama terimi (filtreleme için)

## 🐛 Sorun Giderme

### Veritabanına bağlanılamıyor

1. MySQL servisinin çalıştığından emin olun
2. `.env` dosyasındaki bilgileri kontrol edin
3. Kullanıcının veritabanı erişim yetkisi olduğundan emin olun

```bash
# MySQL'e bağlan ve kontrol et
mysql -u root -p
USE tapu;
SHOW TABLES;
```

### Port zaten kullanımda

Farklı bir port kullanın:

```bash
PORT=8080 python app.py
```

### ModuleNotFoundError

Bağımlılıkları tekrar yükleyin:

```bash
pip install -r requirements.txt
```

### MyISAM Dosyaları Okunamıyor

MySQL'in MyISAM motor desteğine sahip olduğundan emin olun:

```sql
SHOW ENGINES;
```

## 📝 Lisans

Bu proje açık kaynaklıdır ve serbestçe kullanılabilir.

## 🤝 Katkıda Bulunma

Katkılarınızı bekliyoruz! Lütfen:

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'feat: Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 💡 İpuçları

- **Performans**: Büyük tablolar için sayfa başına kayıt sayısını azaltın
- **Güvenlik**: Production'da mutlaka güçlü şifreler kullanın
- **Backup**: Veritabanınızı düzenli olarak yedekleyin
- **Monitoring**: Production'da gunicorn ile çalıştırın

## 📞 Destek

Sorularınız için:
- Issue açın
- Dokümantasyonu kontrol edin
- Log dosyalarını inceleyin

---

**Not**: Bu uygulama sadece SELECT sorguları çalıştırır ve veritabanında değişiklik yapmaz.
