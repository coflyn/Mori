# Mori - Your Simple Media Downloader (v2.0.0)

Mori is a beautiful and very easy-to-use app that helps you save your favorite photos and videos from platforms like TikTok, Instagram, YouTube, Twitter (X), Spotify, Pinterest, Apple Music, and Facebook. With its clean **"Mocha & Cream"** design, Mori makes downloading feel fast and premium.

## What's New in v2.0.0

- **Unified Mocha & Cream Theme**: A carefully curated color palette for both Light and Dark modes (`#fffbf2` & `#1a1917`).
- **Dynamic Greeting & Stats**: Personalized time-based greetings and quick insights into your download history.
- **Global Multi-Language**: Full internationalization for **English**, **Indonesian**, and **Japanese** via a dropdown menu.
- **Custom Premium UI Components**: Replaced native browser elements with custom-built components, including a premium language dropdown and layout-optimized typography for CJK (Chinese, Japanese, Korean) characters.
- **Global Footer Aesthetic**: The signature _"Simplicity is the ultimate sophistication"_ quote is now a consistent footer across all pages.
- **Detailed History Manager**: View your downloads with precise date and time timestamps (HH:MM) and new batch management tools.
- **Skeleton Loading Aesthetic**: Premium shimmering effects during link analysis for a more responsive feel.
- **Enhanced Platform Support**: Optimized scrapers for **Pinterest** (new SVG icons), **Apple Music**, and **Facebook**.
- **Robust Share Intent**: Smarter link detection and auto-pasting, even from a cold start on Android.
- **SoundCloud & Threads Support**: Added high-fidelity scraping for SoundCloud (via Klickaud/SSE Proxy) and Threads (via Threadster), including native Android support.
- **Download Proxy Bypass**: New server-side proxy to handle session-locked downloads and Cloudflare restrictions for smoother media retrieval.
- **Refined Brand Icons**: Updated high-fidelity SVG icons for SoundCloud and Threads to match their premium brand identity.
- **Smart Media Detection**: Advanced logic to accurately distinguish between photos and videos on platforms like Threads and Twitter, ensuring the correct player/viewer is used.
- **Optimized Audio Previews**: Standardized single-thumbnail previews for SoundCloud, Spotify, and Apple Music for a cleaner home and history page experience.
- **Advanced Storage Control**: Separate options for clearing temporary cache and wiping all app data.
- **Smart Domain Normalization**: Support for Twitter/X alternatives like `fixupx`, `fxtwitter`, `vxtwitter`, and `nitter`.
- **Auto-Config from Share**: Automatically analyzes links shared from other apps for a seamless hands-free experience.
- **Contextual Error Guidance**: Real-time advice for IP blocks (VPN suggestions) and outdated scrapers.
- **Interactive Loading System**: Engaging rotating phrases and shimmering effects to enhance the waiting experience.

## Key Features

- **Multi-Platform Support**: High-quality downloads from TikTok (No Watermark), Instagram (Reels/Photos), YouTube, Twitter (X), Spotify, Pinterest, Apple Music, Facebook, SoundCloud, and Threads.
- **Live Media Previews**: View images, play videos, and listen to audio directly within the app before downloading.
- **Private History Manager**: Downloaded files are managed internally with local playback support.
- **Share Intent Integration**: Send links directly to Mori from other apps via the system Share menu.
- **Intelligent Error Handling**: Real-time feedback for IP blocks or network issues via custom Toast notifications.
- **Premium Minimalist UI**: A distraction-free interface with smooth transitions and a native feel.

## How to Use

1. Copy a link from a supported platform or Share it directly to Mori.
2. Use the **Paste** button or let the auto-detection handle the link.
3. Tap **Configure** to analyze the content.
4. Preview the media (swipe through carousels if available).
5. Choose your format and tap **Download**.
6. Files are saved to your internal history for offline access.

## For Developers

Mori is built using Capacitor and Vanilla JS for high performance.

- **On Android**: Uses `CapacitorHttp` to bypass CORS and download directly from the device IP.
- **On Web**: Falls back to a local Node.js proxy server for development.

### Building the APK

To generate the latest version (e.g., Mori v2.0.0.apk), run:
`npx cap sync android && cd android && ./gradlew assembleDebug`

---

Developed with ❤️ by coflyn.
GitHub: https://github.com/coflyn
Instagram: @\_coflyn
