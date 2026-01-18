# Frontend Portal RT (React + Vite)

Frontend ringan untuk Tahap 1: login, registrasi warga, dashboard admin, daftar/detail warga, dan lengkapi profil.

## Cara menjalankan

```bash
cd frontend-vite
npm install
npm run dev
```

## Konfigurasi API

Default API: `http://localhost:3000`.
Ubah lewat env:

```bash
set VITE_API_BASE_URL=http://localhost:3000
```

## reCAPTCHA

Tambahkan site key:

```bash
set VITE_RECAPTCHA_SITE_KEY=YOUR_RECAPTCHA_SITE_KEY
```

## Upload Dokumen

Upload KTP/KK dilakukan via backend endpoint `/me/documents`.
File disimpan di storage lokal backend, akses file melalui endpoint backend `/documents/:id`.

## Step-by-step testing PWA

1. Jalankan build produksi:
   ```bash
   cd frontend-vite
   npm run build
   ```
2. Jalankan preview (PWA aktif hanya di mode produksi):
   ```bash
   npm run preview
   ```
3. Buka `http://localhost:4173` di Chrome/Edge.
4. Pastikan Service Worker terdaftar:
   - DevTools -> Application -> Service Workers -> lihat `sw.js`.
5. Uji instalasi:
   - Klik ikon install di address bar, atau
   - Menu browser -> Install Portal RT.
6. Uji offline:
   - DevTools -> Application -> Service Workers -> centang "Offline",
   - Refresh halaman, harus tampil `offline.html`.
7. Uji cache update:
   - Ubah `CACHE_NAME` di `public/sw.js`, build ulang, lalu reload.
