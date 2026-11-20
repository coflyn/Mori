# Mori installation and user guide

Translations: [简体中文](translations/GUIDE-zh-CN.md) · [Bahasa Indonesia](translations/GUIDE-id.md) · [Español](translations/GUIDE-es.md)

Updates and announcements: [WhatsApp Channel](https://whatsapp.com/channel/0029VbDXoqs6mYPSVp4UcT2A)

## Download releases

Download binaries from [GitHub Releases](https://github.com/coflyn/Mori/releases) or install via npm.

| Platform | File | Method |
| :--- | :--- | :--- |
| Android | `Mori v{VERSION}.apk` | Direct install |
| iOS | `Mori v{VERSION}.ipa` | Sideload (AltStore, TrollStore, Scarlet) |
| Desktop CLI | `@coflyn/mori` | `npx @coflyn/mori` or `npm i -g @coflyn/mori` |

## Android installation

### Standard install
1. Download `Mori v{VERSION}.apk`.
2. Open the APK and tap Install.
3. Grant storage permissions when prompted.

### Blocked by Play Protect
Mori is distributed outside Google Play without commercial certificates, so Play Protect may show a warning:
1. Tap More Details.
2. Tap Install Anyway.
3. You can verify the APK on [VirusTotal](https://www.virustotal.com/) before installing.

## Desktop CLI

Run Mori from the terminal:

```bash
# Run directly
npx @coflyn/mori

# Or install globally
npm install -g @coflyn/mori
mori
```

See [CLI documentation](cli/README.md) for available commands and flags.

## iOS sideloading

Install `Mori v{VERSION}.ipa` using one of these tools:

### AltStore or Sideloadly
Works on any iOS version without jailbreak. Requires a computer for setup.
1. Install [AltStore](https://altstore.io/) or [Sideloadly](https://sideloadly.io/) on your computer.
2. Download `Mori v{VERSION}.ipa`.
3. Connect your iPhone via USB and install the IPA with your Apple ID.
4. AltStore refreshes signatures every 7 days over Wi-Fi.

### TrollStore
For iOS 14.0 to 16.6.1 and iOS 17.0.
1. Open the downloaded IPA in TrollStore.
2. Tap Install. It installs permanently without the 7-day refresh requirement.

### Scarlet or Esign
Direct on-device install using enterprise certificates, no computer required.
1. Open Scarlet or Esign on your iPhone.
2. Import `Mori v{VERSION}.ipa` and tap Sign & Install.

## Usage

1. One-tap download:
   Copy a link from any supported platform, open Mori, tap Analyze, select format, then tap Download.
2. Share sheet (Android):
   Tap Share in TikTok, Instagram, or YouTube, then select Mori to download without leaving the app.
3. Batch downloads:
   Paste multiple URLs separated by newlines or spaces into the input box.
4. Playlists and albums:
   Paste a Spotify, Apple Music, or YouTube playlist link, then tap Download All.
5. Combine images to PDF:
   For multi-image posts, select Combine into Single PDF to export the images as one file.
6. App lock:
   Enable PIN or biometric lock under Settings > General > App Lock.

## Privacy

Mori has no ads, analytics, or background tracking. Network requests and file saving run on your device. You can verify any release binary on [VirusTotal](https://www.virustotal.com/).

---

Developed by coflyn.  
WhatsApp Channel: https://whatsapp.com/channel/0029VbDXoqs6mYPSVp4UcT2A  
GitHub: https://github.com/coflyn  
Instagram: @\_coflyn
