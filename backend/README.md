# Backend Portal RT (Tahap 0 - 1)

Implementasi minimal Tahap 0-1 berdasarkan `RANCANGAN_PORTAL_RT.md`:
- Multi-tenant `rtId` pada konteks auth
- Auth (login + refresh token)
- RBAC untuk SUPER_ADMIN dan role RT
- Approval RT baru oleh Super Admin
- Profil RT + invite code untuk Admin RT
- Audit log untuk aksi approval
- Registrasi warga + data keluarga + dokumen
- Approval warga + notifikasi outbox WhatsApp

## Cara menjalankan

```bash
npm install
npm run start
```

## Setup database MySQL (localhost)

Kredensial yang dipakai:
- Host: `localhost`
- Username: `root`
- Password: `rootPassword`
- Schema: `pwa_portal_rt`

Jalankan schema:

```bash
mysql -u root -p < db/schema.sql
```

Konfigurasi env database:
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `DB_POOL_LIMIT`

Scheduler cleanup refresh token:
- `REFRESH_CLEANUP_INTERVAL_MS` (default 900000 = 15 menit)

## Migrasi dari db.json (opsional)

Jika sebelumnya menggunakan `data/db.json`, jalankan:

```bash
node scripts/migrateJsonToMysql.js
```

## reCAPTCHA

Backend memvalidasi token reCAPTCHA dari frontend.
Set `RECAPTCHA_SECRET_KEY` di `.env`.

## Rate Limit

Pembatasan request untuk login dan upload:
- `RATE_LIMIT_LOGIN_WINDOW_MS` (default 60000)
- `RATE_LIMIT_LOGIN_MAX` (default 10)
- `RATE_LIMIT_UPLOAD_WINDOW_MS` (default 60000)
- `RATE_LIMIT_UPLOAD_MAX` (default 20)

## Storage Lokal Dokumen

Dokumen disimpan di storage lokal dan metadata disimpan di database.
Frontend tidak mengakses folder storage langsung, akses file melalui endpoint backend.

Konfigurasi env:
- `LOCAL_STORAGE_PATH` (default `backend/storage`)
- `UPLOAD_MAX_MB` (default 5)
- `PUBLIC_BASE_URL` (opsional, agar URL download dokumen absolut)

## Super admin default

Saat server berjalan, sistem membuat super admin jika belum ada.

- Email: `superadmin@portalrt.local`
- Password: `ChangeMe123!`

Ubah lewat env:

```bash
set SUPER_ADMIN_EMAIL=admin@example.com
set SUPER_ADMIN_PASSWORD=PasswordAnda
```

## Swagger

Swagger UI tersedia di `http://localhost:3000/docs`.

## Endpoint Tahap 0

### Auth
- POST `/auth/register-admin-rt`
- POST `/auth/login`
- POST `/auth/refresh`
- POST `/auth/logout`

### Super Admin
- GET `/super-admin/rts?status=PENDING_APPROVAL`
- POST `/super-admin/rts/{id}/approve`
- POST `/super-admin/rts/{id}/reject`
- GET `/super-admin/audit-logs`

### Admin RT
- GET `/rt/me`
- PUT `/rt/me`
- POST `/rt/invite-code`

## Endpoint Tahap 1

### Auth
- POST `/auth/register-warga`

### Residents
- GET `/residents?status=PENDING`
- GET `/residents/{id}`

### RT Approval
- GET `/rt/members?status=PENDING`
- POST `/rt/members/{id}/approve`
- POST `/rt/members/{id}/reject`

## Catatan

Tahap ini memakai penyimpanan JSON di `data/db.json`.
Ganti dengan database pada tahap berikutnya.

Asumsi awal:
- Registrasi warga menggunakan email + password untuk login.
- Upload dokumen masih berupa metadata URL (bukan upload file langsung).
