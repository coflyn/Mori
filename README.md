<p align="center">
  <img src="assets/icon.png" width="128" alt="Mori Logo">
</p>

<h1 align="center">Mori</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Version-v4.2.3-brown?style=flat-square" alt="Version">
  <img src="https://img.shields.io/github/downloads/coflyn/Mori/total?style=flat-square&color=blue" alt="Downloads">
  <img src="https://img.shields.io/github/stars/coflyn/Mori?style=flat-square&color=gold" alt="Stars">
  <img src="https://img.shields.io/github/repo-size/coflyn/Mori?style=flat-square&color=purple" alt="Repo Size">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/Platform-Android%20%7C%20iOS%20%7C%20macOS%20%7C%20Windows-3DDC84?style=flat-square&logo=android&logoColor=white" alt="Platform">
</p>

<div align="center">

Mori is a fast and simple downloader for saving videos, photos, and music from 14 popular social media apps. Everything works directly on your device without any external servers or tracking — giving you total privacy and zero ads.

</div>

## 📸 Screenshots

<p align="center">
  <img src="assets/1.png" width="30%">
  <img src="assets/2.png" width="30%">
  <img src="assets/3.png" width="30%">
</p>
<p align="center">
  <img src="assets/4.png" width="30%">
  <img src="assets/5.png" width="30%">
  <img src="assets/6.png" width="30%">
</p>

## Work in Progress

- **PIN Security Hashing & Startup Freeze Fix**: Upgraded PIN lock storage from plaintext to SHA-256 hashing (`crypto.subtle`) with automatic legacy PIN migration. Fixed an async syntax error in `authManager.js` that caused app navigation and gestures to freeze on launch.
- **RedNote / Xiaohongshu Resolution & Short Link Hardening**: Upgraded `scrapeRedNote` in `rednote.js` with dual-pass resolution for desktop PC links (`xiaohongshu.com/explore/...`), mobile H5 links (`rednote.com/discovery/item/...`), and short-link redirects (`xhslink.com` & `xhslink.cn`). Multi-path state JSON extraction (`state.noteData.data.noteData` & `state.note.noteDetailMap`) with landing page validation (`isLandingOrErrorPage`) eliminates dummy logo fallbacks and broken downloads.
- **Centralized User-Agent Architecture & Presets**: Refactored hardcoded User-Agent strings across scrapers into central exported constants (`CHROME_DESKTOP_UA` & `CHROME_MOBILE_UA`) in `utils/index.js` for clean reusability and maintainability.
- **Share Overlay Rectangular Option Skeleton & Dynamic Loader**: Replaced the generic preview card skeleton in `share.html` with matching rectangular download option bar skeletons (`.skeleton-option-item`) to eliminate layout shifts upon resolution. Added an inline button spinner (`.btn-spinner`) and localized dynamic phrase cycling (`loader-phrases`).
- **Loader Timeout Race Condition Fix**: Resolved a pending timeout race condition where stale error hide timers from previous failed attempts prematurely concealed the skeleton loader during subsequent analysis requests.
- **Batch Mode Network Guards & Modal Cancellation**: Enforced Wi-Fi Only and Cellular Data Warning guards across Batch Mode. Configured sequential batch analysis to immediately abort when the batch modal is dismissed.
- **Security & XSS Hardening**: HTML-escaped batch queue URLs and thumbnail card attributes to eliminate script-injection vectors from scraped titles and clipboard payloads.
- **Set-Cookie Parser Hardening**: Updated header cookie parsing logic to preserve `Expires` date strings containing commas instead of truncating cookie key-value pairs.
- **Storage Calculation Fix**: Resolved storage size double-counting by taking `Math.max()` between legacy `EXTERNAL` and current `EXTERNAL_STORAGE` paths instead of summing them.
- **Native Download Fallback & Type Safety**: Added null-safe guards for media file types (`(type || "")`) and enabled the cross-platform `CapacitorHttp` blob fallback path.
- **Unlimited History Limit Fix**: Resolved an issue where configuring an "Unlimited" history limit still truncated local history records to 100 items.

## Previous Updates (v4.2.3)

- **Android Share Overlay Language & Font Synchronization**: Fixed an issue where the native Share Intent overlay (`ShareActivity`) defaulted to English and default font due to Webview origin isolation (`https://localhost` vs `file:///android_asset/public/share.html`). Added a native `SharedPreferences` bridge (`saveSetting` & `injectConfig`) to seamlessly synchronize all user preferences (`mori_lang`, `mori_font`, `mori_theme`, `mori_prefer_server`, `mori_download_path`, `mori_auto_folder`, `mori_filename`) directly into the Share Overlay.
- **Share Overlay Internationalization (i18n)**: Fully audited and localized all Share Overlay UI elements (panel headers, status spinners, server option pills, download badges, toast notifications, error messages) across **5 supported languages** (English, Indonesian, Japanese, Korean, and Simplified Chinese).
- **Settings Dropdown i18n Fix (Lock Type & Batch Photo Mode)**: Resolved an issue where changing languages and switching back caused the `Lock Type` (`lockTypeText`) and `Batch Photo Mode` (`batchPhotoModeText`) dropdown text displays to remain stuck in the previously selected language. Added missing UI refresh hooks to `updateCustomSelectsUI()`.
- **Default Font Preset & Label Refresh**: Set **Display Bold** (`Outfit`) as Mori's default font preset across app launch, Share Overlay, and native Android `ShareActivity`. Updated the legacy "Default" label in font options to explicitly display its real typeface name (**"Inter"**) across all 5 supported languages.
- **Optimized Defaults (Auto-Subfolders & Haptics)**: Enabled **Subfolder per Platform** (`mori_auto_folder`) by default to automatically organize downloads into platform-specific directories (`TikTok`, `Instagram`, `YouTube`, etc.), and set **Haptic Vibration** (`mori_haptic`) to disabled by default to give users full control.
- **Dependency Security Hardening (`node-tar`)**: Upgraded `tar` dependency to **`v7.5.21`** with explicit `package.json` `overrides` enforcement to fix CVE-2026-59873 (PAX path numeric type confusion, decompression DoS, and file smuggling).
- **YouTube Playlist & Single Link Resolution**: Integrated full support for YouTube playlists (`youtube.com/playlist?list=...` and `music.youtube.com/playlist?list=...`) with clean single-click MP3 track listing and dynamic deferred resolution powered by `ytmp3.gg` and fallback servers.
- **Desktop (Tauri) Download Crash Fix**: Resolved a critical issue on Windows/macOS where URL resolution (e.g., Apple Music, Spotify, Soundloaders) crashed with a `Cannot read properties of undefined` error because it incorrectly attempted to invoke `CapacitorHttp` (which is mobile-only). All URL resolution and download fallbacks now use the centralized cross-platform `scraperFetch` helper.
- **Spotify Short Link (`/s/`) Support**: Added dynamic resolution for Spotify's newer shortened share links (`open.spotify.com/s/...`). Mori now silently fetches the short link to extract the canonical `og:url` (track, playlist, or album) before passing it to backend APIs.
- **Douyin Short Link & First-Attempt Resolution Fix**: Resolved an issue where analyzing Douyin short links (`v.douyin.com`) failed on the initial attempt due to missing `window._ROUTER_DATA` SSR markers. Upgraded scraper with a multi-stage resolution pipeline that extracts item IDs, queries the direct `iesdouyin` API endpoint, parses multiple SSR data markers (`_ROUTER_DATA`, `_SSR_DATA`, `_RENDER_DATA`, `__INIT_PROPS__`), and automatically decodes URI-encoded payloads.

## Supported Platforms

| Platform                                                                               | Features               | Platform                                                                            | Features                 |
| :------------------------------------------------------------------------------------- | :--------------------- | :---------------------------------------------------------------------------------- | :----------------------- |
| <img src="https://cdn.simpleicons.org/tiktok/000000" width="16" /> **TikTok**          | Video (No WM) / Photos | <img src="https://cdn.simpleicons.org/instagram/E4405F" width="16" /> **Instagram** | Reels / Stories / Photos |
| <img src="https://cdn.simpleicons.org/youtube/FF0000" width="16" /> **YouTube**        | Playlist / MP4 / MP3   | <img src="https://cdn.simpleicons.org/x/000000" width="16" /> **Twitter (X)**       | HD Video / GIFs          |
| <img src="https://cdn.simpleicons.org/spotify/1DB954" width="16" /> **Spotify**        | Playlist / Album / MP3 | <img src="https://cdn.simpleicons.org/pinterest/E60023" width="16" /> **Pinterest** | PinDown (Video / Images) |
| <img src="https://cdn.simpleicons.org/applemusic/FA243C" width="16" /> **Apple Music** | Playlist / Album / MP3 | <img src="https://cdn.simpleicons.org/facebook/1877F2" width="16" /> **Facebook**   | Reels / HD Video         |
| <img src="https://cdn.simpleicons.org/xiaohongshu/FF2442" width="16" /> **RedNote**    | Photos / Videos        | <img src="https://cdn.simpleicons.org/threads/000000" width="16" /> **Threads**     | Video / Photos           |
| <img src="https://cdn.simpleicons.org/bilibili/00A1D6" width="16" /> **Bilibili**      | Video / Audio (DASH)   | <img src="https://cdn.simpleicons.org/pixiv/0096FA" width="16" /> **Pixiv**         | Gallery / Ugoira to MP4  |
| <img src="https://cdn.simpleicons.org/tiktok/000000" width="16" /> **Douyin**          | Video (No WM) / Photos | <img src="https://cdn.simpleicons.org/bandcamp/1DA1F2" width="16" /> **Bandcamp**   | Album / MP3 Track        |

## Built With

- **JavaScript (ES6+)**: Core application logic and scraping engine.
- **HTML5 & CSS3**: Custom design system without bloated frameworks.
- **Tauri v2**: Ultra-lightweight desktop engine for macOS & Windows (.dmg, .app, .msi, .exe).
- **CapacitorJS**: Native Android and iOS bridge for filesystem, share sheet, clipboard, and biometrics.
- **pdf-lib**: Client-side PDF generation and bundling.

## Project Structure

```
Mori/
├── android/                    # Capacitor Android native project
│   ├── app/src/main/java/com/mori/downloader/
│   │   ├── MainActivity.java   # Main Capacitor Activity + SharedPreferences native bridge
│   │   └── ShareActivity.java  # Native Share Intent Quick Save overlay activity & MediaStore indexer
│   └── gradle/                 # Gradle wrapper & build config
├── ios/                        # Capacitor iOS Xcode workspace
│   └── App/                    # iOS Xcode project, Info.plist, and Pods
├── src-tauri/                  # Tauri v2 Desktop Rust backend & configuration
│   ├── capabilities/           # Application capabilities & permissions
│   ├── src/                    # Rust native HTTP & file commands (tauri_http_request, tauri_download_file)
│   └── tauri.conf.json         # Desktop configuration & window bounds
├── assets/                     # Screenshots & branding assets
├── public/
│   ├── css/
│   │   └── style.css           # Design system & all component styles
│   ├── js/
│   │   ├── app.js              # Entry point — module wiring & startup init
│   │   ├── components/         # Custom UI components
│   │   │   └── player.js       # Mori media player (video/audio)
│   │   ├── i18n/               # Multi-language translations (EN/ID/JA/KO/ZH)
│   │   │   └── index.js
│   │   ├── modules/            # Core app managers & state
│   │   │   ├── authManager.js  # PIN & biometric lock
│   │   │   ├── batchManager.js # Batch queue, multi-link extraction, playlist skip
│   │   │   ├── core.js         # Shared state, DOM refs, constants
│   │   │   ├── download.js     # Main analyze/download flow
│   │   │   ├── history.js      # History CRUD, auto-clear, thumbnail cleanup
│   │   │   ├── intents.js      # Clipboard paste, share intents, deep links
│   │   │   ├── modals.js       # Confirm & info modal system
│   │   │   ├── settings.js     # Settings UI & localStorage wiring
│   │   │   └── update.js       # Update checker
│   │   ├── scrapers/           # Standalone scraper modules (14 platforms)
│   │   │   ├── applemusic.js
│   │   │   ├── bandcamp.js
│   │   │   ├── bilibili.js
│   │   │   ├── douyin.js
│   │   │   ├── facebook.js
│   │   │   ├── httpHelper.js   # Centralized HTTP client (timeout, headers, UA)
│   │   │   ├── index.js
│   │   │   ├── instagram.js
│   │   │   ├── pinterest.js
│   │   │   ├── pixiv.js
│   │   │   ├── rednote.js
│   │   │   ├── spotify.js
│   │   │   ├── threads.js
│   │   │   ├── tiktok.js
│   │   │   ├── twitter.js
│   │   │   └── youtube.js
│   │   ├── ui/                 # UI rendering & native download layer
│   │   │   ├── nativeDownload.js # Native download flow, resolve URLs, retries
│   │   │   ├── result.js       # Result section, media slider, PDF export
│   │   │   └── resultModal.js  # Detail modal with slides & preview
│   │   ├── share.js            # Share Overlay UI controller & theme/i18n manager
│   │   ├── ui.js               # History rendering + re-exports
│   │   ├── utils/              # Shared helpers
│   │   │   ├── index.js        # Toast, Filesystem, wake lock, stopAllMedia
│   │   │   ├── pdfHelper.js    # PDF bundling via vendor pdf-lib
│   │   │   └── urlUtils.js     # URL extraction & tracker cleanup
│   │   └── vendor/             # Third-party libraries (pdf-lib)
│   │       └── pdf-lib.min.js
│   ├── index.html              # Main single-page application entry point
│   └── share.html              # Standalone Android Quick Save Share Overlay layout
├── capacitor.config.json       # Capacitor configuration
├── package.json                # Dependencies & scripts
├── .gitignore
├── LICENSE
└── README.md
```

## Key Features

- **Multi-Platform Support**: High-quality downloads from TikTok (No Watermark, HD Video, MP3 & Photo Slideshows), Instagram (Reels/Posts/Photos), YouTube (Videos, Shorts, Playlists), Twitter (X), Spotify (Tracks, Albums, Playlists, Short Links), Pinterest, Apple Music, Facebook, **Threads**, **Bandcamp**, **Pixiv** (R-18/R-18G), **Bilibili** (DASH), **Douyin** (No WM), and **RedNote (Xiaohongshu)**.
- **Android Quick Save Share Overlay (`ShareActivity`)**: Share media links directly from any app via Android's native `ACTION_SEND` menu to trigger a translucent bottom-sheet dialog overlay. Features background one-tap media downloading without opening the main app UI, dual-server selection (`mori_prefer_server`), real-time MediaStore Gallery indexing, background history sync, and complete theme, font, and language preference inheritance.
- **Multi-Link Batch Download & Queue**: Paste and process multiple social media links simultaneously with real-time status monitoring (`ANALYZING`, `READY`, `DOWNLOADING`, `SAVED`), one-click `DOWNLOAD ALL`, playlist skipping, and automatic server fallbacks.
- **Batch Photo Mode Options**: Configurable carousel photo handling in Settings: `Download All Photos` (default), `Combine into Single PDF`, or `Download First Photo Only`.
- **Live Media Previews**: View images, play videos, and listen to audio directly within the app before downloading.
- **Standalone PDF Document Export**: Convert image galleries and multi-photo carousel posts from any platform into high-quality PDF files for offline viewing via `pdf-lib`.
- **Private History Manager**: Downloaded files are managed internally with individual history cards, local playback support, and offline badge detection.
- **Auto Clipboard Paste**: Automatically detects and pastes links from clipboard when returning to the app (smartly disabled in Batch mode to preserve drafts).
- **Auto Update Check**: Checks for new versions on startup via GitHub Releases and shows a popup modal when an update is available.
- **Hardened Passcode & Biometric Privacy Lock**: Secure your history and settings with 4-Digit PIN Passcode or native Biometric authentication (Fingerprint, FaceID, TouchID) featuring background re-locking.
- **Multi-Language Support**: Fully localized in 5 languages: English, Indonesian, Japanese, Korean, and Simplified Chinese (`en`, `id`, `ja`, `ko`, `zh`).
- **Typography & Design Personalization**: Built-in curated font presets (**Display Bold**, **Inter**, **Plus Jakarta Sans**, **Classic Serif**, **Modern Mono**) with custom subfolder categorization per platform (`mori_auto_folder`).
- **Intelligent Error Handling**: Real-time feedback for IP blocks, API format changes, or network issues via premium Toast notifications.
- **Premium Minimalist UI**: A distraction-free glassmorphism interface with smooth transitions and dark mode.

## Security & Safety Notice

Mori is **100% open-source, ad-free, and contains zero malware, spyware, or trackers**. All network requests and file downloads run locally on your device without external analytics servers.

> [!TIP]
> **Doubtful or concerned about false-positive security warnings?**  
> Because Mori release binaries (`.apk`, `.dmg`, `.exe`, `.ipa`) are open-source builds compiled without expensive commercial enterprise signing certificates, some OS security software or browsers may display standard false-positive warnings.  
> If you have any doubts, you can upload and scan any release file directly on **[VirusTotal](https://www.virustotal.com/)** before installing!

> [!NOTE]
> **macOS Gatekeeper Warning ("Mori" is damaged and can't be opened):**  
> When downloading the `.dmg` or `.app` via web browsers (Brave, Safari, Chrome), macOS flags unnotarized internet downloads with a quarantine attribute (`com.apple.quarantine`).  
> To open Mori smoothly on macOS:
>
> 1. Run in Terminal: `sudo xattr -cr /Applications/Mori.app`
> 2. Or **Right-Click** (Control + Click) `Mori.app` in Finder → Select **Open** → Click **Open**.

> [!NOTE]
> **Android Play Protect Warning:**  
> When installing the `.apk` manually (sideloading outside Google Play Store), Play Protect may display a prompt. Tap **"More Details"** → **"Install Anyway"**.

## How to Use

1. Copy a link from a supported platform or Share it directly to Mori.
2. Use the **Paste** button or let the auto-detection handle the link.
3. Tap **Analyze** to verify the content.
4. Preview the media (swipe through carousels if available).
5. Choose your format and tap **Download**.
6. Files are saved to your internal history for offline access.

## For Developers

Mori is built using Capacitor and Vanilla JS for high performance.

- **On Android & iOS**: Uses `CapacitorHttp` to bypass CORS and download directly from the device IP. Files are saved to local device storage and accessible via the **Files app** (`On My iPhone/Mori`) on iOS.
- **On Web**: Preview mode only — runs directly in the browser with limited functionality.

### Building the APK

```bash
# 1. Sync Capacitor with Android
npx cap sync android

# 2. Build the debug APK
cd android && ./gradlew assembleDebug

# 3. The APK is output at:
#    android/app/build/outputs/apk/debug/Mori v{VERSION}.apk
```

For a release APK, first generate a signing keystore (one-time):

```bash
keytool -genkey -v -keystore android/app/release.keystore -alias mori \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass android123 -keypass android123 \
  -dname "CN=Mori, OU=Development, O=MoriApp, L=Unknown, ST=Unknown, C=ID"
```

Then add `signingConfigs` block to `android/app/build.gradle`:

```groovy
android {
    signingConfigs {
        release {
            storeFile file('release.keystore')
            storePassword 'android123'
            keyAlias 'mori'
            keyPassword 'android123'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            // ...
        }
    }
}
```

Build the signed release APK:

```bash
cd android && ./gradlew assembleRelease
```

Output at: `android/app/build/outputs/apk/release/Mori v{VERSION}.apk`

### Running & Building for Desktop (macOS & Windows)

Mori uses **Tauri v2** for lightweight, high-performance desktop apps on macOS (.dmg, .app) and Windows (.msi, .exe).

#### Development Mode

```bash
npm run tauri:dev
```

#### Building Release Installers

```bash
npm run tauri:build
```

- **macOS Output**: `src-tauri/target/release/bundle/dmg/Mori_4.2.3_aarch64.dmg` & `Mori.app`
- **Windows Output**: `src-tauri/target/release/bundle/msi/Mori_4.2.3_x64_en-US.msi` & `.exe`

### Running & Building for iOS

#### Running on Simulator or Device

```bash
# 1. Sync web assets & iOS CocoaPods dependencies
npx cap sync ios

# 2. Open the Xcode workspace
npx cap open ios

# 3. Select target (iPhone Simulator or connected iOS device) and press Run (Cmd + R)
```

#### Building Unsigned IPA (For Sideloading/Distribution)

If you do not have an iPhone connected or a paid Apple Developer Account, you can build a generic unsigned `.ipa` for distribution via the command line:

```bash
# 1. Sync assets
npx cap sync ios

# 2. Compile target for generic iOS device without code signing
xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Release -sdk iphoneos -archivePath build/Mori.xcarchive archive CODE_SIGNING_ALLOWED=NO

# 3. Package compiled app bundle into a Payload folder and Zip to IPA
mkdir -p Payload && cp -r build/Mori.xcarchive/Products/Applications/App.app Payload/ && zip -r "Mori v4.2.3.ipa" Payload && rm -rf Payload build
```

This outputs `Mori v4.2.3.ipa` in your project root directory, ready to be sideloaded via AltStore, Sideloadly, Scarlet, or TrollStore.

## iOS Sideloading Guide

Since Mori is client-side only and not distributed on the Apple App Store, iOS users can install `Mori v4.2.3.ipa` using one of the following sideloading methods:

- **AltStore / Sideloadly**: Best for all iOS versions. Requires a PC/Mac for initial installation, and app signatures need to be refreshed every 7 days (free personal Apple ID).
- **TrollStore**: Best for compatible iOS versions. Installs permanently, requires no computer after setup, and does not expire.
- **Scarlet / Esign**: Directly install on-device without a PC using enterprise/public developer certificates.

---

Developed with ❤️ by coflyn.
GitHub: https://github.com/coflyn
Instagram: @\_coflyn

## License

Mori is released under the **MIT License**. Feel free to use, modify, and distribute it.
