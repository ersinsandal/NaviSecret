<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.svg" />
    <source media="(prefers-color-scheme: light)" srcset="assets/logo-light.svg" />
    <img src="assets/logo-dark.svg" alt="NaviSecret Logo" width="340" />
  </picture>
</p>

<p align="center">
  <strong>Gizlilik Öncelikli Gerçek Zamanlı Konum Paylaşımı ve Konuma Bağlı Gizli Kapsül Platformu</strong>
</p>

<p align="center">
  <a href="README.md">
    <img src="https://img.shields.io/badge/DOCUMENTATION-READ%20IN%20ENGLISH-0052cc?style=for-the-badge&logo=readme&logoColor=white" alt="English Documentation" />
  </a>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/Lisans-MIT-blue.svg?style=flat-square" alt="MIT Lisansı"></a>
  <img src="https://img.shields.io/badge/Node.js-22%20LTS-339933.svg?style=flat-square&logo=nodedotjs&logoColor=white" alt="Node.js 22">
  <img src="https://img.shields.io/badge/Fastify-5.x-000000.svg?style=flat-square&logo=fastify&logoColor=white" alt="Fastify">
  <img src="https://img.shields.io/badge/React-19-61DAFB.svg?style=flat-square&logo=react&logoColor=black" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-5.6-3178C6.svg?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1.svg?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL 16">
  <img src="https://img.shields.io/badge/Redis-7-DC382D.svg?style=flat-square&logo=redis&logoColor=white" alt="Redis 7">
  <img src="https://img.shields.io/badge/Docker-Hazır-2496ED.svg?style=flat-square&logo=docker&logoColor=white" alt="Docker">
  <img src="https://img.shields.io/badge/Diller-TR%20%7C%20EN%20%7C%20RU-brightgreen.svg?style=flat-square" alt="Çoklu Dil">
</p>

---

## Genel Bakış

**NaviSecret**, açık kaynaklı, bağımsız ve gizlilik odaklı modern bir mekânsal sosyal platformdur. Arkadaşlarınızla gerçek zamanlı konum paylaşımını, fiziksel yakınlık karşılaşmalarını ve yalnızca gerçek dünyada ilgili koordinatlara gidildiğinde açılabilen konuma kilitli şifreli dijital kapsülleri bir araya getirir.

Kullanıcıların koordinat geçmişlerini kaydedip ticarileştiren geleneksel takip uygulamalarının aksine NaviSecret; gizliliği, tam bağımsızlığı ve kendi sunucunuzda barındırma (self-hosting) ilkelerini esas alır:
- **Harici Bulut Bağımlılığı Yok**: Platform %100 bağımsızdır ve kendi sunucunuzda çalışır. Harici Backend-as-a-Service (BaaS) platformlarına veya ücretli ticari harita servis sağlayıcılarına ihtiyaç duymaz.
- **Kapsamlı Gizlilik ve Hayalet Modu (Ghost Mode)**: Kullanıcılar konum görünürlüklerini diledikleri an hassas, bulanıklaştırılmış (yaklaşık) veya anında haritadan kaybolmayı sağlayan süreli Hayalet Modu olarak ayarlayabilir.
- **Konuma Kilitli Kapsüller**: Belirli fiziksel noktalara şifreli mesajlar, fotoğraflar ve notlar bırakılabilir. Bu kapsüller yalnızca yetkili kişiler coğrafi sınıra (geofence) fiziksel olarak yaklaştığında açılır.
- **Minimum Donanım Kaynağı Tüketimi**: Tüm üretim ortamı, Docker Compose üzerinden çalışan optimize 4 mikroservis konteyneriyle ayağa kalkar ve toplamda yalnızca ~100 MB RAM tüketir.

---

## Temel Yetenekler ve Modüller

### 1. Canlı Sosyal Harita ve Radar
- Yerel WebSocket sunucusu ve Redis Pub/Sub altyapısı sayesinde arkadaşlar arasında saniyenin altında gecikmeyle anlık konum senkronizasyonu.
- Harici takip kodları içermeyen, OpenStreetMap cadde haritası ile Esri uydu görünümü arasında kesintisiz geçiş sağlayan Leaflet kartografyası.
- Yakındaki arkadaşların ve kapsüllerin mesafesini ve yönünü gösteren görsel mekânsal radar.

### 2. Konuma Sabitlenmiş Gizli Kapsüller (NaviDrop)
- Belirli koordinatlara özel açılma yarıçapı (örn. 25m, 50m, 100m) tanımlanarak mesaj, medya ve ipuçları bırakabilme.
- İçerik sunucuda şifreli olarak tutulur; istemci yalnızca hedefe fiziksel olarak ulaştığında doğrulama yaparak içeriği açabilir.
- İsteğe bağlı olarak süre kısıtlamalı veya gecikmeli açılan zaman kapsülleri oluşturma imkânı.

### 3. NaviBump (Fiziksel Yakınlık Eşleşmesi)
- Ortak arkadaşların fiziksel dünyada yolları kesiştiğinde kullanıcıları uyaran akıllı yakınlık algılama.
- Tek dokunuşla cihazları anında eşleştirme ve canlı sohbete başlama.

### 4. Gizlilik Kalkanı ve Hayalet Modu
- **Hassas Konum Modu**: Seçilen arkadaşlara kesin GPS koordinatlarını iletir.
- **Bulanık Konum Modu**: Koordinatları rastgele gürültüyle öteleyerek kesin adres vermeden yaklaşık bölgeyi paylaşır.
- **Hayalet Modu (Ghost Mode)**: Kullanıcıyı tek tuşla haritadan tamamen gizler; 1 saat, 8 saat veya süresiz gibi geri sayım seçenekleri sunar.

### 5. Anlık Sohbet ve Canlı Tepkiler
- Arkadaşlar arasında uçtan uca birebir ve grup mesajlaşması.
- Harita üzerinde doğrudan arkadaşların profillerine gönderilebilen anlık emoji tepkileri ve dürtmeler.

### 6. Ayak İzleri ve Keşif Haritası (Footprints)
- Sunucu tarafında kalıcı rota izi ifşa etmeden kullanıcının kişisel keşif ve seyahat geçmişini kaydeder.
- Gezilen ve keşfedilen mahalleleri, bölgeleri harita üzerinde açan oyunlaştırılmış keşif katmanı.

### 7. Yerleşik Çok Dilli Altyapı (i18n)
- Harici kütüphane ağırlığı taşımayan, reaktif ve tip güvenli yerelleştirme motoru.
- Sayfa yenilemesine gerek kalmadan **Türkçe (`tr`)**, **İngilizce (`en`)** ve **Rusça (`ru`)** dilleri arasında anında geçiş.

---

## Sistem Mimarisi

NaviSecret; dayanıklılık, güvenlik ve düşük gecikme süresi için tasarlanmış bağımsız bir mikroservis mimarisine sahiptir:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           İstemci Web Uygulaması                            │
│           (React 19, TypeScript, Tailwind CSS 4, Leaflet Harita)            │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP / WebSocket (Port 3000)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Nginx Web Sunucu Konteyneri                         │
│         - Üretim Tek Sayfa Uygulaması (SPA) Sunumu                          │
│         - /api/* ve /ws (WebSocket) İstekleri İçin Ters Vekil (Proxy)       │
│         - Katı Güvenlik Başlıkları (CSP, HSTS, X-Frame-Options)             │
│         - Çift Yığın IPv4 ve IPv6 Desteği                                   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Upstream Ters Vekil
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     NaviSecret API Çekirdeği (Port 8000)                    │
│         - Node.js 22 LTS + Fastify 5.x Asenkron Web İskeleti                │
│         - Yerel Gerçek Zamanlı WebSocket Sunucusu (/ws)                     │
│         - JWT Kimlik Doğrulama ve Bcrypt Parola Şifreleme                   │
│         - Hibrit Veritabanı Motoru (PostgreSQL 16 + SQLite Yedekli)         │
└───────────────────────┬─────────────────────────────┬───────────────────────┘
                        │                             │
                        ▼                             ▼
┌────────────────────────────────┐           ┌────────────────────────────────┐
│      PostgreSQL 16 (:5433)     │           │         Redis 7 (:6379)        │
│  - Mekânsal Koordinat İndeksleri│          │  - Bellek İçi Mekânsal Önbellek│
│  - İlişkisel Veri Bütünlüğü    │           │  - Yüksek Kapasiteli Pub/Sub   │
│  - Kullanıcılar, Kapsüller     │           │  - Anlık Çevrimiçi Durumları   │
└────────────────────────────────┘           └────────────────────────────────┘
```

---

## Teknoloji Yığını

| Katman | Teknoloji | Sürüm | Görevi |
| :--- | :--- | :--- | :--- |
| **Önyüz İskeleti** | React | 19.x | Modern UI bileşenleri ve eşzamanlı durum yönetimi |
| **Programlama Dili** | TypeScript | 5.6.x | İstemci ve sunucu genelinde katı tip güvenliği |
| **Derleyici & Araçlar**| Vite | 6.x | Anlık hot-reload ve optimize edilmiş üretim derlemesi |
| **Stil ve Tasarım** | Tailwind CSS | 4.x | Kompakt ve hızlı modern CSS altyapısı |
| **Kartografya** | Leaflet / React-Leaflet | 1.9.x | Açık kaynaklı ve bağımsız harita motoru |
| **İkon Seti** | Lucide React | Güncel | Vektörel ve performanslı ikonlar |
| **API Sunucusu** | Fastify (Node.js) | 5.x / 22 LTS | Düşük bellek tüketimli, yüksek verimli REST ve WebSocket sunucusu |
| **Ana Veritabanı** | PostgreSQL | 16 Alpine | İlişkisel depolama, mekânsal sorgular ve veri bütünlüğü |
| **Yedek Veritabanı** | SQLite (better-sqlite3) | 3.x | Küçük kurulumlar için otomatik devreye giren gömülü veritabanı |
| **Önbellek & Pub/Sub** | Redis | 7 Alpine | Mekânsal önbellek, konum dağıtımı ve Pub/Sub kuyruğu |
| **Ters Vekil** | Nginx | Alpine | Statik dosya dağıtımı, güvenlik başlıkları ve ters vekillik |
| **Konteynerleştirme** | Docker & Docker Compose | Güncel | Toplamda ~100 MB RAM harcayan 4 konteynerlik dağıtım |

---

## Proje Dizin Yapısı

```
NaviSecret/
├── apps/
│   ├── web/                          # Önyüz Uygulaması (React 19 + Vite)
│   │   ├── src/
│   │   │   ├── components/           # Arayüz Bileşenleri (Harita, Radar, Modallar, Sohbet, Dock)
│   │   │   ├── hooks/                # Özel React Kancaları (useAuth, useLocation, useLanguage)
│   │   │   ├── i18n/                 # Çok Dilli Çeviri Motoru (en, tr, ru sözlükleri ve store)
│   │   │   └── types/                # Veri Tipleri ve Modelleri
│   │   └── vite.config.ts            # Vite Derleme ve Proxy Ayarları
│   │
│   └── server/                       # Sunucu Uygulaması (Fastify + Node.js 22)
│       ├── src/
│       │   ├── database/             # PostgreSQL ve SQLite Hibrit Veritabanı Bağlayıcısı
│       │   ├── modules/              # Modüler Rota Yapısı:
│       │   │   ├── auth/             # Kayıt, Giriş ve Oturum Yönetimi
│       │   │   ├── capsules/         # Konuma Bağlı Gizli Kapsüller ve Kilit Açma
│       │   │   ├── chat/             # Birebir ve Grup Sohbet Rotaları
│       │   │   ├── footprints/       # Ayak İzleri ve Keşif Geçmişi
│       │   │   ├── groups/           # Arkadaş Grupları ve Yönetimi
│       │   │   ├── places/           # Kaydedilen Favori Mekanlar
│       │   │   ├── presence/         # Canlı Konum Bildirimi ve Hayalet Modu
│       │   │   ├── reactions/        # Harita Üzerinden Emoji Tepkileri
│       │   │   └── social/           # Arkadaşlık İstekleri, Kabul ve Engelleme
│       │   ├── realtime/             # Yerel WebSocket Sunucusu ve Olay Yöneticisi
│       │   ├── redis/                # Redis Pub/Sub ve Önbellek Bağlayıcısı
│       │   └── index.ts              # Sunucu Başlangıç Dosyası
│       └── Dockerfile                # Üretim Sunucu Docker Dosyası
│
├── docker/
│   ├── nginx/
│   │   └── default.conf              # Nginx Ters Vekil ve Güvenlik Ayarları
│   └── init-db/
│       └── 01-schema.sql             # PostgreSQL Başlangıç Veritabanı Şeması
│
├── assets/                           # Vektörel Logolar, İkonlar ve Mimari Şemaları
├── compose.yaml                      # 4 Servisli Docker Compose Tanımı
├── Dockerfile                        # Üretim Web Önyüz Docker Dosyası
└── package.json                      # Monorepo Çalışma Alanı Yapılandırması
```

---

## Docker ile Üretim Ortamında Kurulum

NaviSecret, tek bir Docker Compose komutuyla çalışmaya hazırdır.

### Gereksinimler

- **Docker Engine** (v24.0 veya üzeri)
- **Docker Compose** (v2.20 veya üzeri)
- Açık bağlantı noktaları: `3000` (Web Arayüzü) ve `8000` (API Ağ Geçidi)

### Hızlı Kurulum

1. **Projeyi klonlayın:**
   ```bash
   git clone https://github.com/ersinsandal/NaviSecret.git
   cd NaviSecret
   ```

2. **Ortam değişkenlerini hazırlayın:**
   ```bash
   cp .env.example .env
   ```
   *`.env` dosyası içerisindeki `JWT_SECRET` ve veritabanı şifrelerini isteğinize göre güncelleyin.*

3. **Tüm konteyner yığınını derleyin ve başlatın:**
   ```bash
   docker compose up -d --build
   ```

4. **Konteynerlerin sağlık durumunu kontrol edin:**
   ```bash
   docker compose ps
   ```

   Dört servisin de **Up (healthy)** durumunda olması gerekir:
   ```
   NAME                  IMAGE                   STATUS                    PORTS
   navisecret_api        navisecret-api:latest   Up (healthy)              0.0.0.0:8000->8000/tcp
   navisecret_postgres   postgres:16-alpine      Up (healthy)              0.0.0.0:5433->5432/tcp
   navisecret_redis      redis:7-alpine          Up (healthy)              0.0.0.0:6379->6379/tcp
   navisecret_web        navisecret-web:latest   Up (healthy)              0.0.0.0:3000->80/tcp
   ```

5. **Uygulamaya bağlanın:**
   - Web Arayüzü: `http://localhost:3000`
   - API Sağlık Kontrolü: `http://localhost:8000/health`
   - Canlı WebSocket Sunucusu: `ws://localhost:8000/ws`

---

## Yerel Geliştirme Ortamı

Kodları doğrudan kendi bilgisayarınızda çalıştırmak ve geliştirmek için:

### Gereksinimler

- **Node.js**: `22.x LTS`
- **pnpm**: `10.x` veya üzeri

### Adımlar

1. **Bağımlılıkları yükleyin:**
   ```bash
   pnpm install
   ```

2. **API sunucusunu başlatın:**
   ```bash
   pnpm dev:server
   ```
   *Fastify sunucusu hot-reload desteğiyle `http://localhost:8000` adresinde çalışır.*

3. **Önyüz uygulamasını başlatın:**
   ```bash
   pnpm dev:web
   ```
   *Vite önyüzü `http://localhost:5173` adresinde açılır.*

4. **Üretim paketlerini derleyin:**
   ```bash
   pnpm build:server
   pnpm build:web
   ```

---

## REST API Referansı

Korumalı tüm uç noktalar `Authorization: Bearer <token>` başlığı gerektirir.

### Kimlik Doğrulama (`/api/auth`)
| Yöntem | Uç Nokta | Açıklama |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Kullanıcı adı ve parola ile yeni hesap oluşturur |
| `POST` | `/api/auth/login` | Giriş yapar ve JWT erişim belirteci döner |
| `GET` | `/api/auth/me` | Giriş yapmış kullanıcının profilini getirir |
| `POST` | `/api/auth/avatar` | Kullanıcı profil resmini günceller |

### Konum ve Görünürlük (`/api/presence`)
| Yöntem | Uç Nokta | Açıklama |
| :--- | :--- | :--- |
| `POST` | `/api/presence/pulse` | Anlık konum sinyali gönderir (enlem, boylam, doğruluk) |
| `GET` | `/api/presence/friends` | Görünür durumdaki arkadaşların anlık koordinatlarını alır |
| `POST` | `/api/presence/ghost` | Hayalet Modunu açar veya kapatır (süre tanımlanabilir) |

### Gizli Kapsüller (`/api/capsules`)
| Yöntem | Uç Nokta | Açıklama |
| :--- | :--- | :--- |
| `POST` | `/api/capsules` | Koordinata kilitli yeni bir kapsül oluşturur |
| `GET` | `/api/capsules/nearby` | Kullanıcının yakın çevresindeki kapsülleri listeler |
| `POST` | `/api/capsules/:id/unlock` | Yakınlık doğrulandığında kapsül içeriğini açar |

### Sosyal ve Arkadaşlar (`/api/social`)
| Yöntem | Uç Nokta | Açıklama |
| :--- | :--- | :--- |
| `GET` | `/api/social/friends` | Onaylanmış arkadaş listesini döner |
| `POST` | `/api/social/request` | Kullanıcı adına veya etiketine arkadaşlık isteği gönderir |
| `POST` | `/api/social/accept` | Gelen arkadaşlık isteğini kabul eder |
| `POST` | `/api/social/block` | Bir kullanıcının konum erişimini engeller |

### Sohbet ve Mesajlaşma (`/api/chat`)
| Yöntem | Uç Nokta | Açıklama |
| :--- | :--- | :--- |
| `GET` | `/api/chat/conversations` | Aktif sohbetleri ve son mesajları listeler |
| `GET` | `/api/chat/:userId/messages` | Belirli bir arkadaşla olan mesaj geçmişini getirir |
| `POST` | `/api/chat/:userId/messages` | Yeni bir doğrudan mesaj gönderir |

---

## Gerçek Zamanlı WebSocket Protokolü

İstemciler yetkilendirme belirteci ile `ws://localhost:8000/ws` adresine bağlanır:

```json
// İstemci -> Sunucu: Konum Güncellemesi
{
  "type": "LOCATION_PULSE",
  "data": {
    "latitude": 41.0082,
    "longitude": 28.9784,
    "accuracy": 8.5
  }
}

// Sunucu -> İstemci: Arkadaş Konumu Değişti
{
  "event": "FRIEND_LOCATION",
  "data": {
    "userId": "usr_7a8b9c",
    "username": "alex",
    "latitude": 41.0089,
    "longitude": 28.9790,
    "updatedAt": 1792261500000
  }
}
```

---

## Güvenlik ve Gizlilik Standartları

- **Bcrypt Parola Güvenliği**: Parolalar veritabanına kaydedilmeden önce yüksek tuzlama (salt) döngüleriyle şifrelenir.
- **İzole Ağ Mimarisi**: PostgreSQL ve Redis konteynerleri dış internete kapalıdır; yalnızca Nginx ve Fastify API dış istekleri kabul eder.
- **Coğrafi Sınır Güvencesi**: Kapsül içeriği, kullanıcının koordinatları belirlenen açılma alanına gerçekten girmedikçe sunucu tarafından gizli tutulur.
- **Üçüncü Taraf Takip Yok**: Uygulama içerisinde telemetri, izleme pikselleri veya reklam kütüphaneleri bulunmaz.

---

## Lisans

Bu proje **MIT Lisansı** ile lisanslanmıştır — ayrıntılar için [LICENSE](LICENSE) dosyasına bakabilirsiniz.

```
Telif Hakkı (c) 2026 Ersin Sandal (SliferSoft)
```
