<p align="center">
  <img src="assets/icon.png" width="128" alt="Mori Logo">
</p>

<h1 align="center">Mori</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Version-v4.2.2-brown?style=flat-square" alt="Version">
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

## What's New in (v4.2.2)

- **History Item Deletion Fix**: Resolved an issue where deleting an item from the download history inadvertently deleted the original media file from physical device storage. History deletion now strictly clears the app history record while leaving saved files in storage completely untouched.
- **Batch Mode Playlist & Album Skipping**: Configured Batch Mode to automatically detect and skip full playlist and album URLs (Spotify, Apple Music, YouTube playlists). Skipped items display a distinct `SKIPPED (PLAYLIST)` badge in the batch queue modal.
- **Batch History Isolation & URL Match Fix**: Resolved an issue where downloading multiple links in Batch Mode (such as multiple TikTok, IG, or Twitter posts) caused saved files to mistakenly merge into a single history card. Removed inaccurate index fallback logic in `mori_file_saved` listener and added `sourceUrl` tracking to guarantee that each downloaded media file is mapped and isolated strictly to its own separate history item.
- **Spotify & Apple Music Playlist / Album Support**: Full support for parsing and downloading entire playlists and albums from Spotify (via SpotiDown & SoundLoaders) and Apple Music (via Aplmate).
- **UI Simplification & Quote/Tagline Removal**: Streamlining the application interface by removing the header description ("Minimalist Media Downloader"), Home greeting/stats ("Ready to save?" / history item counter), and footer quote tagline ("Simplicity is the ultimate sophistication"), as well as removing their redundant toggles (_Header Quote_, _Home Greeting_, _Footer Tagline_) from Settings Appearance for an ultra-clean design.
- **Auto-Download Feature Fix**: Resolved an issue where the Auto-Download setting never triggered because the click automation searched for a legacy button class (`.btn-download`) instead of the actual rendered class (`.dl-item`). Auto-Download now correctly fires the first download button after analysis.
- **History Limit Setting Fix**: The history list is now properly capped according to the user-configured `History Limit` setting instead of being hard-locked to 100 items regardless of user preference.
- **History Item Deletion Fix (Match-By-Index)**: Deleting a history item now uses its array index rather than brittle URL string matching, so items with redirects or changed URLs (TikTok/IG short links) can be reliably removed. Physical thumbnail files in the cache are also cleaned up on deletion.
- **Security Fix — History XSS**: Scraped titles and URLs rendered into the history list are now HTML-escaped, preventing malicious content in scraped page titles from injecting scripts into the app.
- **Batch Mode YouTube Playlist Detection Fix**: Videos shared with a playlist context (`youtube.com/watch?v=xxx&list=yyy`) are no longer skipped in Batch Mode — only pure playlist URLs (`/playlist?list=`) are skipped, so individual videos inside playlists download normally.
- **Auto-Clear History Thumbnail Cleanup**: Auto-cleanup of old history entries now also deletes orphaned local thumbnail files (`thumb_*.jpg`) from the device cache, preventing storage bloat over time.
- **Track Number Padding Fix (Spotify)**: Playlists and albums with 100+ tracks now generate correctly sorted file prefixes (`001.`, `002.`, ...) instead of breaking sort order with `100.` before `09.`.
- **Filename Sanitizer Improvement**: Parentheses are no longer stripped from filenames — tracks like `Blinding Lights (feat. The Weeknd)` keep their original formatting.
- **Modal Dismissal Stale-Handler Fix**: The confirm overlay's outside-dismiss handler is now cleared on every `hideConfirm()`, eliminating stale closures and potential memory leaks when switching servers repeatedly.
- **Download Timeout on Blob Fallback**: The HTTP blob fallback path now respects the configurable timeout limit instead of hanging indefinitely on unresponsive servers.
- **i18n — Confirmation Messages Localized**: "Clear All" and "Delete Item" confirmation dialogs now use localized strings (English / Indonesian / Japanese) instead of hardcoded English.
- **Auto Analyze on Auto Paste Fix**: Resolved an issue where silent automatic pasting on app launch or resume did not trigger automatic link analysis even when `Auto Analyze` was enabled. Auto Analyze now seamlessly triggers immediate link analysis upon auto-pasting link from clipboard.
- **Desktop (Tauri) HTTP Timeout Fix**: The Rust-native HTTP commands (`tauri_http_request`, `tauri_download_file`, `tauri_fetch_bytes`) previously had no timeout — a stalled scraper request could hang the app indefinitely on macOS/Windows. Requests now timeout at 30s (scraper calls), 120s (file downloads), and 60s (thumbnail fetches), preventing frozen downloads.
- **Security Fix — Result Download Button XSS**: Download quality labels and track titles scraped from third-party servers are now HTML-escaped before rendering into the result list, closing a script-injection vector on both desktop and mobile.

## Previous Updates (v4.2.1)

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

## Supported Platforms

| Platform                                                                                                                                                              | Features               | Platform                                                                            | Features                 |
| :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------- | :---------------------------------------------------------------------------------- | :----------------------- |
| <img src="https://cdn.simpleicons.org/tiktok/000000" width="16" /> **TikTok**                                                                                         | Video (No WM) / Photos | <img src="https://cdn.simpleicons.org/instagram/E4405F" width="16" /> **Instagram** | Reels / Stories / Photos |
| <img src="https://cdn.simpleicons.org/youtube/FF0000" width="16" /> **YouTube**                                                                                       | MP4 Video / MP3 Audio  | <img src="https://cdn.simpleicons.org/x/000000" width="16" /> **Twitter (X)**       | HD Video / GIFs          |
| <img src="https://cdn.simpleicons.org/spotify/1DB954" width="16" /> **Spotify**                                                                                       | Playlist / Album / MP3 | <img src="https://cdn.simpleicons.org/pinterest/E60023" width="16" /> **Pinterest** | PinDown (Video / Images) |
| <img src="https://cdn.simpleicons.org/applemusic/FA243C" width="16" /> **Apple Music**                                                                                | Playlist / Album / MP3 | <img src="https://cdn.simpleicons.org/facebook/1877F2" width="16" /> **Facebook**   | Reels / HD Video         |
| <img src="https://cdn.simpleicons.org/xiaohongshu/FF2442" width="16" /> **RedNote**                                                                                   | Photos / Videos        | <img src="https://cdn.simpleicons.org/threads/000000" width="16" /> **Threads**     | Video / Photos           |
| <img src="https://cdn.simpleicons.org/bilibili/00A1D6" width="16" /> **Bilibili**                                                                                     | Video / Audio (DASH)   | <img src="https://cdn.simpleicons.org/pixiv/0096FA" width="16" /> **Pixiv**         | Gallery / Ugoira to MP4  |
| <img src="https://cdn.simpleicons.org/tiktok/000000" width="16" /> **Douyin** | Video (No WM) / Photos | <img src="https://cdn.simpleicons.org/bandcamp/1DA1F2" width="16" /> **Bandcamp**   | Album / MP3 Track        |

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
│   │   ├── app.js              # Entry point — module wiring & startup init
│   │   ├── components/         # Custom UI components
│   │   │   └── player.js       # Mori media player (video/audio)
│   │   ├── i18n/               # Multi-language translations (EN/ID/JA)
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
│   │   ├── ui.js               # History rendering + re-exports
│   │   ├── utils/              # Shared helpers
│   │   │   ├── index.js        # Toast, Filesystem, wake lock, stopAllMedia
│   │   │   ├── pdfHelper.js    # PDF bundling via vendor pdf-lib
│   │   │   └── urlUtils.js     # URL extraction & tracker cleanup
│   │   └── vendor/             # Third-party libraries (pdf-lib)
│   │       └── pdf-lib.min.js
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

- **macOS Output**: `src-tauri/target/release/bundle/dmg/Mori_4.2.2_aarch64.dmg` & `Mori.app`
- **Windows Output**: `src-tauri/target/release/bundle/msi/Mori_4.2.2_x64_en-US.msi` & `.exe`

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
mkdir -p Payload && cp -r build/Mori.xcarchive/Products/Applications/App.app Payload/ && zip -r "Mori v4.2.2.ipa" Payload && rm -rf Payload build
```

This outputs `Mori v4.2.2.ipa` in your project root directory, ready to be sideloaded via AltStore, Sideloadly, Scarlet, or TrollStore.

## iOS Sideloading Guide

Since Mori is client-side only and not distributed on the Apple App Store, iOS users can install `Mori v4.2.2.ipa` using one of the following sideloading methods:

- **AltStore / Sideloadly**: Best for all iOS versions. Requires a PC/Mac for initial installation, and app signatures need to be refreshed every 7 days (free personal Apple ID).
- **TrollStore**: Best for compatible iOS versions. Installs permanently, requires no computer after setup, and does not expire.
- **Scarlet / Esign**: Directly install on-device without a PC using enterprise/public developer certificates.

---

Developed with ❤️ by coflyn.
GitHub: https://github.com/coflyn
Instagram: @\_coflyn

## License

Mori is released under the **MIT License**. Feel free to use, modify, and distribute it.
