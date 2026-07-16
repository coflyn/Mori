<p align="center">
  <img src="assets/icon.png" width="128" alt="Mori Logo">
</p>

<h1 align="center">Mori - Minimalist Media Downloader</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Version-v3.6.0-brown?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/Platform-Android-3DDC84?style=flat-square&logo=android&logoColor=white" alt="Platform">
</p>

Mori is a modern, privacy-first media downloader that saves photos, videos, and audio from 12 platforms. Built with a **client-only architecture**, all scraping runs on-device — no backend, no tracking, maximum privacy.

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

## What's New in v3.6.0

- **Instagram**: Fixed the existing `indown.io` scraper by implementing custom desktop `User-Agent` and `Accept` header structures to bypass Cloudflare Turnstile and JS-based challenges. This fully resolves the recent `403 Forbidden` block and correctly parses reels, videos, and multi-image posts.

- **Pixiv**: Migrated the fallback system for restricted (R-18/R-18G) and region-locked artworks to **Pixivre (pixiv.re)** as the alternative, since Phixiv is no longer available. When the main Pixiv API blocks content, Mori dynamically detects the total page count using a lightweight binary search on `pixiv.re` HEAD checks via `CapacitorHttp`, and extracts the original post title via static HTML scraping of `pixiv.net/en/artworks/` metadata.

- **Google Fonts**: Added `Space Mono` to the preloaded Google Fonts stylesheet — all five font families (`Inter`, `Outfit`, `Plus Jakarta Sans`, `Space Mono`) are now correctly loaded.

- **Japanese Translations**: Completed all missing Japanese UI strings (~25+ keys) including Privacy Lock, Biometric, Export/Import, User Guide, Wi-Fi Only, and Auto-Download. Fixed mismatched key names (`toast-autoclear-on/off` → `toast-autoclear-cache-on/off`).

- **Biometric Reason Prompt**: Added `label-biometric-reason` translation key for all three languages (EN/ID/JA) — biometric prompt no longer shows raw `"undefined"`.

- **Pixiv Network Consistency**: Replaced raw `fetch()` with `CapacitorHttp.request()` in the Pixiv fallback binary search for consistent CORS/cookie handling across Android WebView.

- **Duplicate CSS Removed**: Removed 3 redundant CSS selector blocks (`.progress-container`, `.progress-bar`, duplicate `.slide-indicator`) that conflicted with the later polished definitions.

- **Unused Code Cleanup**: Removed unused `loopSetting` variable from the download handler.

- **Android `.gitignore` Hardened**: Added standard patterns (`*.aab`, `.idea/`, `*.hprof`, `*.iml`, `android/captures/`).

- **Update Check via GitHub Releases**: Replaced Gist-based version check with GitHub Releases API (`api.github.com/repos/coflyn/Mori`). When an update is available, clicking the button opens the repo page directly.

- **Auto-Check on Startup**: Added `autoCheckUpdate()` that runs when the app launches — if a newer version is detected, it shows a popup modal with a link to open the GitHub repo.

- **SEO & Meta Tags**: Added proper `<title>`, meta description, Open Graph tags, and favicon link to `index.html` for better sharing previews and discoverability.

- **Removed Unused Axios**: Dropped the unused `axios.min.js` CDN script from `index.html`, reducing initial page load.

- **Player Window Listener Leak Fixed**: Video players now properly clean up global `window` event listeners (`mousemove`, `mouseup`, `touchmove`, `touchend`) when slides are re-rendered or unmounted, preventing memory leaks.

- **Double Toast Removed (Auto-Paste)**: Removed Mori's redundant toast notification when silently pasting from clipboard — only the system Android clipboard toast shows now.

- **Toast Layout Fix**: Fixed toast container CSS to use `inline-block` + `white-space: nowrap` so short text stays on a single row instead of wrapping unnecessarily.

- **Hardcoded Locale Format Removed**: Replaced JA-specific hardcoded greeting formatting with a single i18n template that works for all languages.

## Supported Platforms

| Platform                                                                               | Features                 | Platform                                                                            | Features                 |
| :------------------------------------------------------------------------------------- | :----------------------- | :---------------------------------------------------------------------------------- | :----------------------- |
| <img src="https://cdn.simpleicons.org/tiktok/000000" width="16" /> **TikTok**          | Video (No WM) / Photos   | <img src="https://cdn.simpleicons.org/instagram/E4405F" width="16" /> **Instagram** | Reels / Stories / Photos |
| <img src="https://cdn.simpleicons.org/youtube/FF0000" width="16" /> **YouTube**        | MP4 / MP3 (High Quality) | <img src="https://cdn.simpleicons.org/x/000000" width="16" /> **Twitter (X)**       | Video / GIFs             |
| <img src="https://cdn.simpleicons.org/spotify/1DB954" width="16" /> **Spotify**        | Music / Metadata         | <img src="https://cdn.simpleicons.org/pinterest/E60023" width="16" /> **Pinterest** | Video / Images           |
| <img src="https://cdn.simpleicons.org/applemusic/FA243C" width="16" /> **Apple Music** | High Fidelity Audio      | <img src="https://cdn.simpleicons.org/facebook/1877F2" width="16" /> **Facebook**   | Reels / HD Video         |
| <img src="https://cdn.simpleicons.org/soundcloud/FF3300" width="16" /> **SoundCloud**  | Audio Tracks             | <img src="https://cdn.simpleicons.org/threads/000000" width="16" /> **Threads**     | Video / Photos           |
| <img src="https://cdn.simpleicons.org/bandcamp/1DA1F2" width="16" /> **Bandcamp**      | Album / Track Support    | <img src="https://cdn.simpleicons.org/pixiv/0096FA" width="16" /> **Pixiv**         | Gallery / Ugoira to MP4  |

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

- **Multi-Platform Support**: High-quality downloads from TikTok (No Watermark), Instagram (Reels/Photos), YouTube, Twitter (X), Spotify, Pinterest, Apple Music, Facebook, SoundCloud, Threads, **Bandcamp**, and **Pixiv** (including R-18/R-18G).
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
