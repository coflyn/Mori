# Changelog

All notable changes to **Mori** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [4.3.1] - 2026-09-05

### Added
- **Visual Customization Engine**: 4 new animated canvas background shapes (total 8 procedural shapes) with real-time brightness and speed sliders.
- **Glassmorphism Levels & Corner Styles**: Added customizable backdrop blur levels and 4 corner radius presets (Sharp, Smooth, Rounded, Pill).
- **Sound Packs**: Optional tactile UI sound feedback on interactions.

### Changed
- **Security Hardening**: Replaced plain-text client scraper scripts with precompiled native binary bridge (`scrapers.bin`) backed by native Android OkHttp network layer.
- **Media Type Standardization**: Unified media typing and stream representation across all 14 scrapers.

### Fixed
- **Playlist & Batch Downloads**: Fixed progress toast desync and race conditions during multi-item downloads.
- **Filename Sanitization**: Resolved Android `EACCES`/`ENOENT` file path errors caused by special Unicode characters or oversized post titles.
- **iOS Local Media**: Resolved WKWebView local media file URI playback in MoriPlayer.
- **Scrapers**: Fixed YouTube Shorts extraction and Facebook audio streaming.
- **Twitter & Spotify**: Fixed video download streams and improved media gallery indexing.
- **Desktop (Tauri)**: Fixed crash on rapid sequential downloads and corrected Unicode preview rendering.

---

## [4.3.0] - 2026-08-31

### Added
- **Procedural Canvas Backgrounds**: Live dynamic geometric background animations with zero CPU overhead.
- **New Languages & RTL**: Added Arabic (with full Right-to-Left layout support), Russian, Tagalog, and Hindi.
- **Download Controls**: Added interactive **Cancel Download** button during active scraping or fetching.
- **Analytics & Diagnostics**: Download statistics dashboard card tracking completed items, active streams, and estimated bandwidth.
- **Network Suite Enhancements**: Added custom retry limits (1–5x), DNS over HTTPS (DoH) toggling, and configurable toast durations.
- **Storage & File Conflict Rules**: Configurable duplicate file handling (**Auto-rename**, **Overwrite**, **Skip**) and concurrent download slot limiter.
- **Accessibility**: Added adjustable app font sizing, animation speed presets, and compact mode.
- **Android Foreground Service**: Background download service notification preventing OS process kills on large video files.

### Fixed
- **Desktop UI**: Adjusted macOS/Windows bottom navigation bar safe area padding and resolved PIN entry keyboard focus.
- **CVE Patches**: Resolved upstream dependency vulnerabilities (`CVE-2026-13697` in Undici, `CVE-2026-13149` in Brace-Expansion).

---

## [4.2.4] - 2026-08-27

### Added
- **One-Click Playlist & Album Download**: Added "Download All" action for multi-track albums and playlists.

### Changed
- **RedNote (Xiaohongshu)**: Upgraded scraper parsing logic and updated Chrome User-Agent header constants.

### Fixed
- **Security & Stability**: Hardened auth modal from freeze bugs, added batch limits, sanitization against XSS in scraped metadata, and auto-fallback for failed storage calculations.

---

## [4.2.3] - 2026-08-24

### Added
- **Android Quick Save Overlay (`ShareActivity`)**: Direct download overlay dialog accessible straight from the Android native Share Sheet without opening the main app window.
- **Spotify Link Resolution**: Added seamless parsing for Spotify track, album, and playlist URLs.
- **YouTube Playlist Support**: Added multi-track playlist link parsing.
- **Multi-Language UI Expansion**: Added localized string keys across result dialogs and share activity.

### Fixed
- Upstream vulnerability patch (`CVE-2026-59873` in tar).

---

## [4.2.2] - 2026-08-21

### Added
- **Apple Music Support**: Full playlist and album track extraction.
- **Modular Internal Architecture**: Decoupled UI logic, scraper bridges, and download modules for enhanced maintainability.

### Fixed
- Optimized native Android feature bridges and reduced bundle footprint.

---

## [4.2.1] - 2026-08-16

### Added
- **PIN Lock Authentication**: Added 4-digit numeric PIN fallback alongside native Biometrics (Fingerprint / Face ID).
- **Batch Download Manager**: Initial multi-item download queue system.
- **macOS & Android Documentation**: Added troubleshooting steps for macOS Gatekeeper and Android Play Protect.

### Fixed
- Fixed audio player stopping when the screen locks or app moves to the background on Android.
- Refined Settings layout and tactile interactions.

---

## [4.2.0] - 2026-08-01

### Added
- **Desktop Support (macOS & Windows)**: Powered by Tauri with native Rust binary helpers (`tauri_fetch_bytes`, `tauri_save_bytes_file`).
- **External URL Handling**: Native browser opener (`tauri_open_url`) for documentation, bug reports, and GitHub repository links in default browsers.
- **Smart Update Checker**: Semver version comparison (`isNewerVersion`) preventing redundant update prompts when app is up-to-date.
- **Desktop PDF Gallery Export**: Direct export of scraped photo sets into `~/Downloads/Mori`.
- **Standardized Filename Templates**: Streamlined filename options ("Title Only" set as default).

### Fixed
- **Pixiv Ugoira WKWebView**: Fixed video preview by forcing high-resolution thumbnail sequence rendering over unsupported WKWebView video streams.
- **macOS Update Parsing**: Fixed `res.data` fallback for `tauri_http_request`.
- **PDF Generator**: Fixed missing `CHROME_UA` import in `ui.js`.
- **Player Fallback**: Added video player image thumbnail fallback on media load errors.
- **WhatsApp Bug Report**: Routed link through `openExternalUrl` to prevent Desktop WKWebView pop-up blocks.
- **Desktop Environment Filtering**: Hid mobile-only settings (Biometrics, Haptics) on macOS and Windows.

---

## [4.1.0] - 2026-07-25

### Added
- **Modular Scraper Suite**: Decoupled scrapers into 14 isolated platform-specific modules.
- **Domain Manager Modules**: Dedicated managers for auth, history, settings, and downloads.
- **Clean Subdirectory Structure**: Organized codebase into `vendor/`, `components/`, `i18n/`, and `utils/`.
- **Centralized HTTP Engine**: Auto-retry (3x) with exponential backoff and Anti-403 header protection.
- **Monotonic Progress Toast**: Smooth percentage tracking for media downloads with silent recovery and responsive overflow guards.
- **Hardware Back Button**: Added double-tap exit guard for Android.
- **Scraper Engine Status Page**: Added status indicator and diagnostic overview in Settings.
- **IPA Build Support**: Added iOS IPA build configuration for sideloading.

### Fixed
- Fixed Douyin multi-image photo slideshow parsing.
- Fixed `content://` URI bug in local file playback.
- Restored Android WebView autoplay in `MainActivity.java`.
- Enhanced canvas and memory resource cleanup on navigation.
- Fixed RedNote `xhslink.cn` redirect handling.

---

## [4.0.0] - 2026-07-21

### Added
- **iOS Platform Support**: Added full Xcode project structure, native Capacitor plugins, and platform-agnostic file system handling via `@capacitor/filesystem`.
- **5-Tier Settings Hierarchy**: Restructured all settings into 5 sub-pages (General, Storage & Download, Look & Feel, Network & Performance, Advanced).
- **Network & Performance Diagnostics**: Added Preferred Server selection, User-Agent switcher, request timeouts, Anti-403 header guard, cellular data warning, SSL error bypassing, Data Saver mode, and interactive latency ping tool.
- **Tactile Haptic Feedback**: Integrated native `@capacitor/haptics` with fallback direct motor vibration across all interactive UI elements.
- **Hardened Biometric Privacy Lock**: Upgraded biometric protection to cover History & Settings with real-time state sync and automatic background re-locking.
- **Keep Screen Awake**: Integrated Web Screen Wake Lock API.
- **Startup Update Checker**: Auto-check GitHub Releases API on launch.
- **Download Completion Sound**: Added Web Audio API triangle-wave bell chime feedback upon successful download.
- **Native Save to Gallery**: Integrated `@capacitor-community/media` to automatically save downloaded media directly to iOS Camera Roll and Android Gallery.
- **Scheduled Backups & Auto-Purge**: Added configurable automated data backups and retention periods (Off, 1, 7, 30, 90 Days).

### Fixed
- Fixed SnapTik API Object-URL data structure changes and added defensive `parseJsonResponse` error handling.
- Resolved WKWebView local file path resolution via `Filesystem.getUri()` and `Capacitor.convertFileSrc()`.
- Expanded history item deletion touch target (32px x 32px) for improved mobile usability.

---

## [3.9.0] - 2026-07-20

### Added
- **Bilibili Overhaul**:
  - Added manual HTML redirect parsing for `bili.im` and `b23.tv` short URLs.
  - Resolved season-only URLs (`/play/sid`) to episode IDs via Bilibili OGV episodes API.
  - Upgraded to Bilibili OGV v2 API for multi-resolution streams (144p–480p) and high-bitrate audio.
  - Injected Referer headers on DASH URLs to fix 403 Forbidden corruptions.
- **Pixiv Ugoira Extraction Engine**:
  - Implemented login-independent detection using `meta-preload-data` and `ugoira_meta` API.
  - Added live animated GIF previews for Ugoira artworks in player UI.
  - Supported export formats: MP4, GIF, and ZIP (full frame archive).
  - Integrated `CapacitorHttp` Blob downloader with Referer routing to bypass CDN hotlink protection.
- **Dual-Scraper Server Architecture**:
  - YouTube: Server 1 (`ytmp3.gg`) & Server 2 (`ytmp3.mobi`)
  - TikTok: Server 1 (`TikTokIO`) & Server 2 (`SnapTik`)
  - Instagram: Server 1 (`Indown`) & Server 2 (`DownReels`)
  - Twitter/X: Server 1 (`Tweeload`) & Server 2 (`TVD`)
  - Spotify: Server 1 (`SpotiDown`) & Server 2 (`SpotMate`)

### Fixed
- Enhanced filename sanitization: Stripped `#`, `%`, `&`, and special symbols to prevent Android `EACCES`/`ENOENT` errors.
- Enforced 60-character title limit and stripped non-standard Unicode characters to prevent filesystem path overflow.

---

## [3.8.0] - 2026-07-18

### Added
- Douyin photo slideshow support (`aweme_type 2`, swipeable gallery).

### Changed
- TikTok scraper migrated from SnapTik to TikTokIO (regex parsing without DOM overhead).
- Consolidated User-Agent header constants across all requests (`CHROME_UA`).

### Fixed
- Cleaned Instagram query parameters before scraping.
- Added Douyin thumbnail fallback on CDN timeout.
- Stripped TikTok URL tracking parameters automatically.

---

## [3.7.0] - 2026-07-18

### Added
- Added support for Bilibili, Douyin, and RedNote (Xiaohongshu).
- Implemented DASH video + audio stream extraction for Bilibili (Mainland & International).
- Added direct router data parsing for Douyin (Watermarked & No-Watermark).
- Added RedNote media extraction using seekin.ai server download action.

### Fixed
- Resolved infinite loading on Bilibili, Douyin, and RedNote previews:
  - Bilibili: Converted to static image preview to prevent player overhead.
  - Douyin: Configured to play directly from CDN watermark stream to prevent 302 redirect header-stripping.
  - RedNote: Implemented native 3MB chunk download via `CapacitorHttp` with local Object URL generation.

---

## [3.6.0] - 2026-07-16

### Added
- Update Checker: Switched from Gist to GitHub Releases API with auto-check popup.
- SEO & Metadata: Added OpenGraph, meta tags, and favicon.

### Changed
- Instagram: Bypassed Cloudflare 403 via custom User-Agent and headers.
- Pixiv: Migrated fallback to `pixiv.re` with binary search via `CapacitorHttp`.

### Fixed
- Cleaned up player window listeners on slide unmount to prevent memory leaks.
- Removed double toast on auto-paste and forced single-row toast layout.
- Completed Japanese (JA) localized strings and removed hardcoded locale formats.
- Dropped unused `axios` dependency and duplicate CSS rules.

---

## [3.5.0] - 2026-05-16

### Added
- Glassmorphism Dropdowns: Premium theme-aware selectors with blur effects and larger touch targets.
- Quick Settings Dashboard: Grid layout for instant toggle access (Dark Mode, Incognito, etc.).
- Dynamic Color Accents: Full UI accent adaptation with dynamic theming.
- Reactive Auto-Loop and Auto-Play media logic.
- Adaptive toast notifications with text wrapping.

### Changed
- Reorganized settings hierarchy: Moved "App Font" into General section.
- Enhanced platform icons for Facebook, Pinterest, and Developer section.

---

## [3.4.0] - 2026-05-15

### Added
- **Biometric Privacy Lock**: Native Fingerprint / Face ID protection for download history.
- **Export & Import Data**: Full portability via JSON backup and restore.
- **Auto-Clear History**: Automated purge of history entries older than 30 days.
- **Biometric Security Verification**: Authentication required to disable Privacy Lock.
- **Onboarding Guide**: Interactive icon-based startup guide with "Don't show again" option.
- **Offline Badge**: Smart local detection displaying 'OFFLINE' badge for downloaded files.
- **Smart Path Presets**: Interactive chips for quick storage location setup.
- **Configurable Auto-Paste**: Toggleable clipboard detection on app resume with shared-link safety priority.

### Fixed
- SnapSave & Facebook: Added async polling for high-quality render tokens.
- Unified image loading engine with proxy & `CapacitorHttp` fallbacks.
- History-aware cache cleanup protecting active thumbnails during cache wipes.
- Fixed UI layout clipping and navigation z-index stacking.

---

## [3.3.0] - 2026-05-14

### Added
- **Dual-Path Storage**: Separate folder configurations for Video and Music downloads.
- **Storage Path Presets**: Tactile chips and 1-tap reset feature for quick storage setup.
- **Privacy Pro Suite**: Incognito Mode (no history saved) and Data Saver (disable thumbnails).
- **Smart Storage**: 50MB auto-clear cache threshold and automated filename cleanup.
- **Help & Support Center**: Modernized in-app support documentation.

### Changed
- Refreshed UI aesthetics with minimalist folder icons and 4px tactile drop shadows.

---

## [3.2.0] - 2026-05-13

### Changed
- **Migration to Pure Standalone**: Removed redundant `/scrapers` backend folder and `server.js`.
- **Client-Side Scraping**: App runs 100% locally via `CapacitorHttp`, eliminating server hosting dependency.

### Fixed
- **Automatic Cache Cleanup**: Implemented physical file deletion for cached thumbnails when items are removed from history.
- **Gallery Visibility Fix**: Added unique filename tags (`_VIDEO_`/`_MP3_`) and uppercase extensions (`.MP4`) for Android Media Scanner recognition.
- Added User-Agent and Referer headers for YouTube and Twitter downloads to prevent corrupted downloads.
- Fixed modal slider navigation button alignments and centered slide indicators.

---

## [3.1.0] - 2026-05-13

### Added
- **Bandcamp Support**: High-quality audio and metadata extraction.
- **Pixiv Support**: Automatic Ugoira animation to MP4 conversion.
- **PDF Gallery Export**: Client-side PDF generation using `pdf-lib` with parallel downloads and fast base64 encoding.
- **Hybrid Mode PDF**: Support for mixed photo and video posts.
- **TikTok Live Photos & Slideshows**: Enhanced preview detection and multi-photo parsing.
- **Full Localization**: 100% i18n localization across all UI labels and toasts (EN, ID, JA).

### Fixed
- Fixed redundant toast notifications on Android 13+.
- Filtered external logos and site assets from Instagram thumbnail previews.
- Unified all export paths into `Download/Mori`.

---

## [3.0.0] - 2026-05-12

### Added
- **MoriPlayer**: Custom-built media player engine with double-tap seeking and smart gesture controls.
- **Native Gesture Navigation**: Fluid swipe gestures to switch between Home, History, and Settings.
- **Music UI**: Vertical stacking layout with thumbnail display in History modal.
- **Interactive Tactility**: Interactive shadow animations on supported platform chips.

### Changed
- **Modular ES6 Architecture**: Refactored monolithic `script.js` into modular files (`ui.js`, `scrapers.js`, `utils.js`, `i18n.js`).
- Improved filename generator with sanitized titles and spaces for readability.
- Renamed "Configure" to "Analyze" for improved UX clarity.

### Fixed
- Added second-pass URL resolver for YouTube `ytdown` proxy links.
- Implemented network reconnection handling with "Connection lost" alerts.
- Updated "Wipe All Data" to perform recursive directory cleanup.

---

## [2.0.0] - 2026-05-11

### Added
- **Expanded Platforms**: Added support for SoundCloud, Threads, Facebook, Apple Music, and Pinterest.
- **Mocha & Cream Theme**: Aesthetic color palette with soft contrast.
- **Multi-Language Support**: Initial localization for English, Indonesian, and Japanese.
- **Android Share Intent**: Support for receiving URLs directly from the system share sheet.

---

## [1.5.0] - 2026-05-10

### Added
- **Platform Expansion**: Added support for Twitter/X and Spotify.
- **Enhanced Sharing**: Improved share capabilities and cookie handling.

---

## [1.0.0] - 2026-05-10

### Added
- **Initial Release**: Minimalist cross-platform media downloader.
- **Internal History Management**: On-device history tracking with thumbnail previews.
- **Clipboard Auto-Detection**: Instant auto-paste and scrape when valid URL is detected on clipboard.
- **Core Platforms**: YouTube, TikTok, and Instagram media extraction.

---

Developed with ❤️ by coflyn.  
GitHub: https://github.com/coflyn  
Instagram: @\_coflyn
