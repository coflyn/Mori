# Mori - Minimalist Media Downloader

Mori is a high-performance, minimalist application designed to download media from TikTok, Instagram, and YouTube. It features a clean, brutalist design and focuses on a "native-first" experience where files are managed within a private internal history.

## Key Features

- TikTok Support: High-quality video downloads (no watermark) and MP3 extraction.
- Instagram Support: Seamlessly download Reels and Photos (smart thumbnail detection).
- YouTube Support: Support for various video resolutions and high-bitrate audio (M4A/MP3).
- Private History Manager: Downloaded files are managed internally within the app for privacy and fast access.
- Native Clipboard: Seamlessly paste links directly from your system clipboard.
- Intelligent Error Handling: Real-time feedback for IP blocks (VPN detection), outdated scrapers, or network issues via custom Toast notifications.
- Minimalist Brutalist UI: A distraction-free monochrome interface with a premium dark mode.
- Privacy Focused: No tracking, no ads, and lightweight performance.

## How to Use

1. Copy a link from TikTok, Instagram, or YouTube.
2. Open Mori and use the Paste button to quickly insert your link.
3. Tap Configure and wait for the platform detection.
4. Choose your preferred format and tap Download.
5. The file will be saved to your internal history and you will be automatically redirected to your browser to complete the download.

## Development and Build

Mori is built with Capacitor and Vanilla JS. It uses a "Native-Proxy" hybrid approach:
- On Android: Uses CapacitorHttp to bypass CORS and download directly from the device IP.
- On Web: Falls back to a local Node.js proxy server for development.

### Building the APK
To generate the latest version (e.g., Mori v1.0.apk), run:
`npx cap sync android && cd android && ./gradlew assembleDebug`

Developed by coflyn.
GitHub: https://github.com/coflyn
Instagram: @_coflyn
