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
