# TodoApp

Full-stack görev yönetimi uygulaması. React + Node.js + PostgreSQL ile geliştirilmiştir.

## Özellikler

- Görev oluşturma, düzenleme, silme ve arşivleme
- Öncelik seviyeleri (Düşük, Orta, Yüksek, Kritik)
- Durum takibi (Bekliyor, Devam Ediyor, Tamamlandı)
- Projeler ve etiketlerle organizasyon
- Alt görevler (hiyerarşik yapı)
- Zengin metin editörü (Tiptap)
- Dosya ekleme
- Tekrarlayan görevler (günlük, haftalık, aylık, yıllık)
- Takvim görünümü
- Eisenhower Matrisi
- Odak modu
- Dashboard & istatistikler
- JWT tabanlı kimlik doğrulama
- E-posta ile şifre sıfırlama
- Açık/koyu tema

## Tech Stack

**Frontend**
- React 19 + TypeScript
- Vite
- Tailwind CSS
- Zustand (state management)
- TanStack React Query
- React Router DOM v7
- Tiptap (rich text editor)
- dnd-kit (drag & drop)

**Backend**
- Node.js + Express 5
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT (access + refresh token)
- Multer (dosya yükleme)
- Nodemailer (e-posta)

## Kurulum

### Gereksinimler

- Node.js
- PostgreSQL
- npm

### Adımlar

```bash
# Repoyu klonla
git clone https://github.com/yusufkus1/Project1.git
cd Project1

# Backend bağımlılıklarını kur
cd backend
npm install

# Frontend bağımlılıklarını kur
cd ../frontend
npm install
```

### Ortam Değişkenleri

`backend/.env` dosyası oluşturun:

```env
DATABASE_URL=postgresql://todouser:todopass123@localhost:5432/todoapp
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
PORT=3001
FRONTEND_URL=http://localhost:5173
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-email-password
```

### Veritabanı

```bash
cd backend
npx prisma migrate dev
```

## Çalıştırma

```bash
# Tek komutla her şeyi başlat (önerilen)
bash start.sh
```

veya manuel:

```bash
# Backend (port 3001)
cd backend && npm run dev

# Frontend (port 5173)
cd frontend && npm run dev
```

Uygulama: [http://localhost:5173](http://localhost:5173)  
API: [http://localhost:3001](http://localhost:3001)

## API Endpoints

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/auth/register` | Kayıt |
| POST | `/api/auth/login` | Giriş |
| POST | `/api/auth/forgot-password` | Şifre sıfırlama |
| GET/POST | `/api/tasks` | Görevler |
| GET/POST | `/api/projects` | Projeler |
| GET/POST | `/api/tags` | Etiketler |
| GET/PUT | `/api/users` | Kullanıcı profili |

## Proje Yapısı

```
Project1/
├── backend/
│   ├── src/
│   │   ├── controllers/    # İstek yöneticileri
│   │   ├── routes/         # API rotaları
│   │   ├── middleware/     # Auth, dosya yükleme
│   │   └── index.ts        # Uygulama giriş noktası
│   └── prisma/
│       └── schema.prisma   # Veritabanı şeması
├── frontend/
│   └── src/
│       ├── pages/          # Sayfalar (13 adet)
│       ├── components/     # Bileşenler
│       ├── api/            # API istemcisi
│       ├── store/          # Zustand store
│       └── hooks/          # Custom hooklar
└── start.sh                # Başlatma scripti
```
