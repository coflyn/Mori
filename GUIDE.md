# Mori Installation & User Guide

简体中文：[GUIDE.zh-CN.md](GUIDE.zh-CN.md)

This guide covers everything you need to know about installing, sideloading, troubleshooting, and getting the most out of Mori on Android, iOS, and Desktop (CLI).

> 💬 **Official Community & Updates**: Join our official [WhatsApp Channel](https://whatsapp.com/channel/0029VbDXoqs6mYPSVp4UcT2A) for release announcements, news, and community discussions.

---

## 📥 Download Official Releases

Always download official Mori release binaries directly from the **[GitHub Releases](https://github.com/coflyn/Mori/releases)** page or install via **npm**.

| Platform | Recommended Asset | Installation Method |
| :--- | :--- | :--- |
| **Android** | `Mori v{VERSION}.apk` | Direct Sideload / Install |
| **iOS** | `Mori v{VERSION}.ipa` | Sideload (AltStore / TrollStore / Scarlet) |
| **CLI (Desktop & Server)** | `@coflyn/mori` | `npx @coflyn/mori` / `npm i -g @coflyn/mori` |

---

## 📱 Android Installation & Troubleshooting

### Standard Installation
1. Download `Mori v{VERSION}.apk` on your phone.
2. Open the downloaded APK and tap **Install**.
3. Grant storage permissions when prompted so Mori can save media to your device.

### "Blocked by Play Protect" Warning
Because Mori is an open-source application distributed outside the Google Play Store without commercial certificates, Google Play Protect may display an advisory prompt:
1. Tap **"More Details"**.
2. Tap **"Install Anyway"**.
3. *(Optional)* Scan the `.apk` on **[VirusTotal](https://www.virustotal.com/)** for complete peace of mind.

---

## 💻 Desktop (macOS, Windows, Linux) via CLI

Desktop users can run Mori directly using the universal CLI without manual setup or native installers:

```bash
# Run directly without installation
npx @coflyn/mori

# Or install globally
npm install -g @coflyn/mori
mori
```

Refer to the main [CLI Documentation](cli/README.md) for full commands, flags, and options.

---

## 📲 iOS Sideloading Guide

Since Mori is not distributed on the Apple App Store, iOS users can install `Mori v{VERSION}.ipa` using any of the following sideloading tools:

### Option 1: AltStore / Sideloadly (Recommended for all iOS versions)
* **Best for:** Devices running any modern iOS version without jailbreak.
* **Requirements:** A PC or Mac for initial installation.
* **Steps:**
  1. Install [AltStore](https://altstore.io/) or [Sideloadly](https://sideloadly.io/) on your computer.
  2. Download `Mori v{VERSION}.ipa`.
  3. Connect your iPhone via USB and select the IPA to install with your free Apple ID.
  4. *Note:* App signatures refresh every 7 days automatically when on the same Wi-Fi.

### Option 2: TrollStore (Permanent - No Expire)
* **Best for:** Compatible iOS versions (iOS 14.0 – 16.6.1 / 17.0).
* **Steps:**
  1. Open the downloaded `Mori v{VERSION}.ipa` directly in TrollStore.
  2. Tap **Install**. It installs permanently without 7-day expiration or computer refresh.

### Option 3: Scarlet / Esign (On-Device Direct Install)
* **Best for:** Direct installation without a PC using enterprise developer certificates.
* **Steps:**
  1. Open Scarlet or Esign on your iPhone.
  2. Import `Mori v{VERSION}.ipa` and tap **Sign & Install**.

---

## 💡 How to Use Mori

1. **One-Tap Download**:
   - Copy a video/photo/music link from any of the 14 supported apps.
   - Open Mori (or tap the **Paste** button). Mori auto-detects copied links.
   - Tap **Analyze** → Choose format/quality → Tap **Download**.
2. **Quick Save via Share Menu (Android)**:
   - In TikTok, Instagram, or YouTube, tap **Share** → Select **Mori**.
   - Mori opens a quick overlay to download the media without leaving your current app.
3. **Multi-Link Batch Mode**:
   - Paste several URLs (separated by newlines or spaces) in the input box.
   - Mori queues and analyzes them automatically.
4. **Download Entire Playlists / Albums**:
   - Paste a Spotify, Apple Music, or YouTube playlist link.
   - Tap **Download All** to download all tracks in sequence with automatic retry for failed items.
5. **Photo-to-PDF Gallery Export**:
   - When viewing a multi-photo post (Instagram, TikTok Slides, RedNote), select **Combine into Single PDF** to export the entire album into a single PDF document.
6. **Privacy PIN & Biometric Lock**:
   - Go to **Settings** → **General** → **App Lock**.
   - Set a 4-digit PIN or enable Fingerprint / Face ID to keep your downloads private.

---

## 🔒 Safety & Privacy Verification

Mori is **100% ad-free, open-source, and contains zero trackers or telemetry**.
* All parsing, HTTP requests, and file saving execute **directly on your device**.
* No data is sent to external servers or third parties.
* You can scan any binary on **[VirusTotal](https://www.virustotal.com/)** before installation.

---

Developed with ❤️ by coflyn.  
WhatsApp Channel: https://whatsapp.com/channel/0029VbDXoqs6mYPSVp4UcT2A  
GitHub: https://github.com/coflyn  
Instagram: @\_coflyn
