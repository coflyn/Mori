<p align="center">
  <img src="assets/icon.png" width="128" alt="Mori Logo">
</p>

<h1 align="center">Mori</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Version-v4.2.1-brown?style=flat-square" alt="Version">
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

## What's New in v4.2.1

- **Multi-Link Batch Download Mode**: Added a dedicated Batch Mode toggle button and multi-line text area allowing users to paste and analyze multiple social media links (TikTok, IG, YouTube, Twitter, Spotify, RedNote, etc.) simultaneously. Includes a real-time Batch Queue Modal displaying live item status (`ANALYZING`, `READY`, `DOWNLOADING`, `SAVED`) and a one-click `DOWNLOAD ALL` button. Bypasses interactive server selection popups by utilizing preferred server settings and silent retry fallbacks.
- **Batch Photo Mode Setting**: Added a new `Batch Photo Mode` dropdown in Settings (_Network & Performance_) with 3 customizable options for multi-photo / carousel posts (TikTok Photo Mode, Instagram carousels, RedNote albums):
  1. `Download All Photos` (Default): Automatically saves every individual slide photo in a carousel post.
  2. `Combine into Single PDF`: Merges all slide photos of a carousel into a single multi-page PDF document using `pdf-lib`.
  3. `Download First Photo Only`: Downloads only the 1st cover photo of the carousel post.
- **Smart Media Type Differentiation**: Batch mode intelligently distinguishes single video posts (such as TikTok videos with SD, HD, and MP3 quality mirrors) from genuine photo slideshow carousels, ensuring video posts download only 1 primary video file while carousel posts apply the user's selected Batch Photo Mode.
- **100% 14-Platform Subfolder Coverage**: Enhanced per-platform auto-categorization (`mori_auto_folder`) to cover all 14 supported social media platforms and short link domains (TikTok/Douyin, Instagram, YouTube, Twitter/X, Facebook, Pinterest, Spotify, Apple Music, Threads, RedNote, Bilibili, Pixiv, and Bandcamp), ensuring downloaded files are routed into dedicated platform folders (`/TikTok`, `/AppleMusic`, `/Threads`, `/Bandcamp`, etc.).
- **4-Digit PIN Passcode Lock System**: Added `PIN Code` as a brand new Lock Type option alongside Biometric. Includes a sleek, custom-built 4-dot monochrome keypad modal for passcode entry, creation, and confirmation. Works cross-platform on Desktop (macOS & Windows) as well as Android and iOS devices. Automatically adapts to Desktop by displaying `None` and `PIN Code` while hiding native mobile biometric options.
- **Audio Background Playback Fix**: Resolved an issue where audio previews (MP3/Spotify/Apple Music) continued playing in the background after closing modal details or preview cards. Implemented centralized `stopAllMedia()` helper to pause and reset both `<audio>` and `<video>` elements, revoke Object URLs, and trigger container cleanup hooks upon closing modals (`hideModal`), closing result cards (`closeResult`), or switching navigation tabs (`switchPage`).
- **Pinterest PinDirect Removal**: Completely removed PinDirect server option and server selection popup for Pinterest, streamlining execution to use PinDown directly with automatic direct page fallback.
- **RedNote / Xiaohongshu Scraper Fix**: Replaced third-party API with direct HTML state extraction (`window.__INITIAL_STATE__`), resolving `V2OB HAS BEEN UPDATED` errors on `/red_video/` and `/explore/` links, and added native domain support for `rednote.com`.
- **Bilibili.tv Scraper Fix**: Resolved `Unsupported service providers` error on anime/play URLs (such as `/play/2342192`) by fixing `episode_id` property resolution and enabling direct `season_id` fallback in Bilibili OGV v2 API calls.
- **YouTube Scraper (YTMP3.gg) Fix**: Converted conversion API requests from parallel bursts to sequential calls with delay guards to prevent `Server.Concurrency limit exceeded` error, and configured automatic fallback to YTMP3.mobi engine if needed.
- **Twitter/X Scraper (TVD) Resolution Label Fix**: Enhanced resolution label parser (`formatResolutionLabel`) to filter out "Get Premium" upsell text and dynamically extract resolution dimensions (`720x1280`, `1080x1920`, etc.) directly from Twitter CDN media URLs.
- **Instagram Scraper Server 1 & Server 2 Fixes**: Resolved JSON parse errors (`Unexpected token '<'`) on Server 2 (DownReels) by adding HTML error response guards, and fixed redirect loops on Server 1 (InDown) by adding missing POST form payload parameters.
- **Instagram Direct Embed Fallback Engine**: Integrated direct Instagram embed parsing (`/p/{shortcode}/embed/captioned/`) with Mobile Safari User-Agent (`SAFARI_MOBILE_UA`) as an automatic fallback for both servers, extracting original-resolution Reels, single photos, videos, and multi-slide carousels seamlessly.
- **Complete Removal of Data Export/Import & Scheduled Auto-Backup**: Completely removed legacy data export (`exportMoriData`), data import (`importMoriData`), and scheduled auto-backup (`autoBackupDataCheck`) from the settings UI and codebase to keep app storage logic lightweight, fast, and zero-overhead.
- **Full Network Settings Integration**: Fully wired up Anti-403 Header Guard (`mori_header_spoofing`), Cellular Data Warning Guard (`mori_cellular_warning`), Bypass SSL Errors (`mori_bypass_ssl`), and Force IPv4 Mode (`mori_force_ipv4`) into `scraperFetch()` and download lifecycle.
- **Cellular Data Warning Modal Guard**: Integrated an interactive confirmation prompt when attempting media downloads over cellular data connection (2G/3G/4G/5G).
- **Anti-403 Browser Header Injection**: Automatic spoofing of browser headers (`Referer`, `Accept`, `Accept-Language`, `Sec-Fetch-Dest`, `Sec-Fetch-Mode`) to bypass 403 Forbidden blocks across social media scrapers.
- **Settings Layout Refinement**: Repositioned **Check Server Latency** directly below **Timeout Limit** in _Network & Performance_, and removed redundant Export & Import Data actions.
- **Streamlined Settings UI**: Removed unused/redundant Scraper Engine & Status subpage to keep Mori's Settings menu clean, fast, and minimalist.
- **App Version Bump**: Bumped version to `v4.2.1` across all platform manifests (`package.json`, `tauri.conf.json`, `build.gradle`, `project.pbxproj`, and app UI).

## Previous Updates v4.2.0

- **macOS & Windows Desktop Support (Tauri v2)**: Added native desktop application support for macOS (`.dmg`, `.app`) and Windows (`.exe`, `.msi`) powered by Tauri v2.
- **Native CORS-Free Desktop HTTP Engine**: Integrated native Rust HTTP client (`tauri_http_request` & `tauri_fetch_bytes` via `reqwest`) to handle cross-origin network requests and binary file streaming on Desktop, eliminating WebKit CORS blocks and header restriction errors (`Load failed`).
- **Native Desktop File Saving**: Implemented direct Rust disk writers (`tauri_download_file` & `tauri_save_bytes_file`), automatically saving downloaded media files and exported PDF galleries directly to the user's native Downloads folder (`~/Downloads/Mori/` on macOS, `C:\Users\<Username>\Downloads\Mori\` on Windows).
- **Desktop Native Browser Launcher & Auto-Update Engine**: Integrated native Rust URL process launcher (`tauri_open_url`) and semantic version comparison (`isNewerVersion`), ensuring "UPDATE" and "Report Bug" links launch directly in the user's default desktop browser (Safari/Chrome/Arc) without WKWebView pop-up blocks. Fixed `autoCheckUpdate()` and `checkUpdate()` on macOS Desktop by parsing Rust HTTP response objects (`res.data`).
- **Pixiv Ugoira Live MP4 Video Preview**: Fixed Pixiv Ugoira (animated illustration) preview playback on macOS/Windows Desktop. Integrated native Rust CORS-bypass streaming (`tauri_fetch_bytes`) with custom `Referer: https://www.pixiv.net/` headers to fetch and loop MP4 video animations smoothly inside the preview modal.
- **Cross-Platform PDF Gallery Exporter**: Resolved `undefined is not an object (evaluating 'CapacitorHttp.get')` and `CHROME_UA` reference errors during PDF generation on Desktop. Implemented cross-platform fetch fallbacks and native Rust file saving into the Mori folder on macOS and Windows.
- **Desktop Local Media & Audio Preview Player**: Integrated Rust binary file byte reader (`tauri_read_file_bytes`) with dynamic Blob URL stream generation (`blob:http://...`) and platform-aware path resolution in `ui.js` & `player.js`, eliminating macOS WebKit local file restrictions, Android legacy path overrides (`/storage/emulated/0/`), and HTML5 player `▶ Error` states for smooth video and MP3 audio playback in History.
- **Pinterest Dual-Server & PinDirect**: Pinterest now has two selectable servers — **Server 1 (PinDown)** for scraper-based downloads and **Server 2 (PinDirect)** for direct extraction from Pinterest HTML. Users can choose via the server selection dialog.
- **PinDown Image Classification Fix**: Fixed a bug where the PinDown scraper incorrectly classified image downloads as `VIDEO` type. Now only URLs ending with `.mp4` are marked as video, so image pins properly download as images.
- **Pinterest Multi-Image Support**: PinDirect mode extracts all available original-resolution images from a pin page, including gallery pins with multiple photos.
- **Spotify SoundLoaders Server Replacement**: Replaced the non-functional SpotMate server with **SoundLoaders** as Spotify Server 2. SoundLoaders integrates Turnstile challenge bypass via `/api/userverify` for reliable track downloads.
- **Android Storage Permission & `EACCES` Fix**: Resolved `Permission denied (EACCES)` errors on Android 13+ and restricted devices. Removed hard permission check aborts for deprecated `WRITE_EXTERNAL_STORAGE` and implemented an automatic multi-directory fallback chain (`EXTERNAL_STORAGE` → `DOCUMENTS` → `EXTERNAL`), ensuring downloads succeed seamlessly across all Android versions (Android 10-15).
- **Explicit Web Scraper Names in Server Selection Pop-ups**: Standardized the server selection modal text across all multi-server platforms (TikTok, Instagram, YouTube, Twitter, Spotify, Pinterest) to explicitly label each server with its official web scraper provider name (e.g. TikTokIO / SnapTik, InDown / DownReels, YTMP3.gg / YTMP3.mobi, TweeLoad / TVD, SpotiDown / SoundLoaders, PinDown / PinDirect).
- **Clean Filename Template Options & Default Setting**: Removed the redundant "Default" option and set **Title Only** (`title`) as the default filename template. Fixed a bug where filename options forcibly appended a 13-digit timestamp to downloaded files. "Title Only" now produces clean output (`Title.mp3`), while duplicate file collisions on disk automatically use clean incremental counters (`Title_1.mp3`, `Title_2.mp3`) across both Mobile and Desktop.
- **Desktop Biometric & Haptics Guard**: Implemented platform-aware guards for Privacy Lock and Haptics (`window.Capacitor?.isNativePlatform()`). Mobile biometric authentication (`@capgo/capacitor-native-biometric`) is preserved for Android and iOS, while Desktop platforms (macOS/Windows) automatically bypass mobile biometric checks and hide mobile lock and haptic settings to prevent navigation freezes or unhandled plugin exceptions.
- **Color Accent Setting Removed**: Removed the Color Accent dropdown setting from the UI to enforce Mori's minimal black-and-white design system.
- **SpotMate Removed**: The SpotMate scraper has been fully removed from the codebase.

## Supported Platforms

| Platform                                                                                                                                                              | Features               | Platform                                                                            | Features                 |
| :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------- | :---------------------------------------------------------------------------------- | :----------------------- |
| <img src="https://cdn.simpleicons.org/tiktok/000000" width="16" /> **TikTok**                                                                                         | Video (No WM) / Photos | <img src="https://cdn.simpleicons.org/instagram/E4405F" width="16" /> **Instagram** | Reels / Stories / Photos |
| <img src="https://cdn.simpleicons.org/youtube/FF0000" width="16" /> **YouTube**                                                                                       | MP4 Video / MP3 Audio  | <img src="https://cdn.simpleicons.org/x/000000" width="16" /> **Twitter (X)**       | HD Video / GIFs          |
| <img src="https://cdn.simpleicons.org/spotify/1DB954" width="16" /> **Spotify**                                                                                       | MP3 Audio              | <img src="https://cdn.simpleicons.org/pinterest/E60023" width="16" /> **Pinterest** | PinDown (Video / Images) |
| <img src="https://cdn.simpleicons.org/applemusic/FA243C" width="16" /> **Apple Music**                                                                                | MP3 Audio              | <img src="https://cdn.simpleicons.org/facebook/1877F2" width="16" /> **Facebook**   | Reels / HD Video         |
| <img src="https://cdn.simpleicons.org/xiaohongshu/FF2442" width="16" /> **RedNote**                                                                                   | Photos / Videos        | <img src="https://cdn.simpleicons.org/threads/000000" width="16" /> **Threads**     | Video / Photos           |
| <img src="https://cdn.simpleicons.org/bilibili/00A1D6" width="16" /> **Bilibili**                                                                                     | Video / Audio (DASH)   | <img src="https://cdn.simpleicons.org/pixiv/0096FA" width="16" /> **Pixiv**         | Gallery / Ugoira to MP4  |
| <img src="https://cdn.simpleicons.org/douyin/000000" width="16" style="display:none;" /><img src="https://cdn.simpleicons.org/tiktok/000000" width="16" /> **Douyin** | Video (No WM) / Photos | <img src="https://cdn.simpleicons.org/bandcamp/1DA1F2" width="16" /> **Bandcamp**   | Album / MP3 Track        |

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
│   ├── app/src/main/           # Android manifest, resources, assets
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
│   │   ├── components/         # Custom UI components (MoriPlayer)
│   │   │   └── player.js
│   │   ├── i18n/               # Multi-language translations (EN/ID/JA)
│   │   │   └── index.js
│   │   ├── modules/            # App managers (auth, history, settings, batch)
│   │   │   ├── authManager.js
│   │   │   ├── batchManager.js # Batch queue, multi-link extraction, auto-retry
│   │   │   ├── downloadManager.js
│   │   │   ├── historyManager.js
│   │   │   └── settingsManager.js
│   │   ├── scrapers/           # Standalone scraper modules (14 platforms)
│   │   │   ├── applemusic.js
│   │   │   ├── bandcamp.js
│   │   │   ├── bilibili.js
│   │   │   ├── douyin.js
│   │   │   ├── facebook.js
│   │   │   ├── httpHelper.js
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
│   │   ├── utils/              # Helpers, URL sanitization, PDF compilation
│   │   │   ├── index.js
│   │   │   ├── pdfHelper.js    # PDF bundling via vendor pdf-lib
│   │   │   ├── scraperHealth.js
│   │   │   └── urlUtils.js
│   │   ├── vendor/             # Third-party libraries (pdf-lib)
│   │   │   └── pdf-lib.min.js
│   │   ├── script.js           # Core application init & lifecycle
│   │   └── ui.js               # Media slider, results UI, and rendering logic
│   └── index.html              # Single-page application entry point
├── capacitor.config.json       # Capacitor configuration
├── package.json                # Dependencies & scripts
├── .gitignore
├── LICENSE
└── README.md
```

## Key Features

- **Multi-Platform Support**: High-quality downloads from TikTok (No Watermark, HD Video, MP3 & Photo Slideshows), Instagram (Reels/Posts/Photos), YouTube, Twitter (X), Spotify, Pinterest, Apple Music, Facebook, **Threads**, **Bandcamp**, **Pixiv** (R-18/R-18G), **Bilibili** (DASH), **Douyin** (No WM), and **RedNote (Xiaohongshu)**.
- **Multi-Link Batch Download & Queue**: Paste and process multiple social media links simultaneously with real-time status monitoring (`ANALYZING`, `READY`, `DOWNLOADING`, `SAVED`), one-click `DOWNLOAD ALL`, and automatic server fallbacks.
- **Batch Photo Mode Options**: Configurable carousel photo handling in Settings: `Download All Photos` (default), `Combine into Single PDF`, or `Download First Photo Only`.
- **Live Media Previews**: View images, play videos, and listen to audio directly within the app before downloading.
- **Standalone PDF Document Export**: Convert image galleries and multi-photo carousel posts from any platform into high-quality PDF files for offline viewing via `pdf-lib`.
- **Private History Manager**: Downloaded files are managed internally with individual history cards, local playback support, and offline badge detection.
- **Share Intent Integration**: Send links directly to Mori from other apps via the system Share menu.
- **Auto Clipboard Paste**: Automatically detects and pastes links from clipboard when returning to the app (smartly disabled in Batch mode to preserve drafts).
- **Auto Update Check**: Checks for new versions on startup via GitHub Releases and shows a popup modal when an update is available.
- **Hardened Passcode & Biometric Privacy Lock**: Secure your history and settings with 4-Digit PIN Passcode or native Biometric authentication (Fingerprint, FaceID, TouchID) featuring background re-locking.
- **Multi-Language Support**: Fully localized in English, Indonesian, and Japanese (`en`, `id`, `ja`).
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

- **macOS Output**: `src-tauri/target/release/bundle/dmg/Mori_4.2.0_aarch64.dmg` & `Mori.app`
- **Windows Output**: `src-tauri/target/release/bundle/msi/Mori_4.2.0_x64_en-US.msi` & `.exe`

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
mkdir -p Payload && cp -r build/Mori.xcarchive/Products/Applications/App.app Payload/ && zip -r "Mori v4.2.0.ipa" Payload && rm -rf Payload build
```

This outputs `Mori v4.2.0.ipa` in your project root directory, ready to be sideloaded via AltStore, Sideloadly, Scarlet, or TrollStore.

## iOS Sideloading Guide

Since Mori is client-side only and not distributed on the Apple App Store, iOS users can install `Mori v4.2.0.ipa` using one of the following sideloading methods:

- **AltStore / Sideloadly**: Best for all iOS versions. Requires a PC/Mac for initial installation, and app signatures need to be refreshed every 7 days (free personal Apple ID).
- **TrollStore**: Best for compatible iOS versions. Installs permanently, requires no computer after setup, and does not expire.
- **Scarlet / Esign**: Directly install on-device without a PC using enterprise/public developer certificates.

---

Developed with ❤️ by coflyn.
GitHub: https://github.com/coflyn
Instagram: @\_coflyn

## License

Mori is released under the **MIT License**. Feel free to use, modify, and distribute it.
