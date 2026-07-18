<p align="center">
  <img src="assets/icon.png" width="128" alt="Mori Logo">
</p>

<h1 align="center">Mori - Minimalist Media Downloader</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Version-v3.8.0-brown?style=flat-square" alt="Version">
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

## What's New in v3.8.0

- **TikTok Scraper Migrated (SnapTik → TikTokIO)**: Replaced the broken SnapTik-based scraper with a new implementation using `tiktokio.com/api/v1/tk/html`. Direct POST request via `CapacitorHttp`, regex-based HTML parsing (no DOM dependency), supports video (no watermark / HD) and MP3 downloads.
- **Douyin Photo Slideshow**: Added support for Douyin photo posts (`aweme_type` 2). Multiple images display as a swipeable slideshow — same as TikTok photo experience.
- **Consolidated User-Agent**: Removed scattered hardcoded UA strings across all scrapers — replaced with a single `CHROME_UA` constant from `utils.js`. Only Douyin keeps its mobile Safari UA intentionally.
- **Bugfixes**:
  - **Instagram URL cleaning**: Now uses `getCleanUrl()` before stripping query params — prevents failure when pasting text with embedded URLs.
  - **Douyin thumbnail**: Falls back to first photo URL when `item.video.cover` is undefined (photo slideshows).
  - **TikTok URL query params**: Strips `?` parameters before sending to TikTokIO API — was causing "Paste correct link" errors.

## Previous Updates v3.7.0

- **SoundCloud Removed**: Replaced SoundCloud with **Bilibili**, **Douyin**, and **RedNote (Xiaohongshu)** scrapers.
- **Bilibili (Mainland & International)**: Full DASH support with video + audio stream extraction. Mainland China links use seekin.ai API fallback, while bilibili.tv links extract episode IDs from HTML `window.__initialState` and query the official playurl gateway directly.
- **Douyin**: Direct page parsing with `window._ROUTER_DATA` extraction — supports both watermarked and no-watermark video.
- **RedNote (Xiaohongshu)**: Download media via seekin.ai server action with CDN URL extraction.
- **Download Quality Labels**: Platform scrapers now include descriptive quality labels (`1080p`, `320kbps`, etc.) displayed in the download list.
- **Platform Icons Updated**: Douyin uses TikTok icon, Bilibili uses official Bilibili SVG icon, RedNote uses RedNote icon in the supported platforms table.
- **Update Notification Modal**: Both manual and auto-update checks now show a polished modal with "Don't show again" option for auto-check. Supports EN/ID/JA translations.
- **Preview Optimization**: Resolved infinite loading on Bilibili, Douyin, and RedNote previews.
  - **Bilibili**: Now uses static image preview (similar to YouTube) to optimize layout and prevent player overhead.
  - **Douyin**: Plays directly from the direct CDN watermark stream to prevent 302 redirect header-stripping issues and signature invalidation.
  - **RedNote**: Loads the first 3MB chunk in memory as a `Blob` (via range headers) and converts it to a local Object URL to bypass CDN referrer restrictions.

## Supported Platforms

| Platform                                                                                                                                                              | Features                 | Platform                                                                            | Features                 |
| :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------- | :---------------------------------------------------------------------------------- | :----------------------- |
| <img src="https://cdn.simpleicons.org/tiktok/000000" width="16" /> **TikTok**                                                                                         | Video (No WM) / Photos   | <img src="https://cdn.simpleicons.org/instagram/E4405F" width="16" /> **Instagram** | Reels / Stories / Photos |
| <img src="https://cdn.simpleicons.org/youtube/FF0000" width="16" /> **YouTube**                                                                                       | MP4 / MP3 (High Quality) | <img src="https://cdn.simpleicons.org/x/000000" width="16" /> **Twitter (X)**       | Video / GIFs             |
| <img src="https://cdn.simpleicons.org/spotify/1DB954" width="16" /> **Spotify**                                                                                       | Music / Metadata         | <img src="https://cdn.simpleicons.org/pinterest/E60023" width="16" /> **Pinterest** | Video / Images           |
| <img src="https://cdn.simpleicons.org/applemusic/FA243C" width="16" /> **Apple Music**                                                                                | High Fidelity Audio      | <img src="https://cdn.simpleicons.org/facebook/1877F2" width="16" /> **Facebook**   | Reels / HD Video         |
| <img src="https://cdn.simpleicons.org/xiaohongshu/FF2442" width="16" /> **RedNote**                                                                                   | Photos / Videos          | <img src="https://cdn.simpleicons.org/threads/000000" width="16" /> **Threads**     | Video / Photos           |
| <img src="https://cdn.simpleicons.org/bilibili/00A1D6" width="16" /> **Bilibili**                                                                                     | Video / Audio (DASH)     | <img src="https://cdn.simpleicons.org/pixiv/0096FA" width="16" /> **Pixiv**         | Gallery / Ugoira to MP4  |
| <img src="https://cdn.simpleicons.org/douyin/000000" width="16" style="display:none;" /><img src="https://cdn.simpleicons.org/tiktok/000000" width="16" /> **Douyin** | Video (No WM / WM)       | <img src="https://cdn.simpleicons.org/bandcamp/1DA1F2" width="16" /> **Bandcamp**   | Album / Track Support    |

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
