<p align="center">
  <img src="assets/icon.png" width="128" alt="Mori Logo">
</p>

<h1 align="center">Mori</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Version-v4.3.1-brown?style=flat-square" alt="Version">
  <img src="https://img.shields.io/github/downloads/coflyn/Mori/total?style=flat-square&color=blue" alt="Downloads">
  <img src="https://img.shields.io/github/stars/coflyn/Mori?style=flat-square&color=gold" alt="Stars">
  <img src="https://img.shields.io/github/repo-size/coflyn/Mori?style=flat-square&color=purple" alt="Repo Size">
  <img src="https://img.shields.io/badge/License-GPL--3.0-blue?style=flat-square" alt="License">
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

## 📜 Features

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
- **OkHttp (Native Android)**: High-performance native HTTP engine to seamlessly bypass WebView CORS and network restrictions.
- **Native Security Engine (C / Rust)**: Dynamic handshake and integrity verification layer for scraper runtime security.
- **Cheerio & Axios**: Fast DOM HTML parsing and HTTP client request handling.
- **pdf-lib**: Client-side PDF generation and bundling.

## Project Structure

```
Mori/
├── android/                    # Capacitor Android native project
│   ├── app/src/main/
│   │   ├── java/com/mori/downloader/
│   │   │   ├── MainActivity.java   # Main Activity + native HTTP bridge (CORS bypass) & security key
│   │   │   └── ShareActivity.java  # Native Quick Save Share overlay & MediaStore indexer
│   │   └── jniLibs/            # Native compiled security libraries (libmorisec.so: arm64, armv7, x86_64)
│   └── gradle/                 # Gradle build scripts & configurations
├── ios/                        # Capacitor iOS Xcode workspace
│   └── App/                    # iOS Xcode project, Info.plist, and CocoaPods
├── src-tauri/                  # Tauri v2 Desktop Rust backend (macOS & Windows)
│   ├── capabilities/           # Application permissions & security capabilities
│   ├── src/                    # Rust native HTTP, local filesystem & security key provider
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
│   │   ├── scrapers.bin        # Pre-compiled & encrypted core scraper binary bytecode (14 platforms)
│   │   ├── scrapers/           # Scraper runtime loader & HTTP helper
│   │   │   ├── httpHelper.js   # Unified HTTP engine (native OkHttp/Tauri bridge + UA rotation)
│   │   │   └── index.js        # Dynamic handshake runtime loader & decryptor for scrapers.bin
│   │   ├── ui/                 # UI rendering & presentation layer
│   │   │   ├── nativeDownload.js # Download progress tracking & file system writer
│   │   │   ├── result.js       # Analysis results view, media slider, & PDF creator
│   │   │   └── resultModal.js  # Detailed preview modal & folder path navigator
│   │   ├── share.js            # Android Quick Save Share Overlay controller
│   │   ├── ui.js               # History rendering & gesture handlers (long-press delete)
│   │   ├── utils/              # Helper utilities
│   │   │   ├── index.js        # Haptics, toasts, wake lock, filesystem & plugin sync helpers
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

## 📥 Download & Installation

Pre-compiled, ready-to-use binaries are available for all platforms on **[GitHub Releases](https://github.com/coflyn/Mori/releases)**.

| Platform                                                                                                                        | Available Packages                                                                    | Guide                                                                               |
| :------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------ | :---------------------------------------------------------------------------------- |
| <img src="https://cdn.simpleicons.org/android/3DDC84" width="16" /> **Android**                                                 | `Mori v4.3.1.apk`                                                                     | [Installation & Play Protect Guide](GUIDE.md#android-installation--troubleshooting) |
| <img src="https://cdn.simpleicons.org/apple/000000" width="16" /> **macOS**                                                     | `Mori-v4.3.1-macOS-arm64.dmg` _(DMG)_<br>`Mori-v4.3.1-macOS-arm64.app.tar.gz` _(Tar)_ | [Gatekeeper Quarantine Fix](GUIDE.md#macos-installation--gatekeeper-fix)            |
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/windows11/windows11-original.svg" width="16" /> **Windows** | `Mori-v4.3.1-Windows-x64-Setup.exe` _(EXE)_<br>`Mori-v4.3.1-Windows-x64.msi` _(MSI)_  | [Windows Setup Guide](GUIDE.md#windows-installation)                                |
| <img src="https://cdn.simpleicons.org/apple/000000" width="16" /> **iOS**                                                       | `Mori v4.3.1.ipa`                                                                     | [AltStore / TrollStore Sideloading](GUIDE.md#ios-sideloading-guide)                 |

> 📖 **Need help installing or troubleshooting?**  
> Read the complete **[Installation, Sideloading & User Guide (GUIDE.md)](GUIDE.md)**.

## 🛠️ Building from Source & Changelog

Interested in customizing the interface, contributing translations, or compiling binaries locally?  
All build commands, release logs, and prerequisites are documented in:

👉 **[Developer & Compilation Guide (BUILD.md)](BUILD.md)**  
📜 **[Release History & Version Logs (CHANGELOG.md)](CHANGELOG.md)**

## 📄 License & Terms of Use

Mori is free and open-source software licensed under the **[GNU General Public License v3.0 (GPL-3.0)](LICENSE)**.

- **Copyleft Enforcement**: Anyone who modifies or distributes copies of this software is strictly required to provide the complete corresponding source code under the same GPL-3.0 license.
- **No Unauthorized Commercial Re-selling**: Packaging, rebranding, or distributing closed-source, paid, or monetized variants of Mori without honoring GPL-3.0 requirements violates copyright law and will be subject to official DMCA takedowns.
- **Trademark & Identity**: The name "Mori", app logo, and associated visual designs are the property of the original author. Derivative works must be clearly distinguished and must not claim affiliation with the original project.

### 🔒 Why the Scraper Core is Pre-Compiled (`scrapers.bin`)

Mori was built from scratch as a free, privacy-first, zero-bullshit project with countless hours spent hunting down, reverse-engineering, and maintaining elusive third-party scraper endpoints & web APIs.

**Too many lazy script kiddies and leeches keep cloning this repo, slapping their ugly AI-generated logo or rebranding over it, injecting predatory ads & trackers, and shamelessly selling it for quick cash**, all while expecting me to fix and maintain the scrapers for free whenever upstream services break. 🤡

I have zero patience for parasites exploiting open-source goodwill. To shut down low-effort skids while keeping Mori 100% free, clean, and blazing fast for real users:

- **Distributed as an integrity-protected pre-compiled binary (`scrapers.bin`) backed by native Android OkHttp.**
- **The application remains fully open for UI customization, feature contributions, and personal inspection under GPL-3.0.**
- **If you actually want to write code, improve algorithms, or contribute genuine scraper patches, hit me up via GitHub Issues or PRs. No freeloaders allowed.**

---

Developed with ❤️ by coflyn.  
GitHub: https://github.com/coflyn  
Instagram: @\_coflyn
