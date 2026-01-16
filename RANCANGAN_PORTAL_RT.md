# Rancangan Portal RT Multi-RT (Multi-Tenant) — Build Bertahap

Tanggal: 2026-01-15  
Timezone referensi: Asia/Singapore

Dokumen ini adalah rancangan **detail** untuk membangun aplikasi portal RT yang dapat digunakan oleh **banyak RT** (multi-tenant), dengan fitur:
- Pendataan warga + keluarga (KK) + upload KTP/KK
- Registrasi warga menunggu approval Admin RT
- **Kas RT via deposit (saldo warga)**: top-up deposit, upload bukti, approval, lalu **auto-debit bulanan** untuk iuran kas RT
- Iuran lain: upload bukti + approval (Admin RT/Bendahara)
- Surat pengantar, pengumuman, laporan kas
- Export laporan & surat dalam **PDF**
- Integrasi **WhatsApp API** untuk notifikasi: awal register, approval register, dan billing

> Catatan: implementasi pembayaran otomatis (payment gateway) dapat ditambahkan kemudian. Pada tahap awal, cukup **manual transfer + upload bukti**.

---

## 1. Konsep Utama: Multi-Tenant (Banyak RT)

**Tenant = RT**. Semua data RT harus ter-isolasi dengan kunci `rtId`.

### Entitas inti tenant
- `rt`: profil RT (nama RT/RW, alamat, status approval, konfigurasi)
- `subscription`: status paket berbayar per RT (trial/active/suspended)

### Peran (Role)
- `SUPER_ADMIN` — approval RT baru, manajemen plan, monitoring
- `ADMIN_RT` — pemilik tenant, approval warga, atur pengurus, konfigurasi RT
- `BENDAHARA` — iuran, kas, verifikasi pembayaran
- `SEKRETARIS` — surat pengantar, pengumuman
- `WARGA` — akses portal warga, pengajuan surat, top-up deposit, bayar iuran

### Prinsip keamanan tenant
- Setiap request backend **wajib** resolve `rtId` dari membership user (`userRt`) dan memvalidasi role.
- Semua query DB untuk data tenant **wajib** memfilter `rtId` (kecuali area super admin).

---

## 2. Pendataan Warga + Keluarga (KK) + Bukti KTP/KK

### Tujuan
- Warga dapat mendaftar dan mengisi data diri + data keluarga/KK
- Upload dokumen: **KTP** (wajib) dan **KK** (wajib)
- Setelah submit: status **menunggu approval Admin RT**
- Setelah approve: warga aktif dan dapat menggunakan fitur (sesuai subscription)

### Alur registrasi warga (recommended)
1. Warga buka halaman daftar → pilih RT (via **kode undangan** atau pencarian RT)
2. Isi data:
   - Data pribadi (NIK opsional sesuai kebijakan, Nama, No HP, alamat, dll.)
   - Data KK:
     - Nomor KK (opsional), alamat KK
     - Daftar anggota keluarga (nama, hubungan, tanggal lahir, status tinggal)
3. Upload dokumen:
   - Foto/scan KTP
   - Foto/scan KK
4. Submit → status `PENDING_RT_APPROVAL`
5. Sistem kirim WA notifikasi:
   - Ke warga: “Registrasi diterima, menunggu approval”
   - Ke Admin RT/Sekretaris: “Ada registrasi warga baru menunggu approval”
6. Admin RT approve/reject:
   - Jika approve: status menjadi `ACTIVE`, WA notifikasi ke warga
   - Jika reject: status `REJECTED`, WA notifikasi + alasan (opsional)

### Data model minimal (ringkas)
- `resident`:
  - `id`, `rtId`, `userId?`, `fullName`, `phone`, `address`, `status`
  - `approvalStatus`: `PENDING`, `APPROVED`, `REJECTED`
- `familyCard`:
  - `id`, `rtId`, `residentId(owner)`, `kkNumber?`, `address`, `notes?`
- `familyMember`:
  - `id`, `rtId`, `familyCardId`, `fullName`, `relationship`, `birthDate?`, `isLivingHere`
- `residentDocument`:
  - `id`, `rtId`, `residentId`, `type` = `KTP|KK`, `fileUrl`, `uploadedAt`

### Catatan implementasi dokumen
- Simpan file ke **Object Storage** (S3/MinIO/Azure Blob) — hindari filesystem lokal.
- Simpan metadata file + checksum + ukuran file.
- Batasi tipe file (jpg/png/pdf) dan ukuran (mis. max 5–10MB).

---

## 3. Modul Kas RT via Deposit (Saldo Warga)

Kebutuhan khusus:
- Untuk iuran **Kas RT**, warga **deposit saldo** terlebih dulu.
- Warga top-up deposit → upload bukti → admin approve.
- Setiap bulan sistem melakukan **auto-debit** saldo warga untuk membayar iuran Kas RT (mis. Rp 10.000/bulan).
- Jika saldo tidak cukup → status `INSUFFICIENT_BALANCE`, kirim billing reminder WA.

### Konsep
- Warga memiliki `wallet`/`depositAccount` per RT.
- Semua pergerakan saldo dicatat dalam `walletTransaction` (ledger) agar auditabel.

### Alur Top-up deposit
1. Warga pilih “Top-up Deposit”
2. Sistem tampilkan instruksi transfer (rekening/QRIS jika ada)
3. Warga input nominal + upload bukti transfer
4. Sistem buat record top-up `PENDING`
5. Admin RT/Bendahara verifikasi:
   - Approve → saldo bertambah
   - Reject → top-up ditolak
6. Notifikasi WA ke warga (hasil approval)

### Alur Auto-debit bulanan Kas RT
1. Scheduler bulanan (mis. tanggal 1 jam 00:10) generate debit:
   - cek warga aktif + konfigurasi kas aktif
2. Untuk tiap warga:
   - jika saldo >= iuran:
     - buat transaksi debit `KAS_RT_MONTHLY_DEBIT`
     - buat entri kas RT pemasukan
     - status bulan itu `PAID`
   - jika saldo < iuran:
     - status `UNPAID`
     - kirim WA billing reminder + tombol CTA top-up

### Data model minimal (ringkas)
- `wallet`:
  - `id`, `rtId`, `residentId`, `balance`
- `walletTopupRequest`:
  - `id`, `rtId`, `residentId`, `amount`, `proofUrl`, `status` (`PENDING|APPROVED|REJECTED`)
- `walletTransaction`:
  - `id`, `rtId`, `walletId`, `type`, `direction` (`CREDIT|DEBIT`), `amount`, `refType`, `refId`, `createdAt`
- `kasRtConfig`:
  - `id`, `rtId`, `isActive`, `monthlyAmount`, `debitDayOfMonth`
- `kasRtMonthlyCharge`:
  - `id`, `rtId`, `residentId`, `period` (YYYY-MM), `amount`, `status` (`PAID|UNPAID`), `walletTransactionId?`

> Semua perubahan saldo harus melalui `walletTransaction` (ledger first). Field `balance` bisa dihitung ulang saat audit.

---

## 4. Modul Iuran Lain (Fleksibel + Bukti + Approval)

Kebutuhan:
- Iuran RT rutin, iuran pengelolaan, iuran duka cita, dana sosial, dan **iuran dadakan** (Agustusan).
- Metode pembayaran awal: transfer/cash → warga upload bukti → admin/bendahara approve.

### Konsep “Iuran Campaign”
- `feeCampaign` mewakili satu kebutuhan iuran.
- Campaign bisa:
  - `RECURRING` (bulanan) → sistem generate tagihan bulanan (`feeBilling`)
  - `ONE_TIME` (sekali bayar) → langsung tagihan per warga (opsional)

### Alur pembayaran iuran (manual)
1. Sistem tampilkan tagihan (campaign + periode)
2. Warga bayar → upload bukti + input nominal
3. Admin RT/Bendahara verifikasi:
   - Approve → status `PAID`, masuk kas
   - Reject → status `REJECTED`

### Data model minimal (ringkas)
- `feeCampaign`:
  - `id`, `rtId`, `name`, `type`, `amountType` (`FIXED|FLEXIBLE`), `fixedAmount?`, `status`
- `feeBilling`:
  - `id`, `rtId`, `campaignId`, `residentId`, `period?`, `amount`, `status` (`UNPAID|PAID`)
- `feePaymentSubmission`:
  - `id`, `rtId`, `billingId`, `residentId`, `amount`, `proofUrl`, `status` (`PENDING|APPROVED|REJECTED`), `verifiedByUserId?`

---

## 5. Integrasi WhatsApp API (Notifikasi)

### Tujuan notifikasi WA
- Registrasi warga:
  - “Registrasi diterima” (ke warga)
  - “Ada registrasi baru” (ke Admin RT/Sekretaris)
- Approval registrasi:
  - “Registrasi disetujui/ditolak” (ke warga)
- Billing:
  - Reminder top-up deposit bila saldo kurang
  - Reminder iuran lain (tagihan mendekati jatuh tempo / overdue)
- Pengumuman RT (opsional tahap lanjut): broadcast segment

### Prinsip desain integrasi WA
- Pakai tabel `notificationOutbox` + worker pengirim:
  - Menghindari request user menunggu pengiriman WA
  - Mendukung retry dengan backoff
- Template pesan:
  - Simpan `templateKey` + parameter agar konsisten
- Rate limit & dedup:
  - Hindari spam: cooldown per tipe notifikasi

### Data model minimal
- `notificationOutbox`:
  - `id`, `rtId`, `channel` (`WHATSAPP`), `toPhone`, `templateKey`, `payloadJson`, `status` (`PENDING|SENT|FAILED`), `retryCount`
- `notificationLog` (opsional):
  - audit riwayat pengiriman

### Momen event yang memicu notifikasi
- `ResidentRegistered`
- `ResidentApproved` / `ResidentRejected`
- `WalletTopupSubmitted`
- `WalletTopupApproved/Rejected`
- `KasRtDebitSuccess` / `KasRtDebitInsufficient`
- `FeePaymentSubmitted`
- `FeePaymentApproved/Rejected`
- `BillingReminderDue`

---

## 6. PDF Export (Laporan & Surat)

### Output PDF minimal
- Surat pengantar (warga download)
- Laporan kas bulanan (warga read-only + download)
- Rekap iuran per campaign/periode (pengurus + download)
- Rekap tunggakan (pengurus)

### Prinsip teknis
- Generate PDF di backend (server-side) agar format konsisten.
- Simpan hasil PDF:
  - Opsi A: generate on-demand dan stream (tanpa simpan)
  - Opsi B: generate + simpan ke object storage untuk caching (disarankan untuk laporan yang sering diakses)

---

## 7. Rancangan Build Bertahap (Roadmap Fokus)

Di bawah ini tahapan yang disusun supaya tim fokus pada “yang paling penting dulu” dan bisa go-live cepat.

### Tahap 0 — Fondasi (Wajib)
**Target:** aplikasi bisa dipakai minimal 1 RT dengan kontrol akses aman.
- Multi-tenant `rtId` end-to-end
- Auth (login/refresh token) + RBAC (role)
- Super Admin panel minimal:
  - Approval RT baru (admin RT register)
- Admin RT panel minimal:
  - Profil RT + generate invite code
- Audit log minimal (aksi approval & verifikasi)

**Output siap:** RT bisa dibuat dan disetujui; admin RT bisa masuk.

---

### Tahap 1 — Registrasi Warga + Approval + Dokumen
**Target:** pendataan warga valid + bukti dokumen.
- Flow daftar warga + pilih RT (invite code / request join)
- Input data warga + KK + anggota keluarga
- Upload dokumen KTP & KK
- Admin RT approve/reject pendaftaran
- WA notifikasi:
  - registrasi diterima
  - approval/rejection

**Output siap:** onboarding warga berjalan dan data tersimpan rapi.

---

### Tahap 2 — Deposit Wallet + Auto-debit Kas RT (Core Finansial)
**Target:** kas RT bulanan berjalan otomatis.
- Konfigurasi kas RT: nominal bulanan + tanggal debit
- Warga top-up deposit + upload bukti
- Verifikasi top-up oleh admin/bendahara
- Wallet ledger + saldo
- Scheduler bulanan auto-debit
- WA notifikasi:
  - top-up submitted
  - top-up approved/rejected
  - saldo kurang (billing)

**Output siap:** iuran kas RT bisa berjalan tanpa warga “bayar tiap bulan” manual.

---

### Tahap 3 — Iuran Campaign Lain + Approval Bukti
**Target:** iuran selain kas RT bisa dikelola, termasuk iuran dadakan.
- Fee campaign CRUD (Admin/Bendahara)
- Recurring billing bulanan (untuk iuran rutin)
- One-time billing (untuk iuran dadakan Agustusan)
- Submission bukti pembayaran oleh warga
- Approval oleh Admin/Bendahara
- Masuk ke kas ledger
- WA reminder iuran due/overdue (aturan sederhana)

**Output siap:** semua iuran di portal bisa dikelola.

---

### Tahap 4 — Laporan Kas & Transparansi + PDF
**Target:** warga bisa melihat transparansi kas dan download laporan.
- Kas ledger lengkap (pemasukan dari kas RT + iuran lain + pengeluaran)
- Kategori pengeluaran + lampiran nota (opsional)
- PDF laporan kas bulanan
- PDF rekap iuran per periode/campaign
- Hak akses:
  - Warga: read-only kas + download laporan tertentu
  - Pengurus: full akses

**Output siap:** fitur akuntabilitas & laporan.

---

### Tahap 5 — Surat Pengantar + PDF + Notifikasi
**Target:** surat pengantar end-to-end.
- Form pengajuan surat oleh warga
- Workflow Sekretaris: review/approve/reject
- Nomor surat + template PDF
- WA notifikasi status surat (opsional)

---

### Tahap 6 — Subscription (Berbayar Bulanan per RT)
**Target:** monetisasi per RT.
- Plan & fitur gating:
  - TRIAL (mis. 14 hari), ACTIVE, SUSPENDED
- Invoice sederhana + manual payment (fase awal)
- Blokir fitur tertentu saat suspend (mis. iuran & surat), tetap boleh read-only laporan terakhir
- (Opsional lanjut) Integrasi payment gateway

---

## 8. Non-Functional Requirements (NFR) untuk Production

### Security
- RBAC + tenant isolation (wajib)
- Validasi input (server-side)
- Secure file upload (type/size, scan optional, private bucket)
- Logging yang tidak bocorkan data sensitif
- Rate limit untuk endpoint sensitif (login, upload)

### Reliability
- Outbox pattern untuk WhatsApp
- Retry dengan backoff
- Scheduler idempotent (auto-debit tidak dobel)

### Observability
- Structured log + correlation ID
- Dashboard error rate
- Audit log untuk aksi finansial & approval

---

## 9. Checklist MVP “Go Live” Minimal
Untuk bisa dipakai RT pertama:
- Tahap 0 + Tahap 1 + Tahap 2 (paling penting)
- Tanpa subscription dulu (bisa trial manual)
- PDF bisa menyusul, WA minimal untuk register & approval

---

## 10. Definisi Done per Tahap (ringkas)

**Tahap 1 DONE**
- Warga daftar + upload KTP/KK + data keluarga
- Admin RT approve/reject
- WA notif register & approval
- Data bisa dicari & dilihat

**Tahap 2 DONE**
- Top-up deposit + verifikasi
- Auto-debit bulanan sukses + gagal saldo kurang
- Kas ledger pemasukan dari debit
- WA notif billing saldo kurang

**Tahap 3 DONE**
- Iuran dadakan bisa dibuat & ditagihkan
- Upload bukti & approval
- Masuk kas

---

Jika kamu ingin, tahap berikutnya saya bisa turunkan menjadi:
- daftar endpoint REST per modul,
- contoh skema database (DDL) minimal,
- dan event list untuk outbox WhatsApp.


---

## 11. Arsitektur Aplikasi: PWA, Frontend, Backend

### 11.1 Model Aplikasi: Progressive Web App (PWA)
Portal RT dirancang sebagai **Progressive Web App (PWA)** agar:
- Warga dapat **install aplikasi dari browser** (Add to Home Screen)
- Tidak perlu Play Store / App Store
- Update otomatis tanpa instal ulang
- Ringan dan hemat kuota
- Mendukung **Push Notification** (WhatsApp tetap menjadi kanal utama)

**Karakteristik PWA yang digunakan**
- Web App Manifest (name, icon, theme)
- Service Worker:
  - cache static asset
  - cache data terakhir (pengumuman, kas ringkas)
- Offline fallback (read-only)
- HTTPS wajib

---

### 11.2 Arsitektur Frontend
**Teknologi yang disarankan**
- React versi 19 + TypeScript
- PWA enabled
- UI Framework: MUI / Ant Design
- State Server: TanStack Query
- Form: React Hook Form + Zod

**Struktur Frontend (ringkas)**
- `/auth` (login, register)
- `/warga` (dashboard warga)
- `/admin` (panel RT)
- `/super-admin`
- `/shared` (component, hook, util)
- `/services` (API client)

---

### 11.3 Arsitektur Backend
**Teknologi**
- Node.js (NestJS / Express terstruktur) atau .NET Web API
- REST API
- JWT + Refresh Token
- Background Worker (scheduler, WA sender)
- Object Storage (S3/MinIO)
- PostgreSQL / MySQL

**Prinsip**
- Multi-tenant via `rtId`
- RBAC middleware
- Outbox pattern untuk WA
- Scheduler idempotent

---

## 12. Daftar Endpoint REST per Modul

### 12.1 Auth
- POST `/auth/register-admin-rt`
- POST `/auth/register-warga`
- POST `/auth/login`
- POST `/auth/refresh`
- POST `/auth/logout`

### 12.2 Tenant / RT
- GET `/rt/me`
- PUT `/rt/me`
- POST `/rt/invite-code`
- GET `/rt/members`
- POST `/rt/members/{id}/approve`
- POST `/rt/members/{id}/reject`

### 12.3 Warga
- GET `/residents`
- GET `/residents/{id}`
- POST `/residents`
- PUT `/residents/{id}`
- POST `/residents/{id}/documents`

### 12.4 Wallet / Deposit
- GET `/wallet/me`
- POST `/wallet/topup`
- POST `/wallet/topup/{id}/approve`
- POST `/wallet/topup/{id}/reject`
- GET `/wallet/transactions`

### 12.5 Iuran
- GET `/fee-campaigns`
- POST `/fee-campaigns`
- POST `/fee-campaigns/{id}/activate`
- GET `/billings`
- POST `/billings/{id}/submit-payment`
- POST `/billings/{id}/approve`
- POST `/billings/{id}/reject`

### 12.6 Kas RT
- GET `/cash/ledger`
- POST `/cash/expense`
- GET `/cash/report/monthly`
- GET `/cash/report/pdf`

### 12.7 Surat
- POST `/letters`
- GET `/letters`
- POST `/letters/{id}/approve`
- POST `/letters/{id}/reject`
- GET `/letters/{id}/pdf`

### 12.8 PDF
- GET `/pdf/cash-monthly`
- GET `/pdf/fee-report`
- GET `/pdf/letter/{id}`

### 12.9 WhatsApp / Notification
- GET `/notifications`
- POST `/notifications/retry/{id}`

### 12.10 Subscription
- GET `/subscription`
- POST `/subscription/subscribe`
- POST `/subscription/cancel`
- GET `/subscription/invoices`

---

## 13. Skema Database Minimal (DDL)

> DDL disederhanakan, field audit (createdAt, updatedAt) diasumsikan ada di semua tabel.

```sql
CREATE TABLE rt (
  id UUID PRIMARY KEY,
  name VARCHAR(100),
  rw VARCHAR(10),
  address TEXT,
  status VARCHAR(20)
);

CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(100),
  phone VARCHAR(20),
  password_hash TEXT
);

CREATE TABLE user_rt (
  id UUID PRIMARY KEY,
  user_id UUID,
  rt_id UUID,
  role VARCHAR(20),
  status VARCHAR(20)
);

CREATE TABLE resident (
  id UUID PRIMARY KEY,
  rt_id UUID,
  user_id UUID,
  full_name VARCHAR(100),
  phone VARCHAR(20),
  approval_status VARCHAR(20)
);

CREATE TABLE family_card (
  id UUID PRIMARY KEY,
  rt_id UUID,
  resident_id UUID,
  kk_number VARCHAR(50),
  address TEXT
);

CREATE TABLE family_member (
  id UUID PRIMARY KEY,
  family_card_id UUID,
  full_name VARCHAR(100),
  relationship VARCHAR(50)
);

CREATE TABLE resident_document (
  id UUID PRIMARY KEY,
  resident_id UUID,
  type VARCHAR(10),
  file_url TEXT
);

CREATE TABLE wallet (
  id UUID PRIMARY KEY,
  resident_id UUID,
  balance NUMERIC
);

CREATE TABLE wallet_transaction (
  id UUID PRIMARY KEY,
  wallet_id UUID,
  type VARCHAR(50),
  direction VARCHAR(10),
  amount NUMERIC
);

CREATE TABLE fee_campaign (
  id UUID PRIMARY KEY,
  rt_id UUID,
  name VARCHAR(100),
  type VARCHAR(20),
  status VARCHAR(20)
);

CREATE TABLE fee_billing (
  id UUID PRIMARY KEY,
  campaign_id UUID,
  resident_id UUID,
  amount NUMERIC,
  status VARCHAR(20)
);

CREATE TABLE cash_ledger (
  id UUID PRIMARY KEY,
  rt_id UUID,
  type VARCHAR(10),
  amount NUMERIC,
  category VARCHAR(50)
);

CREATE TABLE letter_request (
  id UUID PRIMARY KEY,
  resident_id UUID,
  status VARCHAR(20),
  letter_number VARCHAR(50)
);

CREATE TABLE subscription (
  id UUID PRIMARY KEY,
  rt_id UUID,
  plan VARCHAR(20),
  status VARCHAR(20),
  end_date DATE
);

CREATE TABLE notification_outbox (
  id UUID PRIMARY KEY,
  rt_id UUID,
  channel VARCHAR(20),
  template_key VARCHAR(50),
  payload JSONB,
  status VARCHAR(20)
);
```

---

## 14. Event List & WhatsApp Template Keys

### 14.1 Event List (Domain Events)
- `ResidentRegistered`
- `ResidentApproved`
- `ResidentRejected`
- `WalletTopupSubmitted`
- `WalletTopupApproved`
- `WalletTopupRejected`
- `KasRtMonthlyDebited`
- `KasRtInsufficientBalance`
- `FeePaymentSubmitted`
- `FeePaymentApproved`
- `FeePaymentRejected`
- `SubscriptionActivated`
- `SubscriptionExpired`

### 14.2 WhatsApp Template Keys
- `WA_RESIDENT_REGISTERED`
- `WA_RESIDENT_APPROVED`
- `WA_RESIDENT_REJECTED`
- `WA_WALLET_TOPUP_SUBMITTED`
- `WA_WALLET_TOPUP_APPROVED`
- `WA_WALLET_TOPUP_REJECTED`
- `WA_KAS_DEBIT_SUCCESS`
- `WA_KAS_DEBIT_INSUFFICIENT`
- `WA_FEE_PAYMENT_SUBMITTED`
- `WA_FEE_PAYMENT_APPROVED`
- `WA_FEE_PAYMENT_REJECTED`
- `WA_SUBSCRIPTION_EXPIRED`
---

## 11. Ketentuan Implementasi PWA, Frontend, dan Backend

### 11.1 Model PWA (Progressive Web App)
Aplikasi portal RT direkomendasikan menggunakan **PWA** agar:
- Warga bisa **install** di Home Screen tanpa Play Store/App Store.
- Update otomatis (mengikuti versi web).
- Performa lebih cepat lewat caching aset statis.
- Dapat mengirim **push notification** (opsional; tergantung browser & izin user).

**Ketentuan PWA**
- Wajib menyediakan:
  - `manifest.json` (nama app, icon, theme color)
  - Service Worker (cache aset statis + strategi caching)
  - Halaman offline (opsional tahap lanjut)
- Strategi caching yang aman:
  - Cache **aset statis** (JS/CSS/icon) dengan versioning (hash).
  - Data sensitif (KTP/KK, bukti transfer) **jangan dicache** di browser.
- Push Notification:
  - Tahap awal: gunakan notifikasi WhatsApp untuk menggantikan push.
  - Tahap lanjut: Web Push untuk pengumuman dan status surat.

### 11.2 Frontend (Disarankan)
**React + TypeScript** untuk:
- Portal Warga (PWA)
- Panel Pengurus (Admin/Bendahara/Sekretaris)
- Panel Super Admin (Platform)

**Ketentuan frontend**
- Routing: React Router
- Server state: TanStack Query (cache data API, retry)
- Form: React Hook Form + Zod (validasi)
- UI kit: Material UI atau Ant Design (mempercepat admin panel)
- Auth:
  - Access token pendek + refresh token
  - Simpan token di **HttpOnly cookie** (disarankan) agar mengurangi risiko XSS.
- Upload file:
  - gunakan **signed URL** / endpoint upload terproteksi
  - tampilkan progress, validasi ukuran & tipe file sebelum upload

### 11.3 Backend (Disarankan)
Backend dapat menggunakan **Node.js (NestJS/Express) atau .NET (ASP.NET Core)**. Yang penting: konsisten dan aman.

**Ketentuan backend umum**
- REST API + OpenAPI/Swagger
- RBAC + tenant isolation guard (`rtId`) wajib di semua endpoint tenant
- Upload file ke object storage (S3/MinIO/Azure Blob)
- Worker/background job:
  - pengiriman WhatsApp (Outbox Worker)
  - scheduler auto-debit bulanan (Kas RT)
  - scheduler pembuatan tagihan recurring (iuran)
- Observability:
  - structured logs (JSON)
  - correlation id per request
- Database:
  - PostgreSQL (recommended) atau MySQL
  - migrasi schema (Prisma/TypeORM/Flyway/EF Core Migrations)

---

## 12. Daftar Endpoint REST per Modul (Draft)

> Format endpoint di bawah adalah rancangan awal. Penamaan bisa disesuaikan, namun **struktur dan aturan RBAC/tenant** wajib dipertahankan.

### 12.1 Auth
- `POST /auth/register`
  - daftar akun global (email/phone + password)
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

### 12.2 Tenant (RT) & Approval (Super Admin)
**Publik / calon admin RT**
- `POST /tenants`  
  - daftar RT baru (admin RT submit profil RT) → status `PENDING_APPROVAL`

**Super Admin**
- `GET /admin/tenants?status=PENDING_APPROVAL`
- `POST /admin/tenants/{rtId}/approve`
- `POST /admin/tenants/{rtId}/reject`

**Admin RT (tenant scope)**
- `GET /tenants/current`
- `PATCH /tenants/current`
- `POST /tenants/current/invite-codes`
- `GET /tenants/current/invite-codes`

### 12.3 Warga (Resident) + Keluarga + Dokumen
**Warga**
- `POST /residents/register`
  - register ke RT (invite code / request join) + data KK + upload dokumen (via upload flow)
- `GET /residents/me`
- `PATCH /residents/me`

**Admin RT / Pengurus**
- `GET /residents?approvalStatus=PENDING`
- `GET /residents/{residentId}`
- `POST /residents/{residentId}/approve`
- `POST /residents/{residentId}/reject`
- `GET /family-cards/{familyCardId}`
- `PATCH /family-cards/{familyCardId}`
- `POST /family-cards/{familyCardId}/members`
- `PATCH /family-members/{memberId}`
- `DELETE /family-members/{memberId}`

**Dokumen**
- `POST /residents/{residentId}/documents/upload-url`
  - menghasilkan signed URL upload (type KTP/KK)
- `GET /residents/{residentId}/documents`
- `GET /residents/{residentId}/documents/{docId}/download-url`

### 12.4 Wallet/Deposit (Kas RT via Deposit)
**Warga**
- `GET /wallet/me`
- `POST /wallet/topups`
  - submit top-up + bukti (proof upload)
- `GET /wallet/topups/me`
- `GET /wallet/transactions/me`

**Admin RT / Bendahara**
- `GET /wallet/topups?status=PENDING`
- `POST /wallet/topups/{topupId}/approve`
- `POST /wallet/topups/{topupId}/reject`

**Konfigurasi Kas RT**
- `GET /kas-rt/config`
- `PUT /kas-rt/config` (Admin RT/Bendahara)

### 12.5 Iuran (Campaign) + Tagihan + Bukti + Approval
**Admin RT / Bendahara**
- `POST /fees/campaigns`
- `GET /fees/campaigns`
- `PATCH /fees/campaigns/{campaignId}`
- `POST /fees/campaigns/{campaignId}/activate`
- `POST /fees/campaigns/{campaignId}/close`
- `POST /fees/campaigns/{campaignId}/generate-billings` (opsional manual trigger)

**Warga**
- `GET /fees/billings/me?status=UNPAID`
- `POST /fees/billings/{billingId}/payments`
  - upload bukti + submit nominal
- `GET /fees/payments/me`

**Admin RT / Bendahara**
- `GET /fees/payments?status=PENDING`
- `POST /fees/payments/{paymentId}/approve`
- `POST /fees/payments/{paymentId}/reject`

### 12.6 Kas (Ledger)
**Admin RT / Bendahara**
- `POST /cash/entries` (pengeluaran manual / pemasukan lain)
- `GET /cash/entries?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /cash/summary?period=YYYY-MM` (ringkas)
- `PATCH /cash/entries/{entryId}`
- `DELETE /cash/entries/{entryId}` (opsional; lebih aman pakai void/reversal)

**Warga**
- `GET /cash/summary?period=YYYY-MM`
- `GET /cash/entries?period=YYYY-MM` (read-only)

### 12.7 Surat Pengantar
**Warga**
- `POST /letters`
- `GET /letters/me`
- `GET /letters/{letterId}`

**Sekretaris / Admin RT**
- `GET /letters?status=SUBMITTED`
- `POST /letters/{letterId}/approve`
- `POST /letters/{letterId}/reject`

### 12.8 PDF
- `GET /pdf/letters/{letterId}` (download/stream)
- `GET /pdf/cash-report?period=YYYY-MM`
- `GET /pdf/fee-report?campaignId=...&period=YYYY-MM`
- `GET /pdf/arrears-report?period=YYYY-MM` (pengurus saja)

### 12.9 WhatsApp (Internal)
> Endpoint ini internal (untuk admin ops/diagnostic) dan bisa dimatikan di production.
- `GET /wa/outbox?status=FAILED`
- `POST /wa/outbox/{id}/retry`
- `GET /wa/templates`

### 12.10 Subscription
**Admin RT**
- `GET /subscription/current`
- `GET /subscription/plans`
- `POST /subscription/checkout` (buat invoice)
- `GET /subscription/invoices`
- `POST /subscription/invoices/{invoiceId}/mark-paid` (fase manual payment)

**Super Admin**
- `GET /admin/subscriptions`
- `POST /admin/invoices/{invoiceId}/approve-payment` (jika manual review)

---

## 13. Skema Database Minimal (DDL) — PostgreSQL / MySQL

> DDL di bawah dibuat **generik** agar bisa dipakai di PostgreSQL maupun MySQL.  
> Untuk Postgres, tipe `TEXT` dan `JSON` bisa diganti ke `JSONB` untuk performa lebih baik.  
> Untuk MySQL, gunakan `JSON` (>= 5.7) dan engine InnoDB.

### 13.1 Tabel Identitas & Tenant

```sql
-- USERS (akun global, tidak tenant-scoped)
CREATE TABLE users (
  id              CHAR(36) PRIMARY KEY,
  email           VARCHAR(255) NULL UNIQUE,
  phone           VARCHAR(30)  NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  full_name       VARCHAR(255) NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE|SUSPENDED
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NULL
);

-- RT / TENANT
CREATE TABLE rt (
  id                CHAR(36) PRIMARY KEY,
  name              VARCHAR(255) NOT NULL,
  rw                VARCHAR(50) NULL,
  address           TEXT NULL,
  approval_status   VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- PENDING|APPROVED|REJECTED
  created_by_user_id CHAR(36) NOT NULL,
  approved_by_user_id CHAR(36) NULL,
  approved_at       TIMESTAMP NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NULL,
  CONSTRAINT fk_rt_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

-- USER MEMBERSHIP DI RT
CREATE TABLE user_rt (
  id          CHAR(36) PRIMARY KEY,
  user_id     CHAR(36) NOT NULL,
  rt_id       CHAR(36) NOT NULL,
  role        VARCHAR(30) NOT NULL, -- ADMIN_RT|BENDAHARA|SEKRETARIS|WARGA
  status      VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE|PENDING|REJECTED
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, rt_id),
  CONSTRAINT fk_user_rt_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_user_rt_rt FOREIGN KEY (rt_id) REFERENCES rt(id)
);

-- INVITE CODE
CREATE TABLE invite_code (
  id          CHAR(36) PRIMARY KEY,
  rt_id       CHAR(36) NOT NULL,
  code        VARCHAR(50) NOT NULL UNIQUE,
  expires_at  TIMESTAMP NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_by_user_id CHAR(36) NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_invite_rt FOREIGN KEY (rt_id) REFERENCES rt(id),
  CONSTRAINT fk_invite_user FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);
```

### 13.2 Pendataan Warga + Keluarga + Dokumen

```sql
CREATE TABLE residents (
  id              CHAR(36) PRIMARY KEY,
  rt_id           CHAR(36) NOT NULL,
  user_id         CHAR(36) NULL, -- jika warga sudah punya akun terhubung
  full_name       VARCHAR(255) NOT NULL,
  phone           VARCHAR(30) NOT NULL,
  address         TEXT NULL,
  approval_status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING|APPROVED|REJECTED
  status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE|MOVED|DECEASED
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NULL,
  UNIQUE (rt_id, phone),
  CONSTRAINT fk_resident_rt FOREIGN KEY (rt_id) REFERENCES rt(id),
  CONSTRAINT fk_resident_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE family_cards (
  id          CHAR(36) PRIMARY KEY,
  rt_id       CHAR(36) NOT NULL,
  owner_resident_id CHAR(36) NOT NULL,
  kk_number   VARCHAR(50) NULL,
  address     TEXT NULL,
  notes       TEXT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_fc_rt FOREIGN KEY (rt_id) REFERENCES rt(id),
  CONSTRAINT fk_fc_owner FOREIGN KEY (owner_resident_id) REFERENCES residents(id)
);

CREATE TABLE family_members (
  id            CHAR(36) PRIMARY KEY,
  rt_id         CHAR(36) NOT NULL,
  family_card_id CHAR(36) NOT NULL,
  full_name     VARCHAR(255) NOT NULL,
  relationship  VARCHAR(50) NOT NULL, -- HEAD|SPOUSE|CHILD|PARENT|OTHER (atau bebas)
  birth_date    DATE NULL,
  is_living_here BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_fm_rt FOREIGN KEY (rt_id) REFERENCES rt(id),
  CONSTRAINT fk_fm_fc FOREIGN KEY (family_card_id) REFERENCES family_cards(id)
);

CREATE TABLE resident_documents (
  id          CHAR(36) PRIMARY KEY,
  rt_id       CHAR(36) NOT NULL,
  resident_id CHAR(36) NOT NULL,
  doc_type    VARCHAR(20) NOT NULL, -- KTP|KK
  file_url    TEXT NOT NULL, -- private object storage path
  file_mime   VARCHAR(100) NULL,
  file_size   BIGINT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rd_rt FOREIGN KEY (rt_id) REFERENCES rt(id),
  CONSTRAINT fk_rd_res FOREIGN KEY (resident_id) REFERENCES residents(id)
);
```

### 13.3 Wallet/Deposit + Kas RT Auto-debit

```sql
CREATE TABLE wallets (
  id          CHAR(36) PRIMARY KEY,
  rt_id       CHAR(36) NOT NULL,
  resident_id CHAR(36) NOT NULL,
  balance     BIGINT NOT NULL DEFAULT 0, -- simpan dalam satuan terkecil (rupiah)
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (rt_id, resident_id),
  CONSTRAINT fk_wallet_rt FOREIGN KEY (rt_id) REFERENCES rt(id),
  CONSTRAINT fk_wallet_res FOREIGN KEY (resident_id) REFERENCES residents(id)
);

CREATE TABLE wallet_topup_requests (
  id          CHAR(36) PRIMARY KEY,
  rt_id       CHAR(36) NOT NULL,
  resident_id CHAR(36) NOT NULL,
  amount      BIGINT NOT NULL,
  proof_url   TEXT NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING|APPROVED|REJECTED
  reviewed_by_user_id CHAR(36) NULL,
  reviewed_at TIMESTAMP NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_wtr_rt FOREIGN KEY (rt_id) REFERENCES rt(id),
  CONSTRAINT fk_wtr_res FOREIGN KEY (resident_id) REFERENCES residents(id),
  CONSTRAINT fk_wtr_user FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id)
);

CREATE TABLE wallet_transactions (
  id          CHAR(36) PRIMARY KEY,
  rt_id       CHAR(36) NOT NULL,
  wallet_id   CHAR(36) NOT NULL,
  tx_type     VARCHAR(50) NOT NULL, -- TOPUP_APPROVED|KAS_RT_MONTHLY_DEBIT|ADJUSTMENT
  direction   VARCHAR(10) NOT NULL, -- CREDIT|DEBIT
  amount      BIGINT NOT NULL,
  ref_type    VARCHAR(50) NULL,
  ref_id      CHAR(36) NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_wtx_rt FOREIGN KEY (rt_id) REFERENCES rt(id),
  CONSTRAINT fk_wtx_wallet FOREIGN KEY (wallet_id) REFERENCES wallets(id)
);

CREATE TABLE kas_rt_config (
  id             CHAR(36) PRIMARY KEY,
  rt_id          CHAR(36) NOT NULL UNIQUE,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  monthly_amount BIGINT NOT NULL,
  debit_day_of_month INT NOT NULL DEFAULT 1, -- 1-28 aman
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NULL,
  CONSTRAINT fk_kas_cfg_rt FOREIGN KEY (rt_id) REFERENCES rt(id)
);

CREATE TABLE kas_rt_monthly_charge (
  id            CHAR(36) PRIMARY KEY,
  rt_id         CHAR(36) NOT NULL,
  resident_id   CHAR(36) NOT NULL,
  period        VARCHAR(7) NOT NULL, -- 'YYYY-MM'
  amount        BIGINT NOT NULL,
  status        VARCHAR(20) NOT NULL, -- PAID|UNPAID
  wallet_transaction_id CHAR(36) NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (rt_id, resident_id, period),
  CONSTRAINT fk_kmc_rt FOREIGN KEY (rt_id) REFERENCES rt(id),
  CONSTRAINT fk_kmc_res FOREIGN KEY (resident_id) REFERENCES residents(id),
  CONSTRAINT fk_kmc_wtx FOREIGN KEY (wallet_transaction_id) REFERENCES wallet_transactions(id)
);
```

### 13.4 Iuran Campaign + Billing + Bukti + Approval

```sql
CREATE TABLE fee_campaigns (
  id           CHAR(36) PRIMARY KEY,
  rt_id        CHAR(36) NOT NULL,
  name         VARCHAR(255) NOT NULL,
  description  TEXT NULL,
  campaign_type VARCHAR(20) NOT NULL, -- RECURRING|ONE_TIME
  amount_type  VARCHAR(20) NOT NULL, -- FIXED|FLEXIBLE
  fixed_amount BIGINT NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'DRAFT', -- DRAFT|ACTIVE|CLOSED
  start_date   DATE NULL,
  end_date     DATE NULL,
  created_by_user_id CHAR(36) NOT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_fcpg_rt FOREIGN KEY (rt_id) REFERENCES rt(id),
  CONSTRAINT fk_fcpg_user FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

CREATE TABLE fee_billings (
  id           CHAR(36) PRIMARY KEY,
  rt_id        CHAR(36) NOT NULL,
  campaign_id  CHAR(36) NOT NULL,
  resident_id  CHAR(36) NOT NULL,
  period       VARCHAR(7) NULL, -- untuk recurring
  amount       BIGINT NOT NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'UNPAID', -- UNPAID|PAID
  due_date     DATE NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (rt_id, campaign_id, resident_id, period),
  CONSTRAINT fk_fbill_rt FOREIGN KEY (rt_id) REFERENCES rt(id),
  CONSTRAINT fk_fbill_cpg FOREIGN KEY (campaign_id) REFERENCES fee_campaigns(id),
  CONSTRAINT fk_fbill_res FOREIGN KEY (resident_id) REFERENCES residents(id)
);

CREATE TABLE fee_payment_submissions (
  id           CHAR(36) PRIMARY KEY,
  rt_id        CHAR(36) NOT NULL,
  billing_id   CHAR(36) NOT NULL,
  resident_id  CHAR(36) NOT NULL,
  amount       BIGINT NOT NULL,
  proof_url    TEXT NOT NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING|APPROVED|REJECTED
  verified_by_user_id CHAR(36) NULL,
  verified_at  TIMESTAMP NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_fpay_rt FOREIGN KEY (rt_id) REFERENCES rt(id),
  CONSTRAINT fk_fpay_bill FOREIGN KEY (billing_id) REFERENCES fee_billings(id),
  CONSTRAINT fk_fpay_res FOREIGN KEY (resident_id) REFERENCES residents(id),
  CONSTRAINT fk_fpay_user FOREIGN KEY (verified_by_user_id) REFERENCES users(id)
);
```

### 13.5 Kas Ledger

```sql
CREATE TABLE cash_ledger (
  id           CHAR(36) PRIMARY KEY,
  rt_id        CHAR(36) NOT NULL,
  entry_date   DATE NOT NULL,
  entry_type   VARCHAR(10) NOT NULL, -- IN|OUT
  category     VARCHAR(100) NOT NULL,
  amount       BIGINT NOT NULL,
  note         TEXT NULL,
  ref_type     VARCHAR(50) NULL, -- KAS_RT|FEE|MANUAL
  ref_id       CHAR(36) NULL,
  attachment_url TEXT NULL,
  created_by_user_id CHAR(36) NOT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cash_rt FOREIGN KEY (rt_id) REFERENCES rt(id),
  CONSTRAINT fk_cash_user FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

CREATE INDEX idx_cash_rt_date ON cash_ledger (rt_id, entry_date);
```

### 13.6 Surat, Pengumuman, PDF Cache

```sql
CREATE TABLE letter_requests (
  id           CHAR(36) PRIMARY KEY,
  rt_id        CHAR(36) NOT NULL,
  resident_id  CHAR(36) NOT NULL,
  letter_type  VARCHAR(50) NOT NULL,
  payload_json TEXT NOT NULL, -- JSON (detail form)
  status       VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED', -- SUBMITTED|IN_REVIEW|APPROVED|REJECTED
  letter_number VARCHAR(50) NULL,
  reviewed_by_user_id CHAR(36) NULL,
  reviewed_at  TIMESTAMP NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_lr_rt FOREIGN KEY (rt_id) REFERENCES rt(id),
  CONSTRAINT fk_lr_res FOREIGN KEY (resident_id) REFERENCES residents(id),
  CONSTRAINT fk_lr_user FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id)
);

CREATE TABLE announcements (
  id           CHAR(36) PRIMARY KEY,
  rt_id        CHAR(36) NOT NULL,
  title        VARCHAR(255) NOT NULL,
  body         TEXT NOT NULL,
  attachment_url TEXT NULL,
  is_pinned    BOOLEAN NOT NULL DEFAULT FALSE,
  created_by_user_id CHAR(36) NOT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ann_rt FOREIGN KEY (rt_id) REFERENCES rt(id),
  CONSTRAINT fk_ann_user FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

-- cache hasil PDF (opsional)
CREATE TABLE pdf_exports (
  id           CHAR(36) PRIMARY KEY,
  rt_id        CHAR(36) NOT NULL,
  export_type  VARCHAR(50) NOT NULL, -- CASH_REPORT|FEE_REPORT|LETTER
  ref_id       CHAR(36) NULL,
  period       VARCHAR(7) NULL,
  file_url     TEXT NOT NULL,
  created_by_user_id CHAR(36) NOT NULL,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pdf_rt FOREIGN KEY (rt_id) REFERENCES rt(id),
  CONSTRAINT fk_pdf_user FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);
```

### 13.7 Subscription + Invoice

```sql
CREATE TABLE plans (
  id          CHAR(36) PRIMARY KEY,
  code        VARCHAR(50) NOT NULL UNIQUE, -- BASIC|PRO|PREMIUM
  name        VARCHAR(100) NOT NULL,
  monthly_price BIGINT NOT NULL,
  features_json TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE subscriptions (
  id          CHAR(36) PRIMARY KEY,
  rt_id       CHAR(36) NOT NULL UNIQUE,
  plan_id     CHAR(36) NOT NULL,
  status      VARCHAR(20) NOT NULL, -- TRIAL|ACTIVE|PAST_DUE|SUSPENDED|CANCELED
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sub_rt FOREIGN KEY (rt_id) REFERENCES rt(id),
  CONSTRAINT fk_sub_plan FOREIGN KEY (plan_id) REFERENCES plans(id)
);

CREATE TABLE invoices (
  id          CHAR(36) PRIMARY KEY,
  rt_id       CHAR(36) NOT NULL,
  subscription_id CHAR(36) NOT NULL,
  amount      BIGINT NOT NULL,
  status      VARCHAR(20) NOT NULL, -- ISSUED|PAID|CANCELED
  due_date    DATE NULL,
  paid_at     TIMESTAMP NULL,
  provider_ref VARCHAR(100) NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_inv_rt FOREIGN KEY (rt_id) REFERENCES rt(id),
  CONSTRAINT fk_inv_sub FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
);
```

### 13.8 Notifikasi Outbox + Audit Log

```sql
CREATE TABLE notification_outbox (
  id          CHAR(36) PRIMARY KEY,
  rt_id       CHAR(36) NULL, -- boleh null untuk super admin broadcast tertentu
  channel     VARCHAR(20) NOT NULL, -- WHATSAPP
  to_phone    VARCHAR(30) NOT NULL,
  template_key VARCHAR(100) NOT NULL,
  payload_json TEXT NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING|SENT|FAILED
  retry_count INT NOT NULL DEFAULT 0,
  last_error  TEXT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at     TIMESTAMP NULL
);

CREATE TABLE audit_logs (
  id          CHAR(36) PRIMARY KEY,
  rt_id       CHAR(36) NULL,
  actor_user_id CHAR(36) NOT NULL,
  action      VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id   CHAR(36) NULL,
  metadata_json TEXT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_user FOREIGN KEY (actor_user_id) REFERENCES users(id)
);

CREATE INDEX idx_audit_rt_time ON audit_logs (rt_id, created_at);
```

---

## 14. Event List & WhatsApp Template Keys

### 14.1 Event List (Domain Events)
Event berikut direkomendasikan untuk memicu outbox notifikasi, audit log, dan workflow:

**Tenant**
- `TenantRegistered` (RT baru dibuat, pending)
- `TenantApproved`
- `TenantRejected`

**Registrasi warga**
- `ResidentRegistrationSubmitted`
- `ResidentRegistrationApproved`
- `ResidentRegistrationRejected`

**Wallet/Deposit & Kas RT**
- `WalletTopupSubmitted`
- `WalletTopupApproved`
- `WalletTopupRejected`
- `KasRtMonthlyDebitSucceeded`
- `KasRtMonthlyDebitFailedInsufficientBalance`

**Iuran**
- `FeeCampaignCreated`
- `FeeCampaignActivated`
- `FeeBillingGenerated`
- `FeePaymentSubmitted`
- `FeePaymentApproved`
- `FeePaymentRejected`

**Kas**
- `CashEntryCreated`
- `CashEntryUpdated`
- `CashEntryVoided` (opsional jika memakai void/reversal)

**Surat**
- `LetterSubmitted`
- `LetterApproved`
- `LetterRejected`

**Subscription**
- `SubscriptionTrialStarted`
- `InvoiceIssued`
- `InvoicePaid`
- `SubscriptionSuspended`
- `SubscriptionReactivated`

### 14.2 WhatsApp Template Keys (Draft)
Template key disarankan konsisten: `rt.<domain>.<action>.<version>`

**Registrasi**
- `rt.resident.registered.v1`
  - payload: `{ residentName, rtName, status }`
- `rt.resident.approved.v1`
  - payload: `{ residentName, rtName }`
- `rt.resident.rejected.v1`
  - payload: `{ residentName, rtName, reason? }`
- `rt.admin.notify.new_resident_pending.v1`
  - payload: `{ rtName, residentName, phone }`

**Top-up deposit**
- `rt.wallet.topup.submitted.v1`
  - payload: `{ residentName, amount, rtName }`
- `rt.wallet.topup.approved.v1`
  - payload: `{ residentName, amount, newBalance, rtName }`
- `rt.wallet.topup.rejected.v1`
  - payload: `{ residentName, amount, rtName, reason? }`
- `rt.admin.notify.topup_pending.v1`
  - payload: `{ rtName, residentName, amount }`

**Kas RT bulanan**
- `rt.kasrt.debit.success.v1`
  - payload: `{ residentName, period, amount, balance, rtName }`
- `rt.kasrt.debit.insufficient.v1`
  - payload: `{ residentName, period, amount, balance, rtName, topupLink }`

**Iuran lain**
- `rt.fee.billing.due.v1`
  - payload: `{ residentName, feeName, amount, dueDate, rtName, payLink }`
- `rt.fee.payment.submitted.v1`
  - payload: `{ residentName, feeName, amount, rtName }`
- `rt.fee.payment.approved.v1`
  - payload: `{ residentName, feeName, amount, rtName }`
- `rt.fee.payment.rejected.v1`
  - payload: `{ residentName, feeName, amount, rtName, reason? }`
- `rt.admin.notify.fee_payment_pending.v1`
  - payload: `{ rtName, residentName, feeName, amount }`

**Surat**
- `rt.letter.submitted.v1`
  - payload: `{ residentName, letterType, rtName }`
- `rt.letter.approved.v1`
  - payload: `{ residentName, letterType, letterNumber, rtName, downloadLink }`
- `rt.letter.rejected.v1`
  - payload: `{ residentName, letterType, rtName, reason? }`

**Subscription**
- `rt.subscription.invoice.issued.v1`
  - payload: `{ rtName, planName, amount, dueDate, invoiceLink }`
- `rt.subscription.suspended.v1`
  - payload: `{ rtName, reason?, invoiceLink }`

---

## 15. Lampiran Implementasi (OpenAPI, ERD, dan Contoh Payload)

### 15.1 OpenAPI (swagger.yaml)
File OpenAPI draft:
- `swagger.yaml`

Catatan pengembangan:
- Tambahkan standar response error (400/401/403/404/409) dan schema error (`errorCode`, `message`, `details`).
- Tambahkan pagination untuk list endpoint (limit/offset atau cursor).
- Tambahkan endpoint yang belum masuk di draft ringkas ini (cash update/void, surat reject, PDF report lain, WA outbox opsional, subscription detail).

### 15.2 ERD (Diagram Relasi)
Diagram ERD tersedia:
- `ERD_PORTAL_RT.png`

### 15.3 Contoh Payload Request/Response (Flow Penting)

#### A) Register Warga + Upload KTP/KK (PENDING)
**1) Minta signed upload URL dokumen**
`POST /residents/{residentId}/documents/upload-url`
```json
{
  "docType": "KTP",
  "mimeType": "image/jpeg",
  "fileSize": 1200345
}
```
Response:
```json
{
  "uploadUrl": "https://storage.example.com/signed-upload-url",
  "fileUrl": "s3://private-bucket/rt/<rtId>/residents/<residentId>/ktp.jpg",
  "expiresAt": "2026-01-15T03:00:00Z"
}
```

**2) Submit registrasi warga**
`POST /residents/register`
```json
{
  "rtJoin": { "method": "INVITE_CODE", "inviteCode": "RT01RW05-ABCD" },
  "resident": { "fullName": "Budi Santoso", "phone": "6281234567890", "address": "Jl. Mawar No 10" },
  "familyCard": {
    "kkNumber": "3174xxxxxxxxxxxx",
    "members": [
      { "fullName": "Budi Santoso", "relationship": "HEAD" },
      { "fullName": "Siti Aminah", "relationship": "SPOUSE" }
    ]
  },
  "documents": {
    "ktpFileUrl": "s3://private-bucket/rt/.../ktp.jpg",
    "kkFileUrl": "s3://private-bucket/rt/.../kk.jpg"
  }
}
```
Response:
```json
{
  "id": "b2d6b9b0-7f5f-4c85-8b41-8f8c8f2c7e55",
  "rtId": "3f9892b5-3f5d-4f1a-a41a-4f5d7c7ad4c1",
  "fullName": "Budi Santoso",
  "phone": "6281234567890",
  "approvalStatus": "PENDING"
}
```

#### B) Approval Register Warga
Approve:
`POST /residents/{residentId}/approve`
Response:
```json
{ "id": "b2d6b9b0-7f5f-4c85-8b41-8f8c8f2c7e55", "approvalStatus": "APPROVED" }
```

Reject:
`POST /residents/{residentId}/reject`
```json
{ "reason": "Foto KTP tidak jelas" }
```
Response:
```json
{ "id": "b2d6b9b0-7f5f-4c85-8b41-8f8c8f2c7e55", "approvalStatus": "REJECTED" }
```

#### C) Top-up Deposit (Warga) + Approval
Submit:
`POST /wallet/topups`
```json
{
  "amount": 100000,
  "proofFileUrl": "s3://private-bucket/rt/.../bukti-transfer.jpg"
}
```
Response:
```json
{ "id": "ac0b2bd8-6f8a-4eab-a6d2-8f9d0c3b0b1a", "amount": 100000, "status": "PENDING" }
```

Approve:
`POST /wallet/topups/{topupId}/approve`
Response:
```json
{ "id": "ac0b2bd8-6f8a-4eab-a6d2-8f9d0c3b0b1a", "status": "APPROVED" }
```

#### D) Auto-debit Bulanan Kas RT (Scheduler)
Job bulanan (internal, bukan endpoint publik):
- Insert `kas_rt_monthly_charge` unik per `(rtId, residentId, period)` untuk idempotensi.
- Jika saldo cukup:
  - create `wallet_transactions` (DEBIT, `KAS_RT_MONTHLY_DEBIT`)
  - create `cash_ledger` pemasukan (IN, category "Kas RT")
  - enqueue WA: `rt.kasrt.debit.success.v1`
- Jika saldo kurang:
  - set charge `UNPAID`
  - enqueue WA: `rt.kasrt.debit.insufficient.v1`

#### E) Iuran Dadakan (Agustusan) + Bukti + Approval
Buat campaign:
`POST /fees/campaigns`
```json
{
  "name": "Iuran Agustusan 2026",
  "campaignType": "ONE_TIME",
  "amountType": "FIXED",
  "fixedAmount": 25000
}
```
Response:
```json
{ "id": "d3d2c2a1-1111-2222-3333-444455556666", "status": "DRAFT" }
```

Submit bukti bayar:
`POST /fees/billings/{billingId}/payments`
```json
{
  "amount": 25000,
  "proofFileUrl": "s3://private-bucket/rt/.../bukti-agustusan.jpg"
}
```
Response:
```json
{ "id": "e9f8a7b6-7777-8888-9999-aaaaaaaabbbb", "status": "PENDING" }
```

Approve:
`POST /fees/payments/{paymentId}/approve`
Response:
```json
{ "id": "e9f8a7b6-7777-8888-9999-aaaaaaaabbbb", "status": "APPROVED" }
```

### 15.4 File Lampiran
- OpenAPI: `swagger.yaml`
- ERD: `ERD_PORTAL_RT.png`