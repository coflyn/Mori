# Mori - Minimalist Media Downloader (v1.5.0)

Mori is a high-performance, minimalist application designed to download media from TikTok, Instagram, YouTube, Twitter (X), and Spotify. It features a sleek, minimalist design and focuses on a "native-first" experience where files are managed within a private internal history.

## Key Features

- **TikTok Support**: High-quality video downloads (no watermark) and MP3 extraction.
- **Instagram Support**: Download Reels, Photos, and Carousels with intelligent preview support.
- **Twitter (X) Support**: Extract videos and images directly from tweets.
- **YouTube Support**: Support for various video resolutions and high-bitrate audio.
- **Spotify Support**: Download tracks with metadata and cover art.
- **Live Media Previews**: View images, play videos, and listen to audio directly within the app before downloading.
- **Private History Manager**: Downloaded files are managed internally with local playback support.
- **Share Intent**: Send links directly to Mori from other apps via the system Share menu.
- **Intelligent Error Handling**: Real-time feedback for IP blocks, outdated scrapers, or network issues via custom Toast notifications.
- **Minimalist Premium UI**: A distraction-free interface with a smooth dark mode and premium animations.

## How to Use

1. Copy a link from a supported platform or Share it directly to Mori.
2. Use the **Paste** button or let the auto-detection handle the link.
3. Tap **Configure** to analyze the content.
4. Preview the media (swipe through carousels if available).
5. Choose your format and tap **Download**.
6. Files are saved to your internal history for offline access.

## Development and Build

Mori is built with Capacitor and Vanilla JS. It uses a "Native-Proxy" hybrid approach:

- **On Android**: Uses `CapacitorHttp` to bypass CORS and download directly from the device IP.
- **On Web**: Falls back to a local Node.js proxy server for development.

### Building the APK

To generate the latest version (e.g., Mori v1.5.0.apk), run:
`npx cap sync android && cd android && ./gradlew assembleDebug`

Developed by coflyn.
GitHub: https://github.com/coflyn
Instagram: @\_coflyn
