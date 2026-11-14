<p align="center">
  <img src="assets/icon.png" width="128" alt="Mori Logo">
</p>

<h1 align="center">Mori</h1>
<p align="center"><em>Save anything, from anywhere.</em></p>

<p align="center">
  <img src="https://img.shields.io/badge/Version-v4.6.0-brown?style=flat-square" alt="Version">
  <a href="https://www.npmjs.com/package/@coflyn/mori"><img src="https://img.shields.io/npm/v/@coflyn/mori?style=flat-square&color=CB3837&logo=npm&logoColor=white" alt="NPM Version"></a>
  <img src="https://img.shields.io/github/downloads/coflyn/Mori/total?style=flat-square&color=blue" alt="Downloads">
  <img src="https://img.shields.io/github/stars/coflyn/Mori?style=flat-square&color=gold" alt="Stars">
  <img src="https://img.shields.io/github/repo-size/coflyn/Mori?style=flat-square&color=purple" alt="Repo Size">
  <img src="https://img.shields.io/badge/License-GPL--3.0-blue?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/Platform-Android%20%7C%20iOS%20%7C%20CLI-3DDC84?style=flat-square&logo=android&logoColor=white" alt="Platform">
  <a href="https://whatsapp.com/channel/0029VbDXoqs6mYPSVp4UcT2A"><img src="https://img.shields.io/badge/WhatsApp-Channel-25D366?style=flat-square&logo=whatsapp&logoColor=white" alt="WhatsApp Channel"></a>
</p>

<div align="center">

Save videos, photos, and audio from 16 platforms with built-in media tools. No watermarks, accounts, or tracking. Everything runs locally on your device.

<a href="https://sociabuzz.com/coflyn/tribe" target="_blank">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="60" />
</a>

</div>

## Screenshots

<p align="center">
  <img src="assets/1.webp" width="30%">
  <img src="assets/2.webp" width="30%">
  <img src="assets/3.webp" width="30%">
</p>
<p align="center">
  <img src="assets/4.webp" width="30%">
  <img src="assets/5.webp" width="30%">
  <img src="assets/6.webp" width="30%">
</p>

---

## Table of contents

1. [How to use](#how-to-use)
2. [Download and installation](#download-and-installation)
3. [Mori CLI (Terminal)](#mori-cli-terminal)
4. [Features](#features)
5. [Built-in tools suite](#built-in-tools-suite)
6. [Supported platforms & scraper engines](#supported-platforms--scraper-engines)
7. [For developers & building from source](#for-developers--building-from-source)
8. [Scraper architecture](#scraper-architecture)
9. [Disclaimer](#disclaimer)
10. [License](#license)

---

## How to use

Download media in three steps:

1. Copy a video, photo, or music link from any supported app.
2. Open Mori. The app reads the clipboard automatically. On Android, you can also tap Share on any post and select Mori.
3. Choose your quality or format and tap Download. Files save directly to your gallery or music folder.

## Download and installation

Pre-compiled packages are available on [GitHub Releases](https://github.com/coflyn/Mori/releases) and [npm](https://www.npmjs.com/package/@coflyn/mori).

| Platform | Package | Guide |
| :--- | :--- | :--- |
| <img src="https://cdn.simpleicons.org/android/3DDC84" width="16" /> Android | `Mori v...apk` | [Installation & Play Protect Guide](GUIDE.md#android-installation--troubleshooting) |
| <img src="https://cdn.simpleicons.org/apple/000000" width="16" /> iOS | `Mori v...ipa` | [AltStore / TrollStore Sideloading](GUIDE.md#ios-sideloading-guide) |
| <img src="https://cdn.simpleicons.org/npm/CB3837" width="16" /> CLI (Desktop & Server) | `npx @coflyn/mori`<br>`npm install -g @coflyn/mori` | [Mori CLI Guide](#mori-cli-terminal) |

> For installation steps and troubleshooting, read the [User Guide (GUIDE.md)](GUIDE.md).

> Note: Standalone desktop GUI apps were replaced by the Mori CLI (`@coflyn/mori`) for direct terminal use and simpler updates without OS security prompts.

---

## Mori CLI (Terminal)

Mori also runs directly in your terminal:

<p align="center">
  <img src="assets/cli.webp" width="85%" alt="Mori CLI Preview">
</p>

```bash
# Run directly without installation
npx @coflyn/mori

# Download any link directly
npx @coflyn/mori <URL>

# Download audio stream only (MP3)
npx @coflyn/mori <URL> -a

# Compile photo album directly into PDF
npx @coflyn/mori <URL> -p
```

Or install globally:

```bash
npm install -g @coflyn/mori
mori
```

CLI features:
- Interactive terminal prompts with arrow-key navigation and slash commands (`/history`, `/play <num>`, `/delete <num>`, `/config`, `/stats`, `/update`, `/clear`).
- Automatic version check on launch alerts you when a newer release is published on npm.
- Concurrent downloads for photo carousels and albums with in-place progress bars.
- In-CLI updates via `mori --update` or `/update`.
- See the [CLI documentation (cli/README.md)](cli/README.md) for full commands and flags.

## Features

- Downloads watermark-free videos, photos, and audio from 16 platforms (TikTok, Instagram, YouTube, Twitter/X, Spotify, Apple Music, Pinterest, Facebook, Threads, Bandcamp, Pixiv, Bilibili, Douyin, RedNote, Reddit, TeraBox).
- Built-in media tools including a browser stream sniffer, offline audio extractor, image converter, PDF compressor, username availability checker, and anime scene search.
- In-app APK updates directly through GitHub Releases with localized changelogs.
- Customizable filename templates using `{platform}`, `{date}`, `{time}`, `{quality}`, `{num}`, and `{title}`, with persistent sequential counters per platform.
- Real-time download progress with byte counters, transfer speed, stall detection, and storage write status.
- Automatic MediaStore indexing so new files show up immediately in device gallery and music apps.
- Custom download folders, including support for external SD cards.
- Full album and playlist downloads for Spotify, Apple Music, and YouTube.
- Parallel downloads with up to 5 concurrent workers for albums and photo carousels.
- Floating download bubble with an aggregated progress ring, task drawer, and cancellation controls.
- Android Share menu integration to download media without opening the main app.
- Batch downloader to queue multiple links at once.
- Built-in media player with timeline scrubbing, double-tap seek, and audio controls.
- Local media gallery to browse and filter saved videos, music, photos, and PDFs.
- Photo carousel to PDF export for offline reading.
- Optional PIN and biometric lock for history and settings.
- Background downloads with wake-lock support.
- Available in 9 languages (English, Indonesian, Japanese, Korean, Simplified Chinese, Arabic with RTL layout, Russian, Tagalog, Hindi).
- Runs entirely on-device with no accounts, ads, or tracking.

---

## Built-in tools suite

The Tools tab provides client-side utilities that run locally on your device:

| Tool | Type | Description |
| :--- | :--- | :--- |
| Media Sniffer | Network Sniffer | Live in-app browser that intercepts video, audio, and HLS (.m3u8) streams while blocking ads and trackers. |
| Video to Audio Extractor | Offline Utility | Decodes local video files (MP4, MKV, WebM, MOV) into WAV or MP3 audio using the Web Audio API. |
| Image Converter & Scaler | Offline Utility | Converts and resizes images between WebP, JPG, and PNG with adjustable quality and resolution scaling. |
| PDF Document Compressor | Offline Utility | Compresses PDF files locally using bundled pdf-lib and pdf.js, with three compression presets. |
| Username Checker | Lookup | Checks username availability across 20+ social platforms simultaneously. |
| Anime Scene Search | Lookup | Reverse searches anime screenshots using trace.moe to find anime titles, episode numbers, and timestamps. |
| TikTok Profile Lookup | Lookup | Displays public profile information, stats, follower counts, and avatars. |
| Shortlink Resolver | URL Resolver | Resolves target URLs from supported ad gateways and shorteners. |

---

## Supported platforms & scraper engines

| Platform | Supported Domains / Formats | Features | Scraper Engine / Provider |
| :--- | :--- | :--- | :--- |
| <img src="https://cdn.simpleicons.org/instagram/E4405F" width="16" /> Instagram | `instagram.com` (`/p/`, `/reel/`, `/stories/`) | Reels / Stories / Photos | InDown (`indown.net`) & SnapSave (`snapsave.app`) |
| <img src="https://cdn.simpleicons.org/tiktok/000000" width="16" /> TikTok | `tiktok.com`, `vt.tiktok.com` | Video (No WM) / Slide Photos | TikDownloader (`tikdownloader.io`) & TikTokIO (`tiktokio.com`) |
| <img src="https://cdn.simpleicons.org/youtube/FF0000" width="16" /> YouTube | `youtube.com`, `youtu.be`, `music.youtube.com` | Playlist / Album / MP4 / MP3 | Ytmp3.gg (`media.ytmp3.gg`) & Ytmp3.gl (`ytmp3.gl`) |
| <img src="https://cdn.simpleicons.org/x/000000" width="16" /> Twitter (X) | `twitter.com`, `x.com` | HD Video / GIFs | TwitterVideoDownloader (`twittervideodownloader.com`) & SaveTWT (`savetwt.com`) |
| <img src="https://cdn.simpleicons.org/spotify/1DB954" width="16" /> Spotify | `open.spotify.com` (`track`, `album`, `playlist`, `/s/`) | Playlist / Album / MP3 | SpotiDown (`spotidown.app`) & SoundLoaders (`spotimate.app`) |
| <img src="https://cdn.simpleicons.org/applemusic/FA243C" width="16" /> Apple Music | `music.apple.com` | Album / Playlist / MP3 Track | AplMate (`aplmate.com`) |
| <img src="https://cdn.simpleicons.org/pinterest/E60023" width="16" /> Pinterest | `pinterest.com`, `pin.it` | Video / HD Images | Direct `pinimg.com` Parser & PinDown (`pindown.io`) |
| <img src="https://cdn.simpleicons.org/facebook/1877F2" width="16" /> Facebook | `facebook.com`, `fb.watch` | Reels / HD Video | SnapSave (`snapsave.app`) |
| <img src="https://cdn.simpleicons.org/xiaohongshu/FF2442" width="16" /> RedNote | `xiaohongshu.com`, `xhslink.com`, `xhslink.cn`, `rednote.com` | HD Photos / Videos | Direct `__INITIAL_STATE__` SSR Extractor |
| <img src="https://cdn.simpleicons.org/threads/000000" width="16" /> Threads | `threads.com` | Video / Photo Carousel | Threadster (`threadster.app`) |
| <img src="https://cdn.simpleicons.org/bilibili/00A1D6" width="16" /> Bilibili | `bilibili.com`, `b23.tv`, `bili.im`, `bilibili.tv` | Video / Audio (DASH 1080p) | Direct Bilibili Web API (`api.bilibili.com` & `api.bilibili.tv`) & Wbi Resolver |
| <img src="https://cdn.simpleicons.org/pixiv/0096FA" width="16" /> Pixiv | `pixiv.net` (`artworks`) | Gallery / Ugoira to MP4 | Direct Pixiv AJAX API & Ugoira Zip-to-MP4 Converter |
| <img src="https://cdn.simpleicons.org/tiktok/000000" width="16" /> Douyin | `douyin.com`, `v.douyin.com` | Video (No WM) / Photos | Direct `iesdouyin.com` API & Multi-Marker SSR Resolver |
| <img src="https://cdn.simpleicons.org/bandcamp/1DA1F2" width="16" /> Bandcamp | `*.bandcamp.com` | Track / Album / MP3 | BandcampDownloader (`bandcampdownloader.app`) |
| <img src="https://cdn.simpleicons.org/reddit/FF4500" width="16" /> Reddit | `reddit.com`, `redd.it` | HD Video (Audio) / Photos | RapidSave (`rapidsave.com`) |
| <img src="https://cdn.simpleicons.org/box/0061D5" width="16" /> TeraBox | `terabox.com`, `teraboxapp.com`, `1024tera.com`, `teraboxlink` | Direct File / Stream (m3u8) | Sechno (`sechno.com`) |

---

## For developers & building from source

To set up the development environment, contribute translations, or build locally:

- Read [CONTRIBUTING.md](CONTRIBUTING.md) for build requirements and compilation instructions for Android and iOS.
- Read [CHANGELOG.md](CHANGELOG.md) for release history.

<details>
<summary><b>Tech Stack & Project Structure</b></summary>

### Built With

- **JavaScript (ES6+)**: Core application logic and client-side UI.
- **HTML5 & CSS3**: Responsive design system with dark mode.
- **CapacitorJS**: Native Android and iOS bridge for filesystem, share sheet, clipboard, and biometrics.
- **OkHttp (Native Android)**: HTTP client for WebView CORS handling.
- **Cheerio & Axios**: HTML parsing and HTTP requests.
- **pdf-lib**: Client-side PDF generation.

### Project Structure

```
Mori/
├── android/                    # Capacitor Android native project
│   ├── app/src/main/
│   │   ├── java/com/mori/downloader/
│   │   │   ├── DownloadForegroundService.java # Background download persistent service & wake-lock
│   │   │   ├── MainActivity.java   # Main Activity + native HTTP bridge & frame extractor
│   │   │   └── ShareActivity.java  # Native Quick Save Share overlay & MediaStore indexer
│   │   └── res/                # Android layout, drawables, XML configs & splash screens
│   └── gradle/                 # Gradle build scripts & configurations
├── ios/                        # Capacitor iOS Xcode workspace
│   └── App/                    # iOS Xcode project, Info.plist, and CocoaPods
├── cli/                        # Standalone Universal Media Downloader CLI (Node.js)
├── src-scrapers/               # Modular ES scraper engine source files (16 platforms)
├── scripts/                    # Build & compilation tooling
│   └── compile-scrapers.mjs    # esbuild compilation script for scrapers bundle & checksum manifest
├── landing/                    # Standalone promotional landing page & cross-platform download portal
│   ├── index.html              # Landing page markup & release download links
│   └── style.css               # Landing page responsive styling
├── assets/                     # App icons, mockups, & screenshots
├── public/                     # Frontend web assets (Vanilla JS + CSS)
│   ├── css/                    # Modular CSS architecture
│   │   ├── variables.css       # Design tokens, themes, typography, and corner presets
│   │   ├── base.css            # CSS reset, typography, header, and bottom navigation
│   │   ├── components.css      # Buttons, toast alerts, and floating download bubble
│   │   ├── home.css            # URL input bar, batch textarea, and preview cards
│   │   ├── gallery.css         # Media gallery grid, filtering chips, and search toolbar
│   │   ├── tools.css           # Multi-utility suite layout and modal styles
│   │   ├── history.css         # History layout, summary stats card, and actions bar
│   │   ├── settings.css        # Settings menu list and sub-page transitions
│   │   ├── modals.css          # Modal overlays, PIN keypad, and info dialogs
│   │   ├── rtl.css             # Right-to-Left (RTL) language overrides for Arabic
│   │   └── style.css           # Master stylesheet entry point
│   ├── js/
│   │   ├── app.js              # Application entry point and startup lifecycle
│   │   ├── components/         # Reusable UI components
│   │   │   └── player.js       # In-app media player
│   │   ├── downloader/         # Modular native download engine
│   │   │   ├── filename.js     # Extension resolution, sanitization, and templates
│   │   │   ├── headers.js      # Platform-specific Referer/Origin headers builder
│   │   │   ├── resolver.js     # Asynchronous link resolver
│   │   │   ├── storage.js      # Filesystem persistence and cleanup
│   │   │   ├── postProcess.js  # MediaScanner and notification triggers
│   │   │   └── index.js        # Downloader module entry
│   │   ├── i18n/               # Multi-language translations (9 languages + RTL support)
│   │   │   ├── locales/        # Locale dictionaries (en, id, ja, ko, zh, ar, ru, tl, hi)
│   │   │   └── index.js        # Translation loader and t() helper
│   │   ├── modules/            # Core business logic & application state
│   │   │   ├── authManager.js  # PIN passcode and biometric lock
│   │   │   ├── batchManager.js # Multi-link batch queue and playlist manager
│   │   │   ├── bgAnimation.js  # Live canvas backgrounds
│   │   │   ├── core.js         # Shared state and constants
│   │   │   ├── download.js     # Analysis pipeline and download controller
│   │   │   ├── gallery.js      # Storage scanning and thumbnail caching
│   │   │   ├── history.js      # Download history manager
│   │   │   ├── intents.js      # Clipboard auto-detection
│   │   │   ├── modals.js       # Dialogs and modal helpers
│   │   │   ├── settings/       # Settings subsystems (appearance, storage, language)
│   │   │   ├── settings.js     # Settings facade
│   │   │   ├── tools/          # Built-in offline & online utilities
│   │   │   │   ├── animeSearch.js     # Anime scene search via trace.moe
│   │   │   │   ├── audioExtractor.js  # Video-to-audio extraction via Web Audio API
│   │   │   │   ├── imageConverter.js  # Image format converter & quality scaler
│   │   │   │   ├── pdfCompressor.js   # PDF compression via pdf-lib & pdf.js
│   │   │   │   ├── sflgl.js           # Shortlink unwrapper
│   │   │   │   ├── sniffer.js         # Live browser media stream sniffer
│   │   │   │   ├── storageHelper.js   # File export and MediaScanner indexing
│   │   │   │   ├── tiktokFinder.js    # TikTok profile lookup
│   │   │   │   ├── usernameChecker.js # Multi-platform username checker
│   │   │   │   └── index.js           # Tools router
│   │   │   └── update.js       # GitHub release checker & in-app APK updater
│   │   ├── scrapers/           # Scraper runtime loader & HTTP helper
│   │   │   ├── bundle.js       # Bundled scraper core (esbuild IIFE, 16 platforms)
│   │   │   ├── httpHelper.js   # HTTP engine with native bridge fallback
│   │   │   └── index.js        # Scraper bundle loader
│   │   ├── ui/                 # UI presentation layer
│   │   │   ├── downloadBubble.js # Floating download bubble and dropup manager
│   │   │   ├── nativeDownload.js # Download flow and progress tracker
│   │   │   ├── result.js       # Analysis results view and media slider
│   │   │   └── resultModal.js  # Preview modal and path navigator
│   │   ├── share.js            # Android Quick Save Share Overlay controller
│   │   ├── ui.js               # History rendering and gestures
│   │   ├── utils/              # Helper utilities
│   │   │   ├── plugins.js      # Capacitor plugin registry
│   │   │   ├── http.js         # User-Agent presets, cookie parser, query serializer
│   │   │   ├── device.js       # Haptic feedback and wake-lock controls
│   │   │   ├── toast.js        # Notification toasts
│   │   │   ├── sound.js        # Audio effects generator
│   │   │   ├── media.js        # Video thumbnail generator
│   │   │   ├── pdfHelper.js    # PDF bundling helpers
│   │   │   ├── urlUtils.js     # URL sanitization
│   │   │   └── index.js        # Utility helpers export
│   │   └── vendor/             # Third-party libraries (pdf-lib, pdf.js)
│   ├── index.html              # Main application markup
│   └── share.html              # Android Quick Save Share Overlay markup
├── test/                       # Automated test suites
├── capacitor.config.json       # Capacitor configuration
├── package.json                # Project dependencies and build scripts
├── CHANGELOG.md                # Version release history
├── CONTRIBUTING.md             # Developer setup and contribution guidelines
├── GUIDE.md                    # User manual
├── LICENSE                     # GNU General Public License v3.0
├── log.txt                     # Internal development log
└── README.md                   # Project documentation
```

</details>

---

## Scraper architecture

Scrapers are bundled into `public/js/scrapers/bundle.js` using esbuild as an IIFE containing all 16 platform engines.

- Bundled scrapers ship with regular app updates through GitHub Releases.
- The UI, bridge layer, and scraper wrappers are open source under GPL-3.0.
- Platform scraper fixes and updates can be submitted by following [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Disclaimer

- Personal and educational use only: Mori is intended for personal media archiving and research. Users are responsible for complying with local copyright laws and the terms of service of each platform.
- No media hosting: Mori does not host, cache, or redistribute media files on external servers. All downloads execute directly on the user's device.
- Upstream services: Mori queries public web endpoints. If you operate an upstream service and want an endpoint removed, open a GitHub issue or contact riazrepo@gmail.com.

---

## License

Mori is licensed under the [GNU General Public License v3.0 (GPL-3.0)](LICENSE).

- Anyone modifying or redistributing this software must release the complete corresponding source code under GPL-3.0.
- Commercial redistribution, rebranding, or distributing closed-source builds of Mori without adhering to GPL-3.0 is not permitted.
- The Mori name and project logo belong to the original author. Derivative projects must use distinct branding.

---

Developed by coflyn.  
WhatsApp Channel: https://whatsapp.com/channel/0029VbDXoqs6mYPSVp4UcT2A  
GitHub: https://github.com/coflyn  
Instagram: @\_coflyn
