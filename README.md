<p align="center">
  <img src="assets/icon.png" width="128" alt="Mori Logo">
</p>

<h1 align="center">Mori - Your Simple Media Downloader</h1>

<p align="center">
  <img src="https://img.shields.io/badge/Version-v3.5.0-brown?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/Platform-Android-3DDC84?style=flat-square&logo=android&logoColor=white" alt="Platform">
</p>

Mori is a beautiful and very easy-to-use app that helps you save your favorite photos and videos from platforms like TikTok, Instagram, YouTube, Twitter (X), Spotify, Pinterest, Apple Music, Facebook, SoundCloud, and Threads. Built with a **Standalone Architecture**, Mori performs all scraping directly on your device for maximum privacy and speed, without requiring a backend server. With its clean **"Mocha & Cream"** design, Mori makes downloading feel fast and premium.

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

## What's New in v3.5.0 (Latest)

- **Quick Settings Dashboard**: Access common toggles faster. Added a tactile 4-item grid at the top of the Settings menu for instant control over **Dark Mode, Incognito, Auto-Paste**, and **Data Saver**.
- **Custom App Typography**: Personalized reading experience. Choose between premium font families: **Plus Jakarta Sans** (Modern), **Default** (Inter), **Serif** (Classic), **Mono** (Tech), and **Display** (Bold).
- **Auto-Play Media Toggle**: Control your viewing experience. A new "Auto-Play" setting allows you to enable or disable automatic media playback in the analysis slider and history browser.
- **Dynamic Color Accents**: Make Mori yours! Introduced a premium theme engine with selectable accent colors: **Classic (Gold), Ocean (Blue), Forest (Green), Royal (Purple)**, and **Sunset (Orange)**.
- **Auto-Loop Media Control**: Tailor your playback. A new toggle allows you to enable or disable automatic looping for both video and audio players globally.
- **Adaptive Toast Notifications**: Better readability for long messages. Mori's notification system now supports multi-line text with auto-wrapping, ensuring important feedback is never cut off.
- **Next-Gen Wi-Fi Protection**: Save your data plan more effectively. The "Wi-Fi Only" toggle now includes robust detection for high-speed mobile networks, including **5G** and **4.5G**, ensuring zero data leakage.
- **Auto-Download Link**: The ultimate zero-click experience. When enabled, Mori intelligently detects supported links from your clipboard on startup or resume and triggers the analysis engine automatically.
- **Custom Filename**: Organize your library your way. Choose between **Default** (Timestamped), **Title Only**, **Title + Platform**, or **Title + Date** naming conventions.
- **Tiered Settings Navigation**: Redesigned the settings interface into five distinct categories for a cleaner, "Pro" application feel.
- **Accent-Aware UI**: The entire interface, from icons to progress bars, now dynamically adapts to your selected Color Accent for a cohesive premium experience.
- **Premium Glassmorphism Dropdowns**: Refined the settings interface with sleek, semi-transparent menus and increased hit areas for better mobile interaction.
- **Improved Settings Hierarchy**: Reorganized settings sections, relocating "App Font" to the General menu for more intuitive navigation.
- **Enhanced Visual Consistency**: Synchronized social media and developer icons for a more balanced and professional "State-of-the-art" look.

## Supported Platforms

| Platform | Features | Platform | Features |
| :--- | :--- | :--- | :--- |
| <img src="https://cdn.simpleicons.org/tiktok/000000" width="16" /> **TikTok** | Video (No WM) / Photos | <img src="https://cdn.simpleicons.org/instagram/E4405F" width="16" /> **Instagram** | Reels / Stories / Photos |
| <img src="https://cdn.simpleicons.org/youtube/FF0000" width="16" /> **YouTube** | MP4 / MP3 (High Quality) | <img src="https://cdn.simpleicons.org/x/000000" width="16" /> **Twitter (X)** | Video / GIFs |
| <img src="https://cdn.simpleicons.org/spotify/1DB954" width="16" /> **Spotify** | Music / Metadata | <img src="https://cdn.simpleicons.org/pinterest/E60023" width="16" /> **Pinterest** | Video / Images |
| <img src="https://cdn.simpleicons.org/applemusic/FA243C" width="16" /> **Apple Music** | High Fidelity Audio | <img src="https://cdn.simpleicons.org/facebook/1877F2" width="16" /> **Facebook** | Reels / HD Video |
| <img src="https://cdn.simpleicons.org/soundcloud/FF3300" width="16" /> **SoundCloud** | Audio Tracks | <img src="https://cdn.simpleicons.org/threads/000000" width="16" /> **Threads** | Video / Photos |
| <img src="https://cdn.simpleicons.org/bandcamp/1DA1F2" width="16" /> **Bandcamp** | Album / Track Support | <img src="https://cdn.simpleicons.org/pixiv/0096FA" width="16" /> **Pixiv** | Gallery / Ugoira to MP4 |

## Built With

- **JavaScript (ES6+)**: Core application logic and scraping engine.
- **HTML5 & CSS3**: Custom design system without bloated frameworks.
- **CapacitorJS**: Native Android bridge for filesystem, clipboard, and biometrics.
- **pdf-lib**: Client-side PDF generation and bundling.

## Previous Highlights (v3.4.0)

- **Privacy Lock (Biometric)**: Secure your History tab with the ultimate convenience. Mori now supports native **Biometric (Fingerprint/FaceID)** authentication, ensuring your private downloads stay private.
- **Export/Import Data**: Full data portability is here! Backup your entire Mori ecosystem (History, Settings, and Paths) to a JSON file and restore it on any device via the system Share intent.
- **Auto-Clear History**: Keep your app lightweight and organized. Mori can now automatically purge history entries older than 30 days, keeping your experience fresh and focused.
- **Biometric Disable Security**: Added a critical safety layer—native authentication is now required to disable the Privacy Lock, preventing unauthorized access to your history settings.
- **Onboarding User Guide**: New users are now greeted with a sleek, icon-based guide on startup (with a "Don't show again" option), ensuring everyone knows how to get the most out of Mori.
- **Premium Custom Dropdowns**: Completely replaced native browser selectors with theme-aware, glassmorphism-inspired dropdowns. Enjoy a cohesive aesthetic across Language and Lock Type settings.
- **Smart Local Detection (Offline Badge)**: Mori now intelligently cross-references your downloads with your local history. If a file is already on your phone, a premium **"OFFLINE"** badge appears, allowing instant local playback without re-downloading.
- **Smart Path Presets**: Refined the dual-path download system (Video/Music) with interactive chips and a reset feature for faster configuration.
- **SnapSave & Facebook Robustness**: Implemented an async polling mechanism (up to 15 attempts) to resolve backend rendering tokens for high-quality Facebook and SnapSave links.
- **Unified Image Loading Engine**: Re-engineered the media previewer with a redundant loading system via proxy (`weserv.nl`) or authenticated `CapacitorHttp` blobs.
- **Zero-Stall Download Engine**: Refined "Processing" logic bypasses unnecessary polling for direct media links, ensuring instant downloads.
- **Configurable Auto-Paste**: Toggleable clipboard detection on app resume.
- **Shared Link Priority**: Intelligent safety window ensures shared intents always take precedence over the clipboard.
- **History-Aware Cache Cleanup**: Refined the "Auto-Clear Cache" system to protect thumbnails belonging to your history items while purging orphans.
- **Settings Preservation**: Improved "Wipe All Data" security—resets history and cache while strictly preserving critical preferences.
- **Layout Stabilization**: Resolved clipping issues in Settings and perfected the navigation z-index for a seamless experience.
- **Improved Toast System**: Standardized localized feedback for all major settings, including unique notifications for Cache and History auto-clear.

## Previous Highlights (v3.3.0)

- **Dual-Path Storage System**: Split download settings into **Video Path** and **Music Path**, allowing users to organize their gallery and music library independently.
- **Intelligent Path Presets**: Added tactile **Preset Chips** (Mori, Music, Videos) and a **Reset Default** feature in the path picker modal for faster configuration.
- **Privacy & Pro Features**: Introduced **Incognito Mode** (disable history) and **Data Saver Mode** (hide thumbnails) for maximum control over privacy and data.
- **Smart Auto-Clear Cache**: Intelligent background cleanup that automatically purges thumbnail cache only when it exceeds **50MB**.
- **Modernized History Actions**: Redesigned the "Edit", "Clear All", and "Done" buttons with a **Minimalist** aesthetic, featuring tactile `translateY` feedback.
- **Help & Support Center**: Added a new dedicated section in Settings featuring a **"How to Use"** guide for new users and an **"About Mori"** section.
- **Integrated Feedback System**: Added real-time Toast notifications for settings changes, including Auto-Clear status updates.
- **Minimalist UI Polish**: Refined modal aesthetics with folder icons, tactile 4px shadows, and modernized typography across the interface (EN/ID/JP).

## Previous Highlights (v3.2.0)

- **Pure Standalone Architecture**: Completely eliminated the backend server dependency. Mori now operates as a 100% client-side application using `CapacitorHttp` to perform all scraping directly on your device.
- **Frontend Asset Reorganization**: CSS and JS files are now properly organized into `public/css/` and `public/js/` directories for better maintainability.
- **MoriPlayer Extraction**: The custom 250-line video player logic was extracted from `ui.js` into its own dedicated `player.js` module.
- **YouTube Stability & Gallery Sync**: Switched to a robust parallel engine (`ytmp3.mobi`) and implemented a unique tagging system (`_VIDEO_`/`_MP3_`) to ensure all downloads are instantly recognized by the Android Media Scanner.
- **Smart Local Preview**: Added a local file detection system in the History modal. Mori now identifies if a video/audio is already on your phone and plays it instantly with a new **"OFFLINE"** badge, saving data and time.
- **Enhanced Gallery Slider**: Re-engineered the media previewer with side-aligned navigation buttons and a top-centered indicator to prevent overlap with video player controls.
- **Storage & Performance Optimization**: Refactored the history system to store thumbnails as small JPG files in the app cache instead of Base64 strings.
- **Automatic Cache Cleanup**: Implemented a smart deletion system that removes physical thumbnail files from the app cache when history items are deleted (individually or via "Clear All"), preventing storage swelling while keeping your Gallery downloads 100% safe.
- **Privacy & Safety Improvements**: Refined "Wipe All Data" and "Clear Cache" to strictly preserve user media files. Updated all app documentation to ensure users feel secure when managing their storage.
- **UI & UX Polish**: Resolved visual regressions, including a cleaner "Total Media Size" icon, improved blurred background effects, and a new Sociabuzz donation link in the Developer section.

## Previous Highlights (v3.1.0)

- **Bandcamp Integration**: High-fidelity audio downloads from Bandcamp albums and tracks, complete with metadata and automatic cover art extraction.
- **Pixiv Gallery Support**: Full support for Pixiv artwork and multi-page galleries. Automatically handles **Ugoira** (animated) content and converts them to high-quality MP4.
- **Standalone PDF Export**: Integrated a high-performance PDF engine (`pdf-lib`) to bundle image galleries (Instagram carousels, Pixiv albums, TikTok photos) into a single PDF document directly on your device.
- **Hybrid PDF Mode**: Intelligently detects mixed content; if a post has both photos and videos, Mori can filter out the videos and export all photos as a clean PDF document.
- **Optimized Download Engine**: Parallel chunked processing for gallery downloads, making large PDF exports up to 3x faster.
- **TikTok Live Photo Support**: Enhanced detection for TikTok photo-mode and Live Photos, converting them to standard photos for easier previewing and PDF bundling.
- **UI & UX Refinements**:
  - **Double-Toast Fix**: Resolved redundant notification issues on Android 13+ by synchronizing Mori toasts with system clipboard alerts.
  - **Directory Standardization**: All PDF exports are unified into the `Download/Mori` public directory for easy access.
  - **Standalone Architecture**: Moved heavy processing to the client-side for faster, more private media management.
  - **Full i18n Localization**: Audited and localized 100% of the app's notifications, toasts, and UI labels across English, Indonesian, and Japanese.
  - **Instagram Asset Filtering**: Multi-layer domain-based filtering to eliminate InDown.io site banners and hero images from search results and history.

## Previous Highlights (v3.0.0)

- **MoriPlayer (Custom Media Engine)**: A fully custom-built video and audio player with "Mocha & Cream" aesthetics. Features include:
  - **Double-Tap Seek**: Instant 5s jump forward/backward by double-tapping sides (YouTube-style).
  - **Smart Interaction**: Click once to show controls, click again to toggle play/pause for a professional feel.
  - **Natural Aspect Handling**: Automatically adapts to portrait or landscape videos.
  - **Gesture Scrubbing**: Precise progress control with smooth, draggable seekers.
- **Native Swipe Navigation**: Fluid gesture-based navigation between Home, History, and Settings. Swipe left/right to switch tabs with built-in conflict detection for sliders and players.
- **Intelligent URL Resolver**: Integrated a second-pass resolver for YouTube and ytdown links, ensuring high-quality media downloads instead of metadata fragments.
- **Smart Filenames**: Downloaded files now use sanitized scraper titles with spaces for better readability in your file manager.
- **History Modal Revamp**: Implemented vertical stacking (high-res thumbnail on top of player) in the History modal for a cinematic music preview experience.
- **Premium Platform UI**: Added interactive shadow animations to "Supported Platforms" chips for better tactility and visual feedback.
- **Advanced Network Handling**: Real-time error detection for connection drops during downloads, providing user-friendly "Connection lost" alerts.
- **Recursive Wipe Data**: The "Wipe All Data" feature now performs a deep, recursive clean of the `Download/Mori` directory for total privacy.
- **Smart Video Thumbnails**: Refined frame extraction logic to accurately capture the middle of the video (`duration / 2`) across all mobile devices.
- **UX Clarity**: Standardized i18n keys and renamed "Configure" to "Analyze" for a more intuitive user flow.
- **Smart Instagram Fix**: Optimized Indown.io scraping with automatic `igsh` parameter stripping to resolve the 403 Forbidden error.
- **Automated Update Checking**: Real-time version verification via GitHub Gist integration.
- **Native Bug Reporting**: Direct developer support via WhatsApp with automated technical reporting.
- **Storage Visibility**: Fully migrated to Android's Public Storage (`Download/Mori`) for instant file access.

## Previous Highlights (v2.0.0)

- **Unified Mocha & Cream Theme**: Carefully curated color palette for both Light and Dark modes.
- **Global Multi-Language**: Full support for **English**, **Indonesian**, and **Japanese**.
- **Skeleton Loading Aesthetic**: Premium shimmering effects during link analysis.
- **SoundCloud & Threads Support**: High-fidelity scraping and native Android integration.
- **Download Proxy Bypass**: Server-side proxy to handle session-locked downloads and Cloudflare restrictions.

## Key Features

- **Multi-Platform Support**: High-quality downloads from TikTok (No Watermark), Instagram (Reels/Photos), YouTube, Twitter (X), Spotify, Pinterest, Apple Music, Facebook, SoundCloud, Threads, **Bandcamp**, and **Pixiv**.
- **Live Media Previews**: View images, play videos, and listen to audio directly within the app before downloading.
- **Standalone PDF Document Export**: Convert image galleries from any platform into high-quality PDF files for offline viewing.
- **Private History Manager**: Downloaded files are managed internally with local playback support.
- **Share Intent Integration**: Send links directly to Mori from other apps via the system Share menu.
- **Intelligent Error Handling**: Real-time feedback for IP blocks or network issues via custom Toast notifications.
- **Premium Minimalist UI**: A distraction-free interface with smooth transitions and a native feel.

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
- **On Web**: Falls back to a local Node.js proxy server for development.

### Building the APK

To generate the latest version (e.g., Mori v3.5.0.apk), run:
`npx cap sync android && cd android && ./gradlew assembleDebug`

---

Developed with ❤️ by coflyn.
GitHub: https://github.com/coflyn
Instagram: @\_coflyn

## License

Mori is released under the **MIT License**. Feel free to use, modify, and distribute it.
