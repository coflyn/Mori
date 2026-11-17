# Changelog

All notable changes to the Mori CLI (`@coflyn/mori`) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.2] - 2026-11-17

### Fixed
- **Dynamic CLI Version Indicator**: Read CLI version dynamically from `package.json` instead of a hardcoded string, preventing stuck version labels and update notification loops.

## [1.2.1] - 2026-11-17

### Fixed
- **YouTube Shorts & Query Normalization**:
  - Convert YouTube Shorts links (`/shorts/{id}`) to standard `/watch?v={id}` URLs before resolving.
  - Distinguish between single videos and playlists when both `v=` and `list=` parameters exist in the URL.
  - Fix converter download headers when redirected to `.shop` mirror domains.
- **Playlist & Multi-Track Album Downloads**:
  - Automatically detect playlists and multi-track albums (YouTube, Spotify, Apple Music, Bandcamp).
  - Add interactive prompt to download all tracks or select specific tracks.
  - Save files with real track titles and index prefixes (`01. Artist - Title.mp3`) instead of generic playlist names.
  - Support automatic full playlist download with `--yes` (`-y`).

## [1.2.0] - 2026-10-25

### Added
- **Interactive Anime & Comic Discovery**:
  - Type titles directly (e.g. `solo leveling`, `frieren`) into the CLI prompt to trigger search across Anime and Comic providers.
  - **Anime Providers**: Otakudesu (Sub Indo) and Gogoanime (Sub Eng) with episode selectors and multi-server stream extraction.
  - **Comic Providers**: Komikindo (Indonesian), Komiku (Indonesian), and Asura Scans (English / Manhwa) with chapter navigation.
- **Manga Chapter PDF Compilation**:
  - Download comic chapters as individual page images or automatically compile them into a single clean PDF document.
- **Web Player & HLS Stream Support**:
  - Prioritizes embed web player links for seamless browser playback without Cloudflare WAF blocks.
  - Direct master HLS m3u8 streams labeled with media player headers (`Referer`) for VLC, mpv, and ffmpeg.
- **Interactive Media Player & History Pickers**:
  - Replaced manual numeric input in `/play` and `/history` with interactive select menus displaying media badges (Video, Audio, PDF) and relative download timestamps.
- **Bulk Multiselect Deletion (`/delete`)**:
  - Upgraded `/delete` to an interactive multiselect list allowing users to toggle multiple items with `Space` and confirm with `Enter`, with dual deletion modes: delete from disk & history or remove from history only.
- **Engine Rollback & Version Selector (`/rollback`)**:
  - Rollback or install specific versions of scraper engines if an update introduces upstream breaking changes.
  - **Mori Core Engine**: Browse and install previous bundles directly via GitHub commit history.
  - **Scrapr Engine**: Browse and install previous releases directly from the NPM registry.
  - Accessible via `/rollback` or `/engine` management menu.

### Fixed
- **Facebook SnapSave Extraction**: Fixed `(0, j.decodeSnapSave) is not a function` error when extracting Facebook media by defining `decodeSnapSave` and `extractFinalUrl` in engine runtime dependencies ([#18](https://github.com/coflyn/Mori/issues/18)).

## [1.1.0] - 2026-10-21

### Added
- **First-Run Engine Setup Wizard**: Interactive prompt on fresh install (`mori`) to choose scraper engine setup: Both (Mori Core + Scrapr), Scrapr Engine only, or Mori Engine only.
- **On-Demand Engine Architecture**: Downloads engines directly into `~/.mori/` via OTA hot-patching, keeping the Mori CLI npm package lightweight (~30 KB).
- **Interactive Engine Management (`/engine`)**: Easily install missing engines, re-download bundles, or uninstall engines directly from the CLI.
- **Enhanced Stream Resolution Labels**: Standardized stream formatting with explicit resolutions (`1080p Video`, `720p Video`, `MP3 Audio`).
- **Dynamic Startup Banner**: Displays real-time engine installation and version badges (`mori v...`, `scrapr v...`, or `no engine installed`).

### Changed
- **Zero-Engine Bundle Package**: Deleted static bundle artifacts (`bundle.js`, `scrapr-bundle.cjs`, `scrapers-version.json`) from the CLI repository, eliminating coupling with external scraper updates.
- **Scoped Background OTA Updates**: Background patch checks only run for installed engines.

## [1.0.1] - 2026-10-18

### Added
- **TikTok `tt.site` Smart Link Support**: Recognize and resolve `tt.site` shortlinks and marketing redirect URLs automatically in CLI platform detection and scraper pipeline.

### Changed
- **Scraper Engine Update**: Synced bundled scraper runtime to `scraperVersion: 5`.

## [1.0.0] - 2026-10-16

### Added
- **Initial Release** of Mori CLI (`@coflyn/mori`).
- **16 Supported Platforms**: Universal extraction for TikTok, Instagram, YouTube, Douyin, Pinterest, RedNote (Xiaohongshu), Spotify, Pixiv, Twitter/X, Reddit, Threads, Bilibili, Facebook, Apple Music, Bandcamp, and TeraBox.
- **Dual Operating Modes**:
  - Direct execution with command-line arguments: `mori <url> [options]`.
  - Interactive terminal UI powered by `@clack/prompts` with dynamic spinners.
- **21 Built-in Slash Commands**: Complete control with `/help`, `/update`, `/batch`, `/config`, `/logs`, `/benchmark`, `/inspect`, `/history`, `/platforms`, `/about`, and short aliases.
- **Concurrent Album Downloader**: Parallel worker pool (5 concurrent downloads) for photo slide albums with single-row in-place progress tracking.
- **Zero-Dependency PDF Generator**: Pure Node.js binary JPEG parser and PDF compiler for photo slide albums and manga chapters without external native bindings.
- **Hot OTA Scraper Engine Updates**: Update scraper rules directly from GitHub OTA patches via `/update` without needing to reinstall the npm package.
- **Automatic NPM Version Checker**: Non-blocking startup registry check alerting users whenever a newer CLI release is published.
- **Smart Anti-Bot Fallbacks**: Native curl fallback and custom header spoofing to bypass Cloudflare and bot checks.
