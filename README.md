<p align="center">
  <img src="assets/icon.png" width="128" alt="Mori Logo">
</p>

<h1 align="center">Mori</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Version-v4.3.1-brown?style=flat-square" alt="Version">
  <img src="https://img.shields.io/github/downloads/coflyn/Mori/total?style=flat-square&color=blue" alt="Downloads">
  <img src="https://img.shields.io/github/stars/coflyn/Mori?style=flat-square&color=gold" alt="Stars">
  <img src="https://img.shields.io/github/repo-size/coflyn/Mori?style=flat-square&color=purple" alt="Repo Size">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/Platform-Android%20%7C%20iOS%20%7C%20macOS%20%7C%20Windows-3DDC84?style=flat-square&logo=android&logoColor=white" alt="Platform">
</p>

<div align="center">

Mori is a fast and simple downloader for saving videos, photos, and music from 14 popular social media apps. Everything runs directly on your device, with no external servers, tracking, or ads. Your downloads stay private and in your control.

<a href="https://sociabuzz.com/coflyn/tribe" target="_blank">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="60" />
</a>

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

## Features

- **All-in-One Social Downloader**: Easily save high-definition videos (without watermarks), photos, and music from 14 top platforms: TikTok, Instagram, YouTube, Twitter/X, Spotify, Apple Music, Pinterest, Facebook, Threads, Bandcamp, Pixiv, Bilibili, Douyin, and RedNote.
- **Smart Multi-Engine Fallback**: Resilient scraper engine with automatic fallback providers to ensure high download success rates even if a provider is temporarily unavailable.
- **One-Tap Playlist & Album Downloader**: Download entire albums or music playlists from **Spotify**, **Apple Music**, and **YouTube** in one go, no need to download songs one by one.
- **Quick Save via Share Menu (Android)**: Found a video you like? Tap **Share** in any app and select Mori to download it immediately in a sleek popup overlay without leaving your current app.
- **Multi-Link Batch Mode**: Paste several links at once and let Mori analyze and download them all automatically in the background.
- **Interactive Live Backgrounds & Glassmorphism**: Dynamic animated canvas backgrounds (Constellations, Waves, Particles, Fireflies) paired with modern, customizable frosted glassmorphism effects.
- **Built-in Media Player & Preview**: Play videos, stream tracks, and view multi-photo galleries right inside the app, with optional Auto-Play and gesture controls.
- **Instant Photo-to-PDF Export**: Combine multi-photo posts or image galleries into a single, clean PDF file ready for offline reading or sharing.
- **PIN & Biometric Privacy Lock**: Keep your download history private with a secure 4-digit PIN or fingerprint/Face ID biometric lock.
- **Smart History & Folder Manager**: View your saved files anytime with clean folder paths (e.g. `Movies/Mori`, `Music/Mori`, `Pictures/Mori`), quick copy paths, and a long-press gesture to easily delete items.
- **Automatic Clipboard Detection**: Automatically detects copied links when you open the app for instant one-tap downloading.
- **9 Languages with Full RTL Support**: Fully translated into English, Indonesian, Japanese, Korean, Simplified Chinese, Arabic (with full right-to-left layout), Russian, Tagalog, and Hindi.
- **Background & Foreground Downloads**: Downloads continue running seamlessly even if you switch apps or minimize Mori, ensuring your videos and large playlists finish downloading without interruption.
- **Instant Download Cancellation**: Cancel any in-progress download or batch queue with a single tap, instantly stopping network requests and automatically cleaning up partial files.
- **Corrupt File Protection**: Safe downloads using temporary `.tmp` files that only save to your gallery once 100% complete, preventing broken or unplayable files.
- **100% Private & Ad-Free**: No tracking, no data collection, no ads, and no external servers. Everything happens directly on your device.

## Supported Platforms & Scraper Engines

| Platform                                                                               | Supported Domains / Formats                              | Features                     | Scraper Engine / Provider                                                                 |
| :------------------------------------------------------------------------------------- | :------------------------------------------------------- | :--------------------------- | :---------------------------------------------------------------------------------------- |
| <img src="https://cdn.simpleicons.org/instagram/E4405F" width="16" /> **Instagram**    | `instagram.com` (`/p/`, `/reel/`, `/stories/`)           | Reels / Stories / Photos     | **InDown** (`indown.io`) & **SnapSave** (`snapsave.app`)                                  |
| <img src="https://cdn.simpleicons.org/tiktok/000000" width="16" /> **TikTok**          | `tiktok.com`, `vt.tiktok.com`                            | Video (No WM) / Slide Photos | **SSSTik** (`ssstik.io`) & **TikTokIO** (`tiktokio.com`)                                  |
| <img src="https://cdn.simpleicons.org/youtube/FF0000" width="16" /> **YouTube**        | `youtube.com`, `youtu.be`, `music.youtube.com`           | Playlist / Album / MP4 / MP3 | **Ytmp3.gg** (`media.ytmp3.gg`) & **Ytmp3.mobi** (`ytmp3.mobi`)                           |
| <img src="https://cdn.simpleicons.org/x/000000" width="16" /> **Twitter (X)**          | `twitter.com`, `x.com`                                   | HD Video / GIFs              | **TwitterVideoDownloader** (`twittervideodownloader.com`) & **Tweeload** (`tweeload.com`) |
| <img src="https://cdn.simpleicons.org/spotify/1DB954" width="16" /> **Spotify**        | `open.spotify.com` (`track`, `album`, `playlist`, `/s/`) | Playlist / Album / MP3       | **SpotiDown** (`spotidown.app`) & **SoundLoaders** (`soundloaders.app`)                   |
| <img src="https://cdn.simpleicons.org/applemusic/FA243C" width="16" /> **Apple Music** | `music.apple.com`                                        | Album / Playlist / MP3 Track | **AplMate** (`aplmate.com`)                                                               |
| <img src="https://cdn.simpleicons.org/pinterest/E60023" width="16" /> **Pinterest**    | `pinterest.com`, `pin.it`                                | Video / HD Images            | Direct `pinimg.com` Parser & **PinDown** (`pindown.io`)                                   |
| <img src="https://cdn.simpleicons.org/facebook/1877F2" width="16" /> **Facebook**      | `facebook.com`, `fb.watch`                               | Reels / HD Video             | **SnapSave** (`snapsave.app`)                                                             |
| <img src="https://cdn.simpleicons.org/xiaohongshu/FF2442" width="16" /> **RedNote**    | `xiaohongshu.com`, `xhslink.com`, `rednote.com`          | HD Photos / Videos           | Direct `__INITIAL_STATE__` SSR Extractor                                                  |
| <img src="https://cdn.simpleicons.org/threads/000000" width="16" /> **Threads**        | `threads.net`                                            | Video / Photo Carousel       | **Threadster** (`threadster.app`)                                                         |
| <img src="https://cdn.simpleicons.org/bilibili/00A1D6" width="16" /> **Bilibili**      | `bilibili.com`, `b23.tv`, `bili.im`, `bilibili.tv`       | Video / Audio (DASH 1080p)   | Direct Bilibili Web API (`api.bilibili.com`) & Wbi Resolver                               |
| <img src="https://cdn.simpleicons.org/pixiv/0096FA" width="16" /> **Pixiv**            | `pixiv.net` (`artworks`)                                 | Gallery / Ugoira to MP4      | Direct Pixiv AJAX API & Ugoira Zip-to-MP4 Converter                                       |
| <img src="https://cdn.simpleicons.org/tiktok/000000" width="16" /> **Douyin**          | `douyin.com`, `v.douyin.com`                             | Video (No WM) / Photos       | Direct `iesdouyin.com` API & Multi-Marker SSR Resolver                                    |
| <img src="https://cdn.simpleicons.org/bandcamp/1DA1F2" width="16" /> **Bandcamp**      | `*.bandcamp.com`                                         | Track / Album / MP3          | **BandcampDownloader** (`bandcampdownloader.app`)                                         |

## Built With

- **JavaScript (ES6+)**: Core application logic and scraping engine.
- **HTML5 & CSS3**: Custom minimalist design system with dark mode and smooth transitions.
- **Tauri v2 (Rust)**: Ultra-lightweight desktop engine for macOS & Windows (`.dmg`, `.app`, `.msi`, `.exe`).
- **CapacitorJS**: Native Android and iOS bridge for filesystem, share sheet, clipboard, and biometrics.
- **Cheerio & Axios**: Fast DOM HTML parsing and HTTP client request handling.
- **pdf-lib**: Client-side PDF generation and bundling.

## Project Structure

```
Mori/
├── android/                    # Capacitor Android native project
│   ├── app/src/main/java/com/mori/downloader/
│   │   ├── MainActivity.java   # Main Capacitor Activity + native bridge
│   │   └── ShareActivity.java  # Native Quick Save Share overlay & MediaStore indexer
│   └── gradle/                 # Gradle build scripts & configurations
├── ios/                        # Capacitor iOS Xcode workspace
│   └── App/                    # iOS Xcode project, Info.plist, and CocoaPods
├── src-tauri/                  # Tauri v2 Desktop Rust backend (macOS & Windows)
│   ├── capabilities/           # Application permissions & security capabilities
│   ├── src/                    # Rust native HTTP & local filesystem commands
│   └── tauri.conf.json         # Desktop app configuration & window bounds
├── assets/                     # App icons, mockups, & screenshots
├── public/                     # Frontend web assets (Vanilla JS + CSS)
│   ├── css/
│   │   └── style.css           # Modern design system, dynamic themes, & responsive layouts
│   ├── js/
│   │   ├── app.js              # Main application entry point & startup lifecycle
│   │   ├── components/         # Reusable UI components
│   │   │   └── player.js       # In-app media player (video, audio, gestures)
│   │   ├── i18n/               # Multi-language translations (9 languages + RTL support)
│   │   │   └── index.js
│   │   ├── modules/            # Core business logic & application state
│   │   │   ├── authManager.js  # PIN passcode & biometric lock system
│   │   │   ├── batchManager.js # Multi-link batch queue & playlist manager
│   │   │   ├── bgAnimation.js  # Interactive Live Canvas backgrounds (Stars, Waves, etc.)
│   │   │   ├── core.js         # Shared global state, DOM references, constants
│   │   │   ├── download.js     # Analysis pipeline & download controllers
│   │   │   ├── history.js      # Download history manager, local storage, & cleanup
│   │   │   ├── intents.js      # Auto-clipboard detection & deep link receiver
│   │   │   ├── modals.js       # Confirmation dialogs & information modals
│   │   │   ├── settings.js     # User preferences & theme customization
│   │   │   └── update.js       # Automatic GitHub release update checker
│   │   ├── scrapers/           # Modular scraper engines for 14 platforms
│   │   │   ├── applemusic.js
│   │   │   ├── bandcamp.js
│   │   │   ├── bilibili.js
│   │   │   ├── douyin.js
│   │   │   ├── facebook.js
│   │   │   ├── httpHelper.js   # Unified HTTP engine with retry, timeout & UA rotation
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
│   │   ├── ui/                 # UI rendering & presentation layer
│   │   │   ├── nativeDownload.js # Download progress tracking & file system writer
│   │   │   ├── result.js       # Analysis results view, media slider, & PDF creator
│   │   │   └── resultModal.js  # Detailed preview modal & folder path navigator
│   │   ├── share.js            # Android Quick Save Share Overlay controller
│   │   ├── ui.js               # History rendering & gesture handlers (long-press delete)
│   │   ├── utils/              # Helper utilities
│   │   │   ├── index.js        # Haptics, toasts, wake lock, filesystem helpers
│   │   │   ├── pdfHelper.js    # PDF generation & image bundling via pdf-lib
│   │   │   └── urlUtils.js     # URL sanitization & tracking parameter remover
│   │   └── vendor/             # Bundled third-party libraries (pdf-lib)
│   │       └── pdf-lib.min.js
│   ├── index.html              # Main single-page application markup
│   └── share.html              # Standalone Android Quick Save Share Overlay markup
├── capacitor.config.json       # Capacitor cross-platform configuration
├── package.json                # Project dependencies & build scripts
├── .gitignore
├── LICENSE
└── README.md
```

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

Mori is built using Tauri, Capacitor, and Vanilla JS for high performance.

- **On macOS & Windows (Desktop)**: Powered by **Tauri v2** with a native Rust HTTP engine (`tauri_http_request`) to bypass CORS and save downloads directly to your system's `Downloads/Mori` folder.
- **On Android & iOS**: Uses `CapacitorHttp` to bypass CORS and download directly from the device IP. Files are saved to local device storage and accessible via the **Files app** (`On My iPhone/Mori`) on iOS.
- **On Web**: Preview mode only — runs directly in the browser with limited functionality.

### Building for Android

> [!TIP]
> **Pre-built APKs**: You can download pre-compiled `.apk` binaries directly from **[GitHub Releases](https://github.com/coflyn/Mori/releases)** or from the Actions tab!

#### Single-Command Quick Build

```bash
# Build Debug APK
npm run build:android

# Build Signed Release APK
npm run build:android:release
```

#### Manual Steps

```bash
# 1. Sync Capacitor with Android
npx cap sync android

# 2. Build the release APK
cd android && ./gradlew assembleRelease

# 3. Output located at:
#    android/app/build/outputs/apk/release/Mori v{VERSION}.apk
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

- **macOS Release Asset**: `Mori-v4.3.1-macOS-arm64.dmg` & `Mori-v4.3.1-macOS-arm64.app.tar.gz`
- **Windows Release Asset**: `Mori-v4.3.1-Windows-x64-Setup.exe` & `Mori-v4.3.1-Windows-x64.msi`

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

If you do not have an iPhone connected or a paid Apple Developer Account, you can build a generic unsigned `.ipa` for distribution via single-command or step-by-step CLI:

##### Single-Command Build

```bash
npm run build:ios:ipa
```

##### Manual Steps

```bash
# 1. Sync assets
npx cap sync ios

# 2. Compile target for generic iOS device without code signing
xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Release -sdk iphoneos -archivePath build/Mori.xcarchive archive CODE_SIGNING_ALLOWED=NO

# 3. Package compiled app bundle into a Payload folder and Zip to IPA
mkdir -p Payload && cp -r build/Mori.xcarchive/Products/Applications/App.app Payload/ && zip -r "Mori v4.3.1.ipa" Payload && rm -rf Payload build
```

This outputs `Mori v4.3.1.ipa` in your project root directory, ready to be sideloaded via AltStore, Sideloadly, Scarlet, or TrollStore.

## iOS Sideloading Guide

Since Mori is client-side only and not distributed on the Apple App Store, iOS users can install `Mori v4.3.1.ipa` using one of the following sideloading methods:

- **AltStore / Sideloadly**: Best for all iOS versions. Requires a PC/Mac for initial installation, and app signatures need to be refreshed every 7 days (free personal Apple ID).
- **TrollStore**: Best for compatible iOS versions. Installs permanently, requires no computer after setup, and does not expire.
- **Scarlet / Esign**: Directly install on-device without a PC using enterprise/public developer certificates.

---

Developed with ❤️ by coflyn.
GitHub: https://github.com/coflyn
Instagram: @\_coflyn

## License

Mori is released under the **MIT License**. Feel free to use, modify, and distribute it.
