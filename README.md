<p align="center">
  <img src="assets/icon.png" width="128" alt="Mori Logo">
</p>

<h1 align="center">Mori</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Version-v4.2.4-brown?style=flat-square" alt="Version">
  <img src="https://img.shields.io/github/downloads/coflyn/Mori/total?style=flat-square&color=blue" alt="Downloads">
  <img src="https://img.shields.io/github/stars/coflyn/Mori?style=flat-square&color=gold" alt="Stars">
  <img src="https://img.shields.io/github/repo-size/coflyn/Mori?style=flat-square&color=purple" alt="Repo Size">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/Platform-Android%20%7C%20iOS%20%7C%20macOS%20%7C%20Windows-3DDC84?style=flat-square&logo=android&logoColor=white" alt="Platform">
</p>

<div align="center">

Mori is a fast and simple downloader for saving videos, photos, and music from 14 popular social media apps. Everything runs directly on your device, with no external servers, tracking, or ads. Your downloads stay private and in your control.

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

## Supported Platforms & Scraper Engines

| Platform                                                                               | Supported Domains / Formats                              | Features                     | Scraper Engine / Provider                                                                 |
| :------------------------------------------------------------------------------------- | :------------------------------------------------------- | :--------------------------- | :---------------------------------------------------------------------------------------- |
| <img src="https://cdn.simpleicons.org/instagram/E4405F" width="16" /> **Instagram**    | `instagram.com` (`/p/`, `/reel/`, `/stories/`)           | Reels / Stories / Photos     | **InDown** (`indown.io`) & **SnapSave** (`snapsave.app`)                                  |
| <img src="https://cdn.simpleicons.org/tiktok/000000" width="16" /> **TikTok**          | `tiktok.com`, `vt.tiktok.com`                            | Video (No WM) / Slide Photos | **SSSTik** (`ssstik.io`) & **TikTokIO** (`tiktokio.com`)                                  |
| <img src="https://cdn.simpleicons.org/youtube/FF0000" width="16" /> **YouTube**        | `youtube.com`, `youtu.be`, `music.youtube.com`           | Playlist / Album / MP4 / MP3 | **Ytmp3.gg** (`media.ytmp3.gg`) & **Ytmp3.mobi** (`ytmp3.mobi`)                           |
| <img src="https://cdn.simpleicons.org/x/000000" width="16" /> **Twitter (X)**          | `twitter.com`, `x.com`, `vxtwitter.com`, `fixupx.com`    | HD Video / GIFs              | **TwitterVideoDownloader** (`twittervideodownloader.com`) & **Tweeload** (`tweeload.com`) |
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

- **Multi-Platform Support**: High-quality downloads from TikTok (No Watermark, HD Video, MP3 & Photo Slideshows), Instagram (InDown & SnapSave dual engines for Reels/Posts/Stories/Photos), YouTube (Videos, Shorts, Playlists, MP3), Twitter (X), Spotify (Tracks, Albums, Playlists, Short Links), Pinterest, Apple Music, Facebook, **Threads**, **Bandcamp**, **Pixiv** (R-18/R-18G), **Bilibili** (DASH), **Douyin** (No WM), and **RedNote (Xiaohongshu)**.
- **Playlist & Album One-Tap Batch Downloader**: Download entire playlists and albums from **Spotify**, **Apple Music**, and **YouTube Playlists** with a single tap. Features smart multi-track detection (`isMultiTrackContent`), real-time progress tracking (`1/15`, `2/15`...), 300ms sequential queue delays to prevent OS congestion, and automatic organization into music subfolders.
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
- **Premium Minimalist UI**: A distraction-free minimalist interface with clean typography, sharp borders, smooth transitions, and OLED dark mode.

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

- **macOS Release Asset**: `Mori-v4.2.4-macOS-arm64.dmg` & `Mori-v4.2.4-macOS-arm64.app.tar.gz`
- **Windows Release Asset**: `Mori-v4.2.4-Windows-x64-Setup.exe` & `Mori-v4.2.4-Windows-x64.msi`

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
mkdir -p Payload && cp -r build/Mori.xcarchive/Products/Applications/App.app Payload/ && zip -r "Mori v4.2.4.ipa" Payload && rm -rf Payload build
```

This outputs `Mori v4.2.4.ipa` in your project root directory, ready to be sideloaded via AltStore, Sideloadly, Scarlet, or TrollStore.

## iOS Sideloading Guide

Since Mori is client-side only and not distributed on the Apple App Store, iOS users can install `Mori v4.2.4.ipa` using one of the following sideloading methods:

- **AltStore / Sideloadly**: Best for all iOS versions. Requires a PC/Mac for initial installation, and app signatures need to be refreshed every 7 days (free personal Apple ID).
- **TrollStore**: Best for compatible iOS versions. Installs permanently, requires no computer after setup, and does not expire.
- **Scarlet / Esign**: Directly install on-device without a PC using enterprise/public developer certificates.

---

Developed with ❤️ by coflyn.
GitHub: https://github.com/coflyn
Instagram: @\_coflyn

## License

Mori is released under the **MIT License**. Feel free to use, modify, and distribute it.
