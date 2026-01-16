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
