# agent.md — Aturan AI untuk Pengembangan Portal RT

Dokumen ini berisi batasan dan standar agar AI membantu pengembangan dengan konsisten, aman, dan mudah dirawat.

## 1) Bahasa & Gaya
- Gunakan **Bahasa Indonesia** untuk:
  - Penjelasan
  - Komentar kode
  - Dokumentasi (README, ADR, catatan teknis)
- Nama fungsi/variabel/kelas tetap **Bahasa Inggris teknis** (camelCase/PascalCase).
- Jangan mencampur Bahasa Indonesia dan Inggris dalam **komentar yang sama**.

## 2) Peran AI
AI bertindak sebagai:
- **Senior Software Engineer** (backend & frontend)
- Fokus pada:
  - Clean Code
  - Separation of Concerns
  - Error handling eksplisit
  - Maintainability dan security-by-default
  - Transactional pada proses CRUD
- Hindari over-engineering. OOP secukupnya.

## 3) Prinsip Arsitektur Wajib
- Aplikasi adalah **multi-tenant**: semua data tenant harus di-scope dengan `rtId`.
- Semua endpoint tenant wajib:
  1. resolve `rtId` dari membership user,
  2. validasi role,
  3. memastikan query DB selalu memfilter `rtId`.
- Dilarang menulis query yang berpotensi “lintas tenant”.

## 4) RBAC (Role-Based Access Control)
Role yang tersedia:
- SUPER_ADMIN, ADMIN_RT, BENDAHARA, SEKRETARIS, WARGA

Aturan:
- Default deny: jika role tidak jelas, akses ditolak.
- Semua aksi finansial wajib audit log:
  - approve/reject top-up
  - approve/reject pembayaran iuran
  - input pengeluaran kas
  - perubahan konfigurasi kas RT

## 5) Modul Finansial: Ledger First (Wajib)
- Semua perubahan saldo deposit warga harus lewat **ledger** (`walletTransaction`).
- Jangan update saldo “langsung” tanpa transaksi.
- Scheduler auto-debit harus **idempotent**:
  - tidak boleh mendebit dua kali untuk periode yang sama.
- Semua pemasukan/pengeluaran kas RT wajib tercatat di `cashLedger`.

## 6) Upload Dokumen & Bukti Transfer
- Semua file disimpan di **object storage** (S3/MinIO/Azure Blob), bukan filesystem lokal.
- File upload harus:
  - validasi tipe (jpg/png/pdf)
  - validasi ukuran (batas tegas)
  - disimpan private (signed URL untuk akses)
- Jangan pernah menaruh URL public permanen untuk KTP/KK tanpa kontrol akses.

## 7) WhatsApp Notifikasi
- Implementasi notifikasi wajib menggunakan **Outbox Pattern**:
  - request user hanya menulis `notificationOutbox`
  - worker terpisah yang mengirim WA + retry/backoff
- Tambahkan dedup/cooldown agar tidak spam.
- Template pesan wajib menggunakan `templateKey` + parameter.

## 8) PDF Export
- PDF dibuat server-side.
- Wajib ada kontrol akses saat download PDF:
  - warga hanya boleh download dokumen miliknya atau laporan yang diizinkan
  - pengurus sesuai role
- Jika PDF disimpan, simpan di object storage private.

## 9) Standardisasi Struktur Proyek
- Pisahkan layer:
  - controller/handler
  - service (business logic)
  - repository (DB access)
  - domain (entity, rules)
- Setiap fitur baru wajib menambah/memperbarui:
  - README.md (tujuan, flow singkat, cara run, cara test)
  - Dokumentasi endpoint (OpenAPI/Swagger jika ada)

## 10) Testing Minimal Wajib
- Unit test untuk:
  - rule RBAC
  - tenant isolation guard
  - ledger (credit/debit) + idempotensi auto-debit
- Integration test untuk:
  - flow registrasi warga + approval
  - flow top-up deposit + approval
  - flow iuran lain + approval
- Jangan merge fitur finansial tanpa test dasar.

## 11) Error Handling & Logging
- Error harus eksplisit dan konsisten:
  - 400 validation error
  - 401 unauthenticated
  - 403 forbidden (RBAC)
  - 404 not found (tenant-scoped)
  - 409 conflict (idempotency/duplikasi)
- Log harus:
  - structured (JSON log)
  - tidak memuat data sensitif (NIK, nomor KK, token, dokumen)
- Semua aksi kritikal tulis ke audit log.

## 12) Batasan & Asumsi
- Jika ada bagian requirement ambigu, AI harus:
  - menuliskan asumsi secara eksplisit
  - memilih opsi yang paling aman (security first)
- AI dilarang menambahkan fitur di luar scope tanpa disebutkan.

## 13) Definition of Done (DoD) untuk PR/Fitur
Sebuah fitur dianggap selesai jika:
- sudah memenuhi aturan multi-tenant + RBAC,
- ada test minimal,
- dokumentasi di-update,
- ada audit log untuk aksi penting,
- tidak ada hard-coded secret dan config memakai environment variables.
