# Panduan instalasi dan penggunaan Mori

Bahasa lain: [English](../GUIDE.md) · [简体中文](GUIDE-zh-CN.md) · [Español](GUIDE-es.md)

Pembaruan dan info: [Saluran WhatsApp](https://whatsapp.com/channel/0029VbDXoqs6mYPSVp4UcT2A)

## Download rilis

Download file resmi dari [GitHub Releases](https://github.com/coflyn/Mori/releases) atau pasang lewat npm.

| Platform | File | Cara pasang |
| :--- | :--- | :--- |
| Android | `Mori v{VERSION}.apk` | Install langsung |
| iOS | `Mori v{VERSION}.ipa` | Sideload (AltStore, TrollStore, Scarlet) |
| Desktop CLI | `@coflyn/mori` | `npx @coflyn/mori` atau `npm i -g @coflyn/mori` |

## Instalasi Android

### Instalasi standar
1. Download `Mori v{VERSION}.apk`.
2. Buka file APK dan pilih Install.
3. Berikan izin penyimpanan saat diminta.

### Peringatan Play Protect
Mori didistribusikan di luar Google Play Store tanpa sertifikat komersial, jadi Play Protect mungkin memunculkan peringatan:
1. Pilih Detail Lainnya (More Details).
2. Pilih Tetap Install (Install Anyway).
3. Kamu bisa cek file APK di [VirusTotal](https://www.virustotal.com/) sebelum memasang.

## Desktop CLI

Jalankan Mori langsung lewat terminal:

```bash
# Langsung jalankan
npx @coflyn/mori

# Atau install global
npm install -g @coflyn/mori
mori
```

Lihat [dokumentasi CLI](../cli/README.md) untuk daftar perintah lengkap.

## Sideload iOS

Pasang `Mori v{VERSION}.ipa` menggunakan salah satu alat ini:

### AltStore atau Sideloadly
Bisa untuk semua versi iOS tanpa jailbreak. Memerlukan komputer untuk pemasangan awal.
1. Pasang [AltStore](https://altstore.io/) atau [Sideloadly](https://sideloadly.io/) di komputer.
2. Download `Mori v{VERSION}.ipa`.
3. Sambungkan iPhone lewat kabel USB dan pasang IPA memakai Apple ID.
4. AltStore memperbarui sertifikat tiap 7 hari lewat Wi-Fi.

### TrollStore
Untuk iOS 14.0 sampai 16.6.1 dan iOS 17.0.
1. Buka file IPA yang sudah didownload di TrollStore.
2. Pilih Install. Aplikasi aktif permanen tanpa batas 7 hari dan tanpa perlu komputer lagi.

### Scarlet atau Esign
Pasang langsung di HP memakai sertifikat enterprise tanpa komputer.
1. Buka Scarlet atau Esign di iPhone.
2. Masukkan `Mori v{VERSION}.ipa` lalu pilih Sign & Install.

## Cara pakai

1. Download cepat:
   Salin link dari platform yang didukung, buka Mori, pilih Analisis, tentukan format, lalu pilih Download.
2. Menu berbagi (Android):
   Pilih opsi Bagikan (Share) di TikTok, Instagram, atau YouTube, lalu pilih Mori untuk mengunduh tanpa keluar aplikasi.
3. Mode batch:
   Tempel beberapa URL sekaligus (pisahkan dengan baris baru atau spasi) di kolom input.
4. Playlist dan album:
   Tempel link playlist Spotify, Apple Music, atau YouTube, lalu pilih Download Semua.
5. Gabung gambar ke PDF:
   Untuk postingan berisi banyak gambar, pilih opsi gabung ke PDF untuk menyatukan semua foto dalam satu file.
6. Kunci aplikasi:
   Aktifkan PIN atau sidik jari/Face ID di Pengaturan > Umum > Kunci Aplikasi.

## Privasi

Mori tidak memiliki iklan, analitik, atau pelacak latar belakang. Pemrosesan link dan penyimpanan file berjalan langsung di perangkat kamu. File rilis bisa diperiksa di [VirusTotal](https://www.virustotal.com/).

---

Dikembangkan oleh coflyn.  
Saluran WhatsApp: https://whatsapp.com/channel/0029VbDXoqs6mYPSVp4UcT2A  
GitHub: https://github.com/coflyn  
Instagram: @\_coflyn
