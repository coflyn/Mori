# Panduan Instalasi & Penggunaan Mori

English: [GUIDE.md](../GUIDE.md) · 简体中文：[GUIDE-zh-CN.md](GUIDE-zh-CN.md) · Español: [GUIDE-es.md](GUIDE-es.md)

Panduan lengkap instalasi, sideload, cara pakai, dan troubleshooting Mori di Android, iOS, dan Desktop (CLI).

> 💬 **Komunitas & Info Update**: Gabung ke [Saluran WhatsApp Resmi](https://whatsapp.com/channel/0029VbDXoqs6mYPSVp4UcT2A) buat dapat pengumuman rilis terbaru dan diskusi.

---

## 📥 Download Rilis Resmi

Download file instalasi resmi Mori langsung dari halaman **[GitHub Releases](https://github.com/coflyn/Mori/releases)** atau install lewat **npm**.

| Platform | File | Cara Pasang |
| :--- | :--- | :--- |
| **Android** | `Mori v{VERSION}.apk` | Install langsung (Sideload) |
| **iOS** | `Mori v{VERSION}.ipa` | Sideload (AltStore / TrollStore / Scarlet) |
| **CLI (Desktop & Server)** | `@coflyn/mori` | `npx @coflyn/mori` / `npm i -g @coflyn/mori` |

---

## 📱 Instalasi Android & Troubleshooting

### Instalasi Biasa
1. Download file `Mori v{VERSION}.apk` di HP.
2. Buka file APK yang sudah didownload, terus klik **Instal**.
3. Izinkan akses penyimpanan saat diminta supaya Mori bisa nyimpen file ke memori HP.

### Muncul Peringatan "Diblokir oleh Play Protect"
Karena Mori adalah aplikasi open source yang didistribusikan di luar Google Play Store dan tanpa sertifikat komersial berbayar, Play Protect biasanya bakal nampilin peringatan:
1. Klik **"Detail Selengkapnya"** (atau "More Details").
2. Klik **"Tetap Instal"** (atau "Install Anyway").
3. *(Opsional)* Cek file `.apk` di **[VirusTotal](https://www.virustotal.com/)** kalau mau pastikan keamanannya.

---

## 💻 Desktop (macOS, Windows, Linux) lewat CLI

Di laptop atau PC, kamu bisa langsung jalanin Mori lewat CLI tanpa perlu install aplikasi desktop:

```bash
# Langsung jalankan tanpa install
npx @coflyn/mori

# Atau install global biar bisa dipanggil kapan saja
npm install -g @coflyn/mori
mori
```

Cek [Dokumentasi CLI](../cli/README.md) buat daftar perintah dan opsi lengkapnya.

---

## 📲 Panduan Sideload iOS

Karena Mori nggak masuk ke App Store, pengguna iPhone/iPad bisa pasang `Mori v{VERSION}.ipa` pakai salah satu cara sideload ini:

### Opsi 1: AltStore / Sideloadly (Rekomendasi untuk semua versi iOS)
* **Cocok untuk:** Semua versi iOS modern tanpa jailbreak.
* **Syarat:** Butuh PC atau Mac buat instalasi pertama kali.
* **Langkah:**
  1. Pasang [AltStore](https://altstore.io/) atau [Sideloadly](https://sideloadly.io/) di komputer.
  2. Download `Mori v{VERSION}.ipa`.
  3. Hubungkan iPhone ke komputer via kabel USB, lalu install file IPA pakai Apple ID gratisan kamu.
  4. *Catatan:* Sertifikat aplikasi bakal refresh otomatis tiap 7 hari pas connect ke Wi-Fi yang sama dengan PC.

### Opsi 2: TrollStore (Permanen, Nggak Bakal Expired)
* **Cocok untuk:** Versi iOS yang kompatibel (iOS 14.0 – 16.6.1 / 17.0).
* **Langkah:**
  1. Buka file `Mori v{VERSION}.ipa` langsung di dalam TrollStore.
  2. Klik **Install**. Aplikasi bakal aktif permanen tanpa batas kedaluwarsa 7 hari dan nggak butuh PC lagi.

### Opsi 3: Scarlet / Esign (Install Langsung di HP)
* **Cocok untuk:** Pasang langsung tanpa PC pakai sertifikat enterprise.
* **Langkah:**
  1. Buka Scarlet atau Esign di iPhone.
  2. Import file `Mori v{VERSION}.ipa`, lalu klik **Sign & Install**.

---

## 💡 Cara Pakai Mori

1. **Download Sekali Klik**:
   - Salin link video, foto, atau lagu dari aplikasi yang didukung.
   - Buka Mori (atau klik tombol **Tempel**). Mori otomatis mendeteksi link di clipboard.
   - Klik **Analisis** → Pilih kualitas/format → Klik **Download**.
2. **Download Cepat lewat Menu Share (Android)**:
   - Pas lagi buka TikTok, Instagram, atau YouTube, klik tombol **Share** → pilih **Mori**.
   - Mori bakal munculin pop-up download cepat tanpa kamu harus keluar dari aplikasi medsos.
3. **Mode Batch (Banyak Link Sekaligus)**:
   - Tempel beberapa link sekaligus (pisahkan pakai baris baru atau spasi) di kolom input.
   - Mori bakal otomatis antrekan dan proses semuanya.
4. **Download Full Album / Playlist**:
   - Tempel link playlist Spotify, Apple Music, atau YouTube.
   - Klik **Download Semua** buat download semua lagu berurutan. Ada fitur coba ulang otomatis kalau sempat gagal.
5. **Simpan Carousel Foto jadi Dokumen PDF**:
   - Kalau postingan punya banyak foto (slide TikTok, IG Carousel, RedNote), pilih opsi simpan jadi PDF biar langsung digabung jadi 1 file.
6. **Kunci Privasi PIN & Sidik Jari**:
   - Buka **Pengaturan** → **Umum** → **Kunci Aplikasi**.
   - Pasang PIN 4 angka atau aktifkan fingerprint / Face ID biar riwayat download kamu tetap aman.

---

## 🔒 Privasi & Keamanan

Mori **100% bebas iklan, open source, dan tanpa pelacak atau telemetri**.
* Semua proses parsing, request download, dan penyimpanan file jalan **langsung di perangkat kamu**.
* Nggak ada data yang dikirim ke server luar atau pihak ketiga mana pun.
* Kamu bisa scan file apa saja di **[VirusTotal](https://www.virustotal.com/)** sebelum install.

---

Dibuat dengan ❤️ oleh coflyn.  
Saluran WhatsApp: https://whatsapp.com/channel/0029VbDXoqs6mYPSVp4UcT2A  
GitHub: https://github.com/coflyn  
Instagram: @\_coflyn
