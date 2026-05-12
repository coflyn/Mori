# Mori - Your Simple Media Downloader (v3.1.0)

Mori is a beautiful and very easy-to-use app that helps you save your favorite photos and videos from platforms like TikTok, Instagram, YouTube, Twitter (X), Spotify, Pinterest, Apple Music, Facebook, SoundCloud, and Threads. With its clean **"Mocha & Cream"** design, Mori makes downloading feel fast and premium.

## What's New in v3.1.0 (Latest)

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

To generate the latest version (e.g., Mori v3.1.0.apk), run:
`npx cap sync android && cd android && ./gradlew assembleDebug`

---

Developed with ❤️ by coflyn.
GitHub: https://github.com/coflyn
Instagram: @\_coflyn
