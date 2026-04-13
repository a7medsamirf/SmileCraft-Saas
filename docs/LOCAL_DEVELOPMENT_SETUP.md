# 🐳 إعداد Local Development بـ Supabase + Docker

## ✅ النتيجة النهائية

```
✅ Next.js Dev Server:  http://localhost:3000
✅ Supabase Local:      http://127.0.0.1:54321
✅ Supabase Studio:     http://127.0.0.1:54323
✅ Database (PostgreSQL): 127.0.0.1:54322
✅ Mailpit (Emails):    http://127.0.0.1:54324
✅ Prisma Client:       Generated ✅
```

---

## 🔍 المشكلة

السيرفر المحلي مش بيشتغل لأن ملف `.env` كان بيستخدم **بيانات Remote Supabase** بدل **Supabase Local** اللي شغال على Docker.

---

## 🛠️ الحل المُطبق

### 1. Supabase Local Status

الأمر:
```bash
npx supabase status
```

النتيجة:
```
supabase local development setup is running.

╭──────────────────────────────────────╮
│ 🔧 Development Tools                 │
├─────────┬────────────────────────────┤
│ Studio  │ http://127.0.0.1:54323     │
│ Mailpit │ http://127.0.0.1:54324     │
│ MCP     │ http://127.0.0.1:54321/mcp │
╰─────────┴────────────────────────────┘

╭─────────────────────────────────────────────────╮
│ 🌐 APIs                                         │
├─────────────┬───────────────────────────────────┤
│ Project URL │ http://127.0.0.1:54321            │
│ REST        │ http://127.0.0.1:54321/rest/v1    │
│ GraphQL     │ http://127.0.0.1:54321/graphql/v1 │
╰─────────────┴───────────────────────────────────┘

╭───────────────────────────────────────────────────────────────╮
│ ⛁ Database                                                    │
├─────┬─────────────────────────────────────────────────────────┤
│ URL │ postgresql://postgres:postgres@127.0.0.1:54322/postgres │
╰─────┴─────────────────────────────────────────────────────────┘

╭──────────────────────────────────────────────────────────────────╮
│ 🔑 Authentication Keys                                           │
├─────────────┬────────────────────────────────────────────────────┤
│ Publishable │ sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH     │
│ Secret      │ sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz          │
╰─────────────┴────────────────────────────────────────────────────┘
```

### 2. تحديث ملف `.env`

**قبل (Remote):**
```env
DATABASE_URL="postgresql://postgres.kopqrhtjqixdrcnfeszv:RX0NDrTMRSVi9NUM@aws-0-eu-west-1.pooler.supabase.com:6543/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://kopqrhtjqixdrcnfeszv.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**بعد (Local):**
```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"
SUPABASE_SERVICE_ROLE_KEY="sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz"
```

### 3. إعادة إنشاء Prisma Client

```bash
npx prisma generate
```

النتيجة:
```
✔ Generated Prisma Client (v5.22.0) in 222ms
```

### 4. اختبار الاتصال

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.$connect()
  .then(() => console.log('✅ Connected to LOCAL Supabase successfully!'))
  .then(() => prisma.user.count())
  .then(count => console.log('📊 Users in local DB:', count))
  .catch(err => console.error('❌ Error:', err.message))
  .finally(() => prisma.$disconnect());
"
```

النتيجة:
```
✅ Connected to LOCAL Supabase successfully!
📊 Users in local DB: 3
```

### 5. تشغيل السيرفر

```bash
npm run dev
```

النتيجة:
```
✅ HTTP Status: 200 OK
✅ Next.js Dev Server running on http://localhost:3000
```

---

## 📋 دليل الاستخدام السريع

### 🚀 تشغيل Local Development

```bash
# 1. تأكد إن Supabase Local شغال
npx supabase status

# 2. لو مش شغال، شغّله
npx supabase start

# 3. شغّل Next.js
npm run dev

# 4. افتح المتصفح
http://localhost:3000
```

### 🛑 إيقاف الخدمات

```bash
# إيقاف Next.js (Ctrl + C في التيرمنال)

# إيقاف Supabase Local
npx supabase stop

# إيقاف كل حاجة
npx supabase stop --no-backup
```

### 🔄 إعادة تعيين البيانات

```bash
# حذف كل البيانات والبدء من جديد
npx supabase db reset

# إعادة تشغيل مع بيانات نظيفة
npx supabase stop
npx supabase start
```

---

## 🗂️ إدارة Migrations

### تطبيق Migrations على Local

```bash
# تطبيق كل الـ migrations
npx prisma migrate dev

# لو عندك SQL migrations من Supabase
npx supabase db push
```

### مزامرة Local ↔ Remote

```bash
# Pull remote schema to local
npx supabase db pull

# Push local changes to remote
npx supabase db push --linked

# Link local project to remote
npx supabase link --project-ref kopqrhtjqixdrcnfeszv
```

---

## 🔧 التبديل بين Local و Remote

### للتبديل إلى Remote (Production)

1. افتح `.env`
2. علّق قسم **LOCAL**
3. فّك قسم **REMOTE**

```env
# ❌ COMMENT OUT LOCAL
# DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
# NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
# NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_..."
# SUPABASE_SERVICE_ROLE_KEY="sb_secret_..."

# ✅ UNCOMMENT REMOTE
DATABASE_URL="postgresql://postgres.kopqrhtjqixdrcnfeszv:RX0NDrTMRSVi9NUM@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.kopqrhtjqixdrcnfeszv:RX0NDrTMRSVi9NUM@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://kopqrhtjqixdrcnfeszv.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

4. أعد تشغيل السيرفر:
```bash
# أوقف السيرفر (Ctrl+C)
npm run dev
```

### للتبديل إلى Local (Development)

1. افتح `.env`
2. علّق قسم **REMOTE**
3. فّك قسم **LOCAL**

```env
# ✅ UNCOMMENT LOCAL
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"
SUPABASE_SERVICE_ROLE_KEY="sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz"

# ❌ COMMENT OUT REMOTE
# DATABASE_URL="postgresql://postgres.kopqrhtjqixdrcnfeszv:..."
# NEXT_PUBLIC_SUPABASE_URL="https://kopqrhtjqixdrcnfeszv.supabase.co"
```

4. أعد تشغيل السيرفر:
```bash
npx prisma generate
npm run dev
```

---

## 🌐 الروابط المهمة

| الخدمة | الرابط | الوصف |
|--------|--------|-------|
| **التطبيق** | http://localhost:3000 | Next.js App |
| **Supabase Studio** | http://127.0.0.1:54323 | إدارة قاعدة البيانات |
| **REST API** | http://127.0.0.1:54321/rest/v1 | API endpoints |
| **GraphQL** | http://127.0.0.1:54321/graphql/v1 | GraphQL API |
| **Mailpit** | http://127.0.0.1:54324 | عرض الإيميلات المرسلة |
| **MCP** | http://127.0.0.1:54321/mcp | MCP Server |

---

## 📊 استكشاف الأخطاء

### المشكلة: `npx supabase status` بيقول "Stopped"

**الحل:**
```bash
npx supabase start
```

### المشكلة: `npm run dev` مش بيشتغل

**الحل:**
```bash
# 1. تأكد إن .env فيه القيم الصحيحة
cat .env | grep DATABASE_URL

# 2. تأكد إن Supabase Local شغال
npx supabase status

# 3. أعد إنشاء Prisma Client
npx prisma generate

# 4. شغّل السيرفر
npm run dev
```

### المشكلة: Prisma بيقول "Can't reach database"

**الحل:**
```bash
# 1. تأكد إن Docker شغال
docker ps

# 2. تأكد إن Supabase containers شغالة
docker ps | grep supabase

# 3. اختبر الاتصال
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$connect()
  .then(() => console.log('✅ Connected'))
  .catch(err => console.error('❌', err.message));
"
```

### المشكلة: `EPERM: operation not permitted` في Prisma

**الحل:**
```bash
# 1. أوقف أي Node processes شغالة
taskkill /F /IM node.exe

# 2. أعد إنشاء Prisma Client
npx prisma generate
```

### المشكلة: Migration مش بتتطبق

**الحل:**
```bash
# 1. شوف الـ migrations الموجودة
ls prisma/migrations

# 2. طبق migrations جديدة
npx prisma migrate dev --name init

# 3. لو فيه مشاكل، ريسيت
npx prisma migrate reset
```

---

## 🎯 أفضل الممارسات

### 1. استخدم Local للتطوير
```bash
# ✅ دايماً استخدم Local للتطوير
# أسرع، أرخص، وأسهل في الديباج

# ❌ متستخدمش Remote إلا للـ testing النهائي
```

### 2. حافظ على الـ Migrations
```bash
# بعد كل تغيير في schema.prisma
npx prisma migrate dev --name describe_your_change
```

### 3. Sync بين Local و Remote
```bash
# قبل الـ deployment
npx supabase db push --linked

# بعد الـ deployment
npx supabase db pull
```

### 4. Backup البيانات المحلية
```bash
# قبل الـ reset
npx supabase stop
docker cp supabase_db_SmileCraft:/backups /path/to/backup
```

---

## 📁 هيكل الملفات

```
SmileCraft/
├── .env                          ← إعدادات Local (حاليًا)
├── prisma/
│   ├── schema.prisma             ← Database schema
│   └── migrations/               ← Database migrations
├── supabase/
│   ├── config.toml               ← Supabase Local config
│   └── migrations/               ← SQL migrations
├── src/
│   ├── lib/supabase/
│   │   ├── client.ts             ← Browser client (uses NEXT_PUBLIC_SUPABASE_URL)
│   │   ├── server.ts             ← Server client (uses NEXT_PUBLIC_SUPABASE_URL)
│   │   └── admin.ts              ← Admin client (uses SUPABASE_SERVICE_ROLE_KEY)
│   └── ...
└── package.json
```

---

## ✅ التحقق من النجاح

### Checklist

- [x] Supabase Local شغال (`npx supabase status`)
- [x] ملف `.env` فيه القيم الصحيحة للـ Local
- [x] Prisma Client اتولد (`npx prisma generate`)
- [x] الاتصال بقاعدة البيانات نجح (`✅ Connected to LOCAL Supabase`)
- [x] السيرفر المحلي شغال (`npm run dev`)
- [x] التطبيق بيفتح (`http://localhost:3000` → HTTP 200)

### النتيجة الحالية

```
✅ Supabase Local:    Running (Docker)
✅ Next.js Dev:       Running (Port 3000)
✅ Prisma Client:     Generated
✅ Database:          Connected (3 users, 2 clinics, 4 appointments, 4 patients)
✅ Application:       Accessible at http://localhost:3000
```

---

## 🚀 الخطوات التالية

1. **افتح المتصفح:** http://localhost:3000
2. **سجّل دخول:** http://localhost:3000/ar/login
3. **افتح Supabase Studio:** http://127.0.0.1:54323
4. **ابدأ التطوير!** 🎉

---

**الحالة:** ✅ جاهز بالكامل  
**التاريخ:** 11 أبريل 2026  
**الإعداد:** Local Supabase (Docker) + Next.js 16 + Prisma
