<p align="center">
  <img src="assets/icon.png" width="128" alt="Mori Logo">
</p>

<h1 align="center">Mori - Minimalist Media Downloader</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Version-v3.9.0-brown?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/Platform-Android-3DDC84?style=flat-square&logo=android&logoColor=white" alt="Platform">
</p>

Mori is a modern, privacy-first media downloader that saves photos, videos, and audio from 14 platforms. Built with a **client-only architecture**, all scraping runs on-device — no backend, no tracking, maximum privacy.

## 📸 Screenshots

<p align="center">
  <img src="assets/1.jpeg" width="30%">
  <img src="assets/2.jpeg" width="30%">
  <img src="assets/3.jpeg" width="30%">
</p>
<p align="center">
  <img src="assets/4.jpeg" width="30%">
  <img src="assets/5.jpeg" width="30%">
  <img src="assets/6.jpeg" width="30%">
</p>

## What's New in v3.9.0

- **Enhanced Filename Sanitization & Storage Permission Error Fix**:
  - **URI & Hashtag Sanitization**: Strips `#` (hashtags), `%`, `&`, and special symbols from video/media titles. Hashtags in filenames were previously causing Android native URI parsers to fail with `EACCES (Permission denied)` and `ENOENT (No such file or directory)`.
  - **Length & Unicode Optimization**: Truncates sanitized titles to a maximum of 60 characters and strips non-standard Unicode symbols, preventing filesystem path overflow errors across Android versions.
- **Bilibili Short-Link & Season Resolution (bili.im / b23.tv)**: Overhauled Bilibili link resolution and stream extraction:
  - **Short Link & Redirect Handling**: Robust manual parsing for non-standard HTML redirects on `bili.im` and `b23.tv` short URLs when CapacitorHttp response headers do not auto-resolve destination URLs.
  - **Anime/Series Season Resolution**: Resolves season-only URLs (`/play/sid`) directly to active episode IDs (`ep_id`) using the Bilibili OGV episodes API (`/intl/gateway/web/v2/ogv/play/episodes`).
  - **Upgraded Stream API**: Switched to Bilibili OGV v2 API (`/intl/gateway/v2/ogv/playurl`), delivering multi-resolution video streams (480p, 360p, 240p, 144p) and high-bitrate audio streams.
  - **HTTPS & Referer Injection**: Enforces HTTPS protocols on all DASH video/audio stream URLs (`bilivideo.com`, `bstarstatic.com`, `akamaized.net`) and injects mandatory `Referer: https://www.bilibili.tv/` headers, eliminating cleartext HTTP download errors and 403 Forbidden file corruptions.
- **Pixiv Ugoira Extraction & Download Engine**: Overhauled Pixiv Ugoira (animated illustration) detection & download system:
  - **Server-Independent Detection**: Bypasses login & R-18 restriction blocks using `meta-preload-data` HTML parsing and `ugoira_meta` API validation.
  - **Animated Media Preview**: Live animated GIF preview for Ugoira artworks in the application viewer.
  - **Format Options**: Export Ugoiras as **MP4**, **GIF**, or **ZIP** (full original frame archive).
  - **CapacitorHttp Blob Fallback Downloader**: Integrated a fallback download engine using `CapacitorHttp` with `responseType: "blob"` and domain-aware `Referer` routing (`ugoira.com` & `pximg.net`), ensuring downloads succeed across strict CDN redirects and anti-hotlink rules.
- **Dual YouTube Scraper System**: Integrated dual-scraper selection menu when analyzing YouTube URLs:
  - **Server 1 (ytmp3.gg)**: Multi-resolution video downloads (1080p, 720p, 480p, 360p) + MP3 audio.
  - **Server 2 (ytmp3.mobi)**: Fast & stable single-quality MP4 / MP3 extraction.
- **Dual TikTok Scraper System**: Added server selection menu for TikTok downloads:
  - **Server 1 (TikTokIO)**: Multi Feature (HD Video, MP3 audio, and Photo Slideshow).
  - **Server 2 (SnapTik)**: Fast & Direct (HD / MP4 Video and Photo Slideshow).
- **Dual Instagram Scraper System**: Added server selection menu for Instagram downloads:
  - **Server 1 (Indown)**: HD Reels, Posts, Photos extraction.
  - **Server 2 (DownReels)**: Fast API-based Reels & media extraction.
- **Dual Twitter/X Scraper System**: Added server selection menu for Twitter/X downloads:
  - **Server 1 (Tweeload)**: Multi-resolution video downloads (HD/SD).
  - **Server 2 (TVD)**: Fast TwitterVideoDownloader direct video extraction.
- **Dual Spotify Scraper System**: Added server selection menu for Spotify track downloads:
  - **Server 1 (SpotiDown)**: Standard MP3 track extraction.
  - **Server 2 (SpotMate)**: Fast & Direct MP3 extraction (`spotmate.online` integration).

## Previous Updates v3.8.0

- **TikTok Scraper Migrated (SnapTik → TikTokIO)**: Replaced the broken SnapTik-based scraper with a new implementation using `tiktokio.com/api/v1/tk/html`. Direct POST request via `CapacitorHttp`, regex-based HTML parsing (no DOM dependency), supports video (no watermark / HD) and MP3 downloads.
- **Douyin Photo Slideshow**: Added support for Douyin photo posts (`aweme_type` 2). Multiple images display as a swipeable slideshow — same as TikTok photo experience.
- **Consolidated User-Agent**: Removed scattered hardcoded UA strings across all scrapers — replaced with a single `CHROME_UA` constant from `utils.js`. Only Douyin keeps its mobile Safari UA intentionally.
- **Bugfixes**:
  - **Instagram URL cleaning**: Now uses `getCleanUrl()` before stripping query params — prevents failure when pasting text with embedded URLs.
  - **Douyin thumbnail**: Falls back to first photo URL when `item.video.cover` is undefined (photo slideshows).
  - **TikTok URL query params**: Strips `?` parameters before sending to TikTokIO API — was causing "Paste correct link" errors.

## Supported Platforms

| Platform                                                                                                                                                              | Features                 | Platform                                                                            | Features                 |
| :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------- | :---------------------------------------------------------------------------------- | :----------------------- |
| <img src="https://cdn.simpleicons.org/tiktok/000000" width="16" /> **TikTok**                                                                                         | Video (No WM) / Photos   | <img src="https://cdn.simpleicons.org/instagram/E4405F" width="16" /> **Instagram** | Reels / Stories / Photos |
| <img src="https://cdn.simpleicons.org/youtube/FF0000" width="16" /> **YouTube**                                                                                       | MP4 Video / MP3 Audio    | <img src="https://cdn.simpleicons.org/x/000000" width="16" /> **Twitter (X)**       | HD Video / GIFs          |
| <img src="https://cdn.simpleicons.org/spotify/1DB954" width="16" /> **Spotify**                                                                                       | MP3 Audio                | <img src="https://cdn.simpleicons.org/pinterest/E60023" width="16" /> **Pinterest** | Video / Images           |
| <img src="https://cdn.simpleicons.org/applemusic/FA243C" width="16" /> **Apple Music**                                                                                | MP3 Audio                | <img src="https://cdn.simpleicons.org/facebook/1877F2" width="16" /> **Facebook**   | Reels / HD Video         |
| <img src="https://cdn.simpleicons.org/xiaohongshu/FF2442" width="16" /> **RedNote**                                                                                   | Photos / Videos          | <img src="https://cdn.simpleicons.org/threads/000000" width="16" /> **Threads**     | Video / Photos           |
| <img src="https://cdn.simpleicons.org/bilibili/00A1D6" width="16" /> **Bilibili**                                                                                     | Video / Audio (DASH)     | <img src="https://cdn.simpleicons.org/pixiv/0096FA" width="16" /> **Pixiv**         | Gallery / Ugoira to MP4  |
| <img src="https://cdn.simpleicons.org/douyin/000000" width="16" style="display:none;" /><img src="https://cdn.simpleicons.org/tiktok/000000" width="16" /> **Douyin** | Video (No WM) / Photos   | <img src="https://cdn.simpleicons.org/bandcamp/1DA1F2" width="16" /> **Bandcamp**   | Album / MP3 Track        |

## Built With

- **JavaScript (ES6+)**: Core application logic and scraping engine.
- **HTML5 & CSS3**: Custom design system without bloated frameworks.
- **CapacitorJS**: Native Android bridge for filesystem, clipboard, and biometrics.
- **pdf-lib**: Client-side PDF generation and bundling.

## Project Structure

```
Mori/
├── android/                    # Capacitor Android native project
│   ├── app/src/main/           # Android manifest, resources, assets
│   └── gradle/                 # Gradle wrapper & build config
├── assets/                     # Screenshots & branding assets
├── public/
│   ├── css/
│   │   └── style.css           # Design system & all component styles
│   ├── js/
│   │   ├── i18n.js             # Multi-language translations (EN/ID/JA)
│   │   ├── pdf-lib.min.js      # PDF generation library (vendor)
│   │   ├── player.js           # Custom video player with touch controls
│   │   ├── scrapers.js         # Platform scrapers (TikTok, IG, YT, etc.)
│   │   ├── script.js           # App init, navigation, settings, history
│   │   ├── ui.js               # Media slider, results, history renderer
│   │   └── utils.js            # Filesystem, cookie utils, helpers
│   └── index.html              # Single-page entry point
├── capacitor.config.json       # Capacitor configuration
├── package.json                # Dependencies & scripts
├── .gitignore
├── LICENSE
└── README.md
```

## Key Features

- **Multi-Platform Support**: High-quality downloads from TikTok (No Watermark), Instagram (Reels/Photos), YouTube, Twitter (X), Spotify, Pinterest, Apple Music, Facebook, **Threads**, **Bandcamp**, **Pixiv** (R-18/R-18G), **Bilibili** (DASH), **Douyin** (No WM), and **RedNote (Xiaohongshu)**.
- **Live Media Previews**: View images, play videos, and listen to audio directly within the app before downloading.
- **Standalone PDF Document Export**: Convert image galleries from any platform into high-quality PDF files for offline viewing.
- **Private History Manager**: Downloaded files are managed internally with local playback support and offline badge detection.
- **Share Intent Integration**: Send links directly to Mori from other apps via the system Share menu.
- **Auto Clipboard Paste**: Automatically detects and pastes links from clipboard when you return to the app.
- **Auto Update Check**: Checks for new versions on startup via GitHub Releases and shows a popup modal when an update is available.
- **Biometric Privacy Lock**: Secure your history with native fingerprint/FaceID authentication.
- **Export/Import Data**: Full data portability — backup and restore your history, settings, and paths as a JSON file.
- **Intelligent Error Handling**: Real-time feedback for IP blocks or network issues via premium Toast notifications.
- **Premium Minimalist UI**: A distraction-free glassmorphism interface with smooth transitions, dark mode, and accent colors.

## How to Use

1. Copy a link from a supported platform or Share it directly to Mori.
2. Use the **Paste** button or let the auto-detection handle the link.
3. Tap **Analyze** to verify the content.
4. Preview the media (swipe through carousels if available).
5. Choose your format and tap **Download**.
6. Files are saved to your internal history for offline access.

## For Developers

Mori is built using Capacitor and Vanilla JS for high performance.

- **On Android**: Uses `CapacitorHttp` to bypass CORS and download directly from the device IP.
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

For a release APK, generate a signed keystore and run:

```bash
cd android && ./gradlew assembleRelease
```

---

Developed with ❤️ by coflyn.
GitHub: https://github.com/coflyn
Instagram: @\_coflyn

## License

Mori is released under the **MIT License**. Feel free to use, modify, and distribute it.
