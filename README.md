# Guakodingin Inbox

Shared inbox internal untuk **satu nomor WhatsApp Business Platform dan satu akun Instagram profesional**, dipakai bersama oleh empat anggota tim. Dibangun dengan Next.js, Neon PostgreSQL, dan API resmi Meta. Siap di-host di Vercel.

## Yang sudah tersedia

- Login anggota dengan sesi HttpOnly, kata sandi `scrypt`, dan penguncian sementara setelah gagal masuk berulang kali.
- Inbox gabungan, pencarian, filter channel, pesan belum dibaca, status, penugasan, catatan, dan balasan cepat.
- Balasan teks WhatsApp dan Instagram melalui API resmi Meta. Penugasan mencegah dua anggota membalas percakapan yang sama. Balasan WhatsApp bebas ditolak setelah 24 jam dari pesan masuk terakhir.
- Satu webhook Meta dengan verifikasi token dan tanda tangan `X-Hub-Signature-256`. Event berulang tidak membuat pesan ganda.
- Polling dashboard 5 detik. Tampilan responsif untuk ponsel.
- `/demo` untuk meninjau UI tanpa database atau kredensial Meta. Data demo tidak tersimpan dan tidak dikirim ke pelanggan.

## Jalankan lokal

1. Jalankan `npm install`.
2. Salin `.env.example` menjadi `.env.local` dan isi `DATABASE_URL` dari Neon.
3. Jalankan `npm run db:migrate`.
4. Buat akun anggota, misalnya:

   ```powershell
   npm run user:create -- "Farel" "farel@contoh.com" owner
   npm run user:create -- "Anggota 2" "anggota2@contoh.com" agent
   ```

   Perintah akan meminta kata sandi secara tersembunyi di terminal.

5. Jalankan `npm run dev`, lalu buka `http://localhost:3000`.

Tanpa `DATABASE_URL`, halaman awal membuka `/demo`. Akun dan chat nyata baru tersedia setelah migrasi dan konfigurasi Meta selesai.

## Hubungkan Meta

Gunakan satu Meta Developer App dengan produk WhatsApp dan Instagram API with Instagram Login. Akun Instagram perlu akun profesional serta izin `instagram_business_manage_messages`. Aktifkan webhook pesan untuk kedua produk. Akun/nomor, token, dan izin harus disiapkan di Meta; kode ini tidak bisa membuatnya otomatis.

Isi variabel berikut di `.env.local` dan Vercel Project Settings → Environment Variables:

| Variabel | Isi |
| --- | --- |
| `DATABASE_URL` | Connection string PostgreSQL dari Neon |
| `META_APP_SECRET` | App secret untuk verifikasi tanda tangan webhook |
| `META_VERIFY_TOKEN` | String acak yang sama dengan konfigurasi webhook di Meta |
| `META_API_VERSION` | Versi Graph API yang diuji di Meta, misalnya `v25.0` |
| `WHATSAPP_PHONE_NUMBER_ID` | ID nomor WhatsApp Business Platform |
| `WHATSAPP_ACCESS_TOKEN` | Token WhatsApp dengan izin pengiriman pesan |
| `INSTAGRAM_ACCOUNT_ID` | ID akun Instagram profesional |
| `INSTAGRAM_ACCESS_TOKEN` | Token Instagram dengan izin mengelola pesan |

Callback URL untuk keduanya:

```text
https://DOMAIN-VERCEL-ANDA/api/webhooks/meta
```

Meta memanggil URL itu dengan metode GET untuk verifikasi dan POST untuk event pesan. Gunakan domain produksi yang stabil, bukan URL preview. Setelah konfigurasi, uji pesan masuk dan balasan dari akun pelanggan lain pada **kedua channel** sebelum dipakai tim. Token Meta harus dijaga di sisi server dan diperbarui sesuai masa berlakunya.

## Deploy Vercel

1. Hubungkan folder ini ke repo Git lalu push ke GitHub, kemudian impor repo tersebut ke Vercel sebagai proyek Next.js. Alternatifnya, deploy langsung dengan Vercel CLI.
2. Isi seluruh variabel lingkungan di atas, lalu deploy.
3. Jalankan migrasi terhadap database Neon produksi dari komputer lokal memakai `DATABASE_URL` produksi. Perintah migrasi aman dijalankan berulang karena menggunakan `IF NOT EXISTS`.
4. Buat empat akun anggota dengan `npm run user:create` menggunakan database produksi.
5. Daftarkan callback webhook dan uji dari Meta Developer Dashboard.

Jangan taruh token Meta, app secret, atau connection string Neon di variabel `NEXT_PUBLIC_*` maupun di repo.

## Batas versi pertama

Pengiriman saat ini hanya pesan teks. Lampiran masuk ditandai sebagai lampiran tanpa mengunduh atau menampilkan kontennya. Setelah jendela layanan WhatsApp 24 jam berakhir, admin perlu memakai template yang disetujui melalui alat Meta; pengiriman template belum ada di dashboard. Pesan Instagram juga harus mengikuti kebijakan jendela pesan Meta. Inbox menampilkan 300 percakapan terakhir dan 500 pesan per percakapan. Riwayat lama yang sudah ada di aplikasi Meta tidak diimpor otomatis; inbox mulai mengumpulkan pesan setelah webhook aktif.

## Rujukan integrasi

- [Meta WhatsApp Cloud API — Messages](https://www.postman.com/meta/whatsapp-business-platform/folder/13382743-ba8d099d-007e-4b52-b9f2-3cf3c60e4fbc)
- [Meta Instagram API with Instagram Login](https://www.postman.com/meta/workspace/instagram/documentation/23987686-9386f468-7714-490f-9bfc-9442db5c8f00)
- [WhatsApp Business Policy — customer service window](https://whatsappbusiness.com/policy/)
- [Neon serverless driver](https://neon.com/docs/serverless/serverless-driver)
