<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.svg" />
    <source media="(prefers-color-scheme: light)" srcset="assets/logo-light.svg" />
    <img src="assets/logo-dark.svg" alt="NaviSecret Logo" width="340" />
  </picture>
</p>

<p align="center">
  <strong>Kurumsal Düzeyde, Gizlilik Öncelikli Mekânsal Bilişim ve Konuma Bağlı Şifreli İçerik Platformu</strong>
</p>

<p align="center">
  <a href="README.md">
    <img src="https://img.shields.io/badge/DOCUMENTATION-READ%20IN%20ENGLISH-0052cc?style=for-the-badge&logo=googledocs&logoColor=white" alt="English Documentation" />
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
  <img src="https://img.shields.io/badge/ZKP-Groth16-orange.svg?style=flat-square" alt="Groth16 ZKP">
</p>

---

## Yönetici Özeti

**NaviSecret**, açık kaynaklı, tam bağımsız ve gizlilik odaklı bir mekânsal bilişim platformudur. Kullanıcıları sürekli gözetim altında tutmadan veya koordinat verilerini merkezi sunucularda açık metin olarak depolamadan; eşler arası gerçek zamanlı konum paylaşımı, fiziksel konuma kilitli şifreli veri bırakma (geo-drop), diferansiyel gizlilik destekli mekânsal günlükleme ve sıfır bilgi yakınlık kanıtları (ZKP) sunar.

Geleneksel konuma dayalı servisler (LBS), kullanıcıların hassas GPS izlerini merkezi sunucularda şifresiz biçimde biriktirmekte; bu durum ciddi veri sızıntısı ve gözetim zafiyetleri doğurmaktadır. NaviSecret bu yapıyı **kriptografik konum kapılama (cryptographic location gating)** mimarisiyle yeniden tanımlar:
- Konum verileri, istemci cihazdan çıkmadan önce **Yerel Diferansiyel Gizlilik (Local Differential Privacy / Planar Laplace Gürültüsü)** ile dinamik olarak bulanıklaştırılabilir.
- Fiziksel noktalara bırakılan dijital sırlar (dosyalar, mesajlar, medyalar) istemci tarafında **AES-256-GCM** ile şifrelenir; şifre çözme anahtarı yalnızca hedefin coğrafi sınırları (geofence) içerisine girildiğinde yerinde türetilir (PBKDF2 mekânsal anahtar türetimi).
- Yakınlık doğrulaması, kullanıcının gerçek koordinatlarını $(\text{enlem}, \text{boylam})$ sunucuya veya üçüncü taraflara açık etmeden **Groth16 Sıfır Bilgi İspatları (zk-SNARKs)** ile matematiksel olarak kanıtlanabilir.
- Platform, harici üçüncü taraf BaaS sistemlerine (Supabase, Firebase, Google API vb.) ihtiyaç duymaksızın; yalnızca ~100 MB RAM tüketen, 4 konteynerlik optimize bir Docker Compose kümesi üzerinde tamamen kendi kendine yeten (self-hosted) bir yapıda çalışır.

---

## Sistem Mimarisi

NaviSecret; düşük gecikme, kriptografik güvenlik ve minimum donanım kaynağı tüketimi hedefiyle tasarlanmış asenkron ve olay güdümlü bir mikroservis mimarisine sahiptir.

<p align="center">
  <img src="assets/system-overview.svg" alt="NaviSecret Sistem Mimarisi" width="920" />
</p>

### Altyapı Bileşenleri ve Veri Akışı

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            İstemci Tarayıcı / PWA                           │
│           (React 19, Tailwind CSS 4, Leaflet, Web Crypto API)               │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP / WebSocket (Ters Vekil)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Nginx Web Konteyneri (:3000)                        │
│         - Statik SPA Dağıtımı ve Önbellek Yönetimi                          │
│         - /api/* ve /ws (WebSocket) İstekleri İçin Ters Vekil (Proxy)       │
│         - Katı CSP, HSTS Güvenlik Başlıkları ve Çift Yığın (IPv4 / IPv6)    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Upstream Reverse Proxy
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     NaviSecret API Çekirdeği (:8000)                        │
│         - Node.js 22 LTS + Fastify 5.x İskeleti                             │
│         - Yüksek Verimli Yerel WebSocket Ağ Geçidi                          │
│         - JWT Kimlik Doğrulama ve Yetkilendirme Motoru                      │
│         - Hibrit Veritabanı Yöneticisi (PostgreSQL 16 + Gömülü SQLite)      │
└───────────────────────┬─────────────────────────────┬───────────────────────┘
                        │                             │
                        ▼                             ▼
┌────────────────────────────────┐           ┌────────────────────────────────┐
│      PostgreSQL 16 (:5433)     │           │         Redis 7 (:6379)        │
│  - Mekânsal Geometri İndeksleri│           │  - Bellek İçi Mekânsal Önbellek│
│  - İlişkisel Veri Bütünlüğü    │           │  - Anlık Pub/Sub Mesaj Dağıtımı│
│  - RLS Güvenlik Politikaları   │           │  - Oturum Durumu Yönetimi      │
└────────────────────────────────┘           └────────────────────────────────┘
```

---

## Temel Modüller ve Yetenekler

### 1. NaviDrop: Konuma Bağlı Şifreli İçerik
NaviDrop, kullanıcıların dijital içerikleri (metin, görsel, ses, gizli arşivler) belirli fiziksel koordinatlara sabitlemesine olanak tanır.
- **İstemci Uçtan Uca Şifreleme**: Dosyalar kullanıcının tarayıcısında `AES-256-GCM` algoritmasıyla şifrelenir.
- **Mekânsal Anahtar Türetimi**: Şifre çözme anahtarı, yalnızca hedef coğrafi sınır doğrulandığında PBKDF2 ve yüksek entropili tuzlar (salt) kullanılarak yerinde üretilir.
- **Sıfır Bilgili Depolama**: Sunucu ve veritabanı içeriği yalnızca şifreli ikili blok (ciphertext) olarak saklar. Anahtar veya içerik hiçbir koşulda sunucuya açık metin olarak ulaşmaz.

<p align="center">
  <img src="assets/geodrop-flow.svg" alt="GeoDrop İşleyişi" width="700" />
</p>

### 2. NaviBump ve Canlı Sosyal Harita
- **Dinamik Yakınlık Eşleşmesi (Proximity Pairing)**: Fiziksel olarak yan yana gelen kullanıcılar cihazlarını güvenli bir el sıkışma (handshake) protokolüyle hızlıca eşleştirebilir.
- **Gerçek Zamanlı WebSocket İletimi**: Konum güncellemeleri ve bildirimler Redis Pub/Sub ile Fastify WebSockets üzerinden milisaniye düzeyinde eşlere dağıtılır.
- **Özgür Harita Katmanları**: Tescilli ve ücretli harita sağlayıcılarına bağımlı kalmaksızın OpenStreetMap ve Esri uydu katmanlarını yerel olarak destekler.

### 3. NaviZKP: Sıfır Bilgi Yakınlık Kanıtları
- Circom diliyle geliştirilmiş Groth16 zk-SNARK devrelerini temel alır.
- İspatçı ($x_1, y_1$), doğrulayıcıya ($x_0, y_0$ merkezli ve $R$ yarıçaplı bölge) kesin koordinatlarını söylemeksizin şu bağıntıyı ispatlar:
  $$(x_1 - x_0)^2 + (y_1 - y_0)^2 \le R^2$$
- Doğrulama işlemi ispatçının tam konumu hakkında **hiçbir bilgi sızdırmaz**.

<p align="center">
  <img src="assets/zkp-flow.svg" alt="ZKP İşleyişi" width="700" />
</p>

### 4. Diferansiyel Gizlilik ve Hayalet Modu (Ghost Mode)
- **Düzlemsel Laplace Gürültüsü**: Konumunun tam bilinmesini istemeyen kullanıcılar için koordinatlar cihazdan ayrılmadan önce yerel diferansiyel gizlilik gürültüsüyle bulanıklaştırılır.
- **Mekânsal Izgara Sabitleme (Grid Snapping)**: Rota rekonstrüksiyon saldırılarını önlemek amacıyla koordinatlar belirli geometrik hücre merkezlerine yuvarlanır.
- **Hayalet Modu**: Kullanıcının haritadaki görünürlüğünü tek tıkla tamamen sonlandıran ve isteğe bağlı süre aşımı tanımlanabilen acil gizlilik kalkanı.

### 5. Çok Dilli Kurumsal Mimari (i18n)
- Harici devasa kütüphane bağımlılıkları olmaksızın geliştirilmiş, reaktif ve tam tip güvenli yerelleştirme motoru.
- **İngilizce (`en`)**, **Türkçe (`tr`)** ve **Rusça (`ru`)** dilleri arasında sayfa yenilemesi gerektirmeyen dinamik geçiş.
- Kimlik doğrulama ekranları, harita kontrolleri, modallar, drop oluşturucular ve sistem bildirimlerinin tamamını kapsayan eksiksiz sözlük yapısı.
- Tarayıcı `localStorage` ve HTML `lang` nitelikleriyle senkronize durum kalıcılığı.

---

## Teknik Özellikler Tablosu

| Katman | Bileşen | Teknoloji / Kütüphane | Tercih Nedeni |
| :--- | :--- | :--- | :--- |
| **Önyüz (Frontend)** | Tek Sayfa Uygulaması (SPA) | React 19, TypeScript 5.6, Vite 6 | Yüksek render hızı, eşzamanlı kip, anlık derleme |
| **Görsel Arayüz** | Tasarım ve İkonografi | Tailwind CSS 4, Lucide React | Modern CSS motoru, asgari paket boyutu |
| **Kartografya** | Harita ve Konumlandırma | Leaflet 1.9, React-Leaflet | Açık kaynaklı, harici API anahtarı gerektirmeyen bağımsız harita motoru |
| **Sunucu (Backend)** | API Ağ Geçidi ve WebSocket | Node.js 22 LTS, Fastify 5.x | Düşük bellek tüketimi, yüksek I/O işleme kapasitesi |
| **Veritabanı** | İlişkisel ve Mekânsal Motor | PostgreSQL 16 (SQLite Yedekli) | ACID uyumluluğu, mekânsal indeksleme, çift motor esnekliği |
| **Önbellek / Dağıtıcı**| Canlı İletişim & Pub/Sub | Redis 7 Alpine | Anlık konum dağıtımında mikrosaniye seviyesinde gecikme |
| **Kriptografi** | İstemci Tarafı Güvenlik | Web Crypto API, snarkjs, circomlibjs | AES-GCM, PBKDF2 ve Groth16 ispatlarında yerel tarayıcı performansı |
| **Dağıtım** | Konteynerleştirme | Docker, Docker Compose, Nginx Alpine | Toplamda yalnızca ~100 MB RAM tüketen bağımsız mikroservis yığını |

---

## Monorepo Dizin Yapısı

```
navisecret/
├── apps/
│   ├── web/                          # Üretim Web Uygulaması (SPA)
│   │   ├── src/
│   │   │   ├── components/           # Arayüz Bileşenleri (Modallar, Harita, Kontroller, Dil Seçici)
│   │   │   ├── hooks/                # React Kancaları (useAuth, useLocation, useLanguage)
│   │   │   ├── i18n/                 # Çok Dilli Çeviri Motoru (en, tr, ru sözlükleri ve reaktif store)
│   │   │   └── types/                # Önyüz TypeScript Tipleri
│   │   └── vite.config.ts            # Vite Derleme Yapılandırması
│   │
│   └── server/                       # Üretim API Sunucusu (Fastify)
│       ├── src/
│       │   ├── database/             # PostgreSQL / SQLite Hibrit Bağlantı ve Şemalar
│       │   ├── routes/               # Modüler REST Rotaları (auth, drops, friends, location)
│       │   ├── websocket/            # Gerçek Zamanlı WebSocket Sunucusu
│       │   └── index.ts              # Sunucu Giriş Noktası
│       └── Dockerfile                # Üretim Node.js 22 Alpine Konteyner Dosyası
│
├── packages/
│   ├── sdk/                          # @navisecret/sdk — Konum Paylaşım İstemci Kütüphanesi
│   └── geo-drop/                     # @navisecret/geo-drop — Kriptografik Drop Motoru
│       ├── circuits/                 # Circom zk-SNARK Yakınlık Devreleri
│       └── contracts/                # İsteğe Bağlı EVM Akıllı Sözleşmeleri (Solidity)
│
├── docker/
│   ├── nginx/
│   │   └── default.conf              # Nginx Ters Vekil ve Güvenlik Başlıkları
│   └── init-db/
│       └── 01-schema.sql             # PostgreSQL Başlangıç Şeması
│
├── docs/                             # Mühendislik Raporları ve Dağıtım Dokümantasyonu
├── assets/                           # Vektörel Şemalar, Akış Grafikleri ve Logolar
├── compose.yaml                      # 4 Servisli Docker Compose Orkestrasyonu
├── Dockerfile                        # Nginx Önyüz Konteyner Dosyası
└── package.json                      # pnpm Monorepo Çalışma Alanı Yapılandırması
```

---

## Docker ile Üretim Ortamında Dağıtım

NaviSecret, doğrudan çalıştırılmaya hazır tek bir Docker Compose dosyasıyla sunulur. Tüm yığın, kendi aralarında izole bir köprü (bridge) ağı üzerinden haberleşen dört konteynerden meydana gelir.

### Gereksinimler

- **Docker Engine**: Versiyon 24.0 veya üzeri
- **Docker Compose**: Versiyon 2.20 veya üzeri
- Erişilebilir bağlantı noktaları: `3000` (Web Arayüzü) ve `8000` (API Ağ Geçidi)

### Dağıtım Adımları

1. **Depoyu yerel diske klonlayın:**
   ```bash
   git clone https://github.com/ersinsandal/NaviSecret.git
   cd NaviSecret
   ```

2. **Ortam değişkenlerini hazırlayın:**
   ```bash
   cp .env.example .env
   ```
   *`.env` dosyasını açarak `JWT_SECRET`, veritabanı parolaları ve etki alanı adreslerinizi belirleyin.*

3. **Üretim konteyner yığınını derleyin ve başlatın:**
   ```bash
   docker compose up -d --build
   ```

4. **Konteyner durumlarını ve sağlık kontrollerini denetleyin:**
   ```bash
   docker compose ps
   ```

   Beklenen çıktı:
   ```
   NAME                  IMAGE                   STATUS                    PORTS
   navisecret_api        navisecret-api:latest   Up (healthy)              0.0.0.0:8000->8000/tcp
   navisecret_postgres   postgres:16-alpine      Up (healthy)              0.0.0.0:5433->5432/tcp
   navisecret_redis      redis:7-alpine          Up (healthy)              0.0.0.0:6379->6379/tcp
   navisecret_web        navisecret-web:latest   Up (healthy)              0.0.0.0:3000->80/tcp
   ```

5. **Uygulamaya erişin:**
   - Web Arayüzü: `http://localhost:3000`
   - API Sağlık Uç Noktası: `http://localhost:8000/health`
   - Canlı WebSocket Ağ Geçidi: `ws://localhost:8000/ws`

---

## Yerel Geliştirme Ortamı

TypeScript monoreposunda yerel kod geliştirmesi yapmak için:

### Gereksinimler

- **Node.js**: `22.x LTS`
- **pnpm**: `10.x` veya üzeri

### Adım Adım Kurulum

1. **Bağımlılıkları yükleyin:**
   ```bash
   pnpm install
   ```

2. **Çalışma alanı paketlerini derleyin:**
   ```bash
   pnpm build
   ```

3. **Fastify Backend Sunucusunu çalıştırın:**
   ```bash
   pnpm dev:server
   ```
   *Sunucu `http://localhost:8000` adresinde hot-reload destekli olarak başlar.*

4. **Vite Web Arayüzünü çalıştırın:**
   ```bash
   pnpm dev:web
   ```
   *Web uygulaması `http://localhost:5173` adresinde başlatılır.*

5. **Doğrulama ve test paketini çalıştırın:**
   ```bash
   pnpm test
   ```

---

## REST ve WebSocket API Referansı

### Kimlik Doğrulama Rotaları

| Yöntem | Uç Nokta | Yetkilendirme | Açıklama |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Herkese Açık | Yeni kullanıcı hesabı oluşturur |
| `POST` | `/api/auth/login` | Herkese Açık | Kullanıcıyı doğrular ve JWT erişim belirteci üretir |
| `GET` | `/api/auth/me` | Bearer Token | Giriş yapmış kullanıcının profil bilgilerini getirir |
| `POST` | `/api/auth/avatar` | Bearer Token | Kullanıcı profil resmini günceller (multipart) |

### Konum ve Sosyal Etkileşim Rotaları

| Yöntem | Uç Nokta | Yetkilendirme | Açıklama |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/location/update` | Bearer Token | Yeni koordinatları sisteme iletir (gürültü uygulanabilir) |
| `GET` | `/api/location/friends` | Bearer Token | Görünür durumdaki arkadaşların anlık konumlarını döner |
| `POST` | `/api/friends/request` | Bearer Token | Kullanıcı adı veya kod ile arkadaşlık isteği gönderir |
| `POST` | `/api/friends/accept` | Bearer Token | Gelen arkadaşlık isteğini onaylar |
| `POST` | `/api/friends/block` | Bearer Token | İlgili kullanıcının konum erişimini engeller |

### Şifreli GeoDrop Rotaları

| Yöntem | Uç Nokta | Yetkilendirme | Açıklama |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/drops` | Bearer Token | Coğrafi sınıra kilitli şifreli içerik bloğu bırakır |
| `GET` | `/api/drops/nearby` | Bearer Token | Belirtilen koordinat alanındaki drop başlıklarını listeler |
| `POST` | `/api/drops/:id/unlock` | Bearer Token | Yakınlık ispatını sunarak drop içeriğini açar |

### Canlı WebSocket Protokolü

Yetkilendirme başlığı veya sorgu parametresiyle `ws://localhost:8000/ws` adresine bağlanılır:

```json
// İstemciden giden konum güncelleme mesajı
{
  "type": "LOCATION_UPDATE",
  "payload": {
    "latitude": 41.0082,
    "longitude": 28.9784,
    "accuracy": 12.5,
    "timestamp": 1792261400000
  }
}

// Sunucudan yetkili eşlere yayınlanan canlı veri
{
  "event": "PEER_LOCATION",
  "data": {
    "userId": "usr_99f2a4",
    "displayName": "Alex",
    "latitude": 41.0081,
    "longitude": 28.9780,
    "status": "online"
  }
}
```

---

## Kriptografik ve Matematiksel Modeller

### 1. Mekânsal Anahtar Türetimi
Fiziksel drop içeriklerinin şifre çözme anahtarı hiçbir sunucu etkileşimi olmadan doğrudan konumdan türetilir:

$$K = \text{PBKDF2}(\text{PRF}=\text{HMAC-SHA256},\ S=\text{Geohash}_8(\text{lat}, \text{lon}) \parallel \text{Salt}_{\text{drop}},\ c=100\,000,\ \text{len}=256)$$

Elde edilen $K$ anahtarı `AES-256-GCM` ile veriyi deşifre eder:

$$P = \text{AES-GCM-Decrypt}(K,\ IV,\ C,\ T)$$

Burada $C$ şifreli metin, $IV$ başlatma vektörü ve $T$ ise 128 bitlik kimlik doğrulama etiketidir.

### 2. Diferansiyel Gizlilik Pertürbasyonu
Bulanıklaştırma modu aktif edildiğinde kesin koordinatlar iki boyutlu Düzlemsel Laplace dağılımı ile ötelenir:

$$f(r, \theta) = \frac{\epsilon^2}{2\pi} e^{-\epsilon r}$$

Burada $\epsilon$ gizlilik bütçesini temsil eder. Kutupsal yer değiştirme $(r, \theta)$, ağ üzerinden iletilmeden önce yeniden WGS-84 koordinat düzlemine dönüştürülür.

---

## Güvenlik ve Gizlilik Prensipleri

- **Sıfır Bilgi Güvenlik Modeli**: Sunucu altyapısı hassas içerikler için güvenilmeyen bir aracı konumundadır. Şifrelenmemiş hiçbir veri sunucuya ulaşmaz.
- **Dışa Bağımsız Altyapı**: Supabase, Firebase veya Google gibi merkezi servis sağlayıcılarına herhangi bir telemetri ya da konum verisi aktarılmaz.
- **İletim Güvenliği**: Konteynerler arası iletişim dahili Docker ağı içerisinde gerçekleşir; Nginx ters vekili modern TLS şifreleme protokolleriyle trafiği sonlandırır.
- **Katı İçerik Güvenlik Politikası (CSP)**: XSS ve veri sızıntılarını önleyen CSP başlıkları tüm sayfa isteklerinde uygulanır.

---

## Katkıda Bulunma

Güvenlik araştırmacılarının ve yazılım geliştiricilerin projeye katkıları memnuniyetle karşılanır.

1. Depoyu GitHub üzerinde forklayın.
2. Yeni bir dal (branch) açın: `git checkout -b feature/mekansal-iyilestirme`.
3. Değişikliklerinizi commit edin: `git commit -m 'feat: mekansal ispat optimizasyonu yapildi'`.
4. Testlerin geçtiğinden emin olun: `pnpm test`.
5. Dalınızı GitHub'a gönderin: `git push origin feature/mekansal-iyilestirme`.
6. Bir Pull Request oluşturun.

Ayrıntılı yönergeler için [CONTRIBUTING.md](CONTRIBUTING.md) dosyasını inceleyebilirsiniz.

---

## Lisans

Bu proje **MIT Lisansı** ile lisanslanmıştır — ayrıntılar için [LICENSE](LICENSE) dosyasına göz atabilirsiniz.

```
Telif Hakkı (c) 2026 Ersin Sandal (SliferSoft)
```
