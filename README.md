# Mori - Minimalist Media Downloader

Mori is a high-performance, minimalist application designed to download media from TikTok, Instagram, and YouTube. It features a clean, brutalist design and focuses on a "native-first" experience where files are saved directly to your device gallery.

## Key Features

- TikTok Support: High-quality video downloads (no watermark) and MP3 extraction.
- Instagram Support: Seamlessly download Reels and Photos (smart thumbnail detection).
- YouTube Support: Support for various video resolutions and high-bitrate audio (M4A/MP3).
- Native Gallery Integration: Files are automatically saved to your phone's Photo/Video gallery.
- Intelligent Error Handling: Real-time feedback for IP blocks (VPN detection), outdated scrapers, or network issues via custom Toast notifications.
- Download History: A built-in manager to track, re-download, or clear your previous activity.
- Minimalist Brutalist UI: A distraction-free monochrome interface with a premium dark mode.
- Privacy Focused: No tracking, no ads, and lightweight performance.

## How to Use

1. Copy a link from TikTok, Instagram, or YouTube.
2. Open Mori and the link will be ready to paste.
3. Tap Configure and wait for the platform detection.
4. Choose your preferred format and tap Download.
5. A toast notification will appear once the file is safely in your gallery.

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
