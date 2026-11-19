# Contributing to Mori

Mori is a free, open-source media utility built with web technologies and native platform bridges. Contributions are welcome, but please read these guidelines before opening an issue or pull request.

---

## Table of Contents

1. [Code of Conduct & Project Principles](#code-of-conduct--project-principles)
2. [How to Contribute](#how-to-contribute)
3. [Development & Build Guide](#development--build-guide)
   * [Prerequisites](#prerequisites)
   * [Initial Setup](#initial-setup)
   * [Building for Android](#building-for-android)
   * [Building for iOS](#building-for-ios)
4. [Architecture & Scraper Engine](#architecture--scraper-engine)
5. [Contributing Translations (i18n)](#contributing-translations-i18n)
6. [CSS Architecture](#css-architecture)
7. [Submitting a Pull Request](#submitting-a-pull-request)

---

## Code of Conduct & Project Principles

- **No trackers or ads**: Mori is completely free, ad-free, and tracker-free. Any pull request introducing telemetry, advertising, analytics, or monetization will be rejected.
- **Copyleft license**: Mori is licensed under GPL-3.0. All submitted code must be compatible with this license.
- **No unverified AI code dumps**: If you use an AI tool to assist your work, you must test the build on an actual device or emulator first. Do not submit untested code, broken endpoints, partial translations, or personal debug CI workflows expecting maintainers to clean them up.
- **Respect**: Treat everyone with courtesy and constructive communication.

---

## How to Contribute

### Reporting Bugs & Requesting Features
- Search existing [GitHub Issues](https://github.com/coflyn/Mori/issues) first to avoid duplicate reports.
- Include your platform, OS version, Mori version, and the target URL that triggered the issue.

### Translating & Localization
Mori supports 10 languages: English, Indonesian, Japanese, Korean, Simplified Chinese, Arabic (RTL), Russian, Tagalog, Hindi, and Spanish. To add or fix translations, edit dictionary files in `public/js/i18n/locales/`.

Documentation is available in:
- Simplified Chinese: [translations/README-zh-CN.md](translations/README-zh-CN.md) / [translations/GUIDE-zh-CN.md](translations/GUIDE-zh-CN.md)
- Indonesian: [translations/README-id.md](translations/README-id.md) / [translations/GUIDE-id.md](translations/GUIDE-id.md)
- Spanish: [translations/README-es.md](translations/README-es.md) / [translations/GUIDE-es.md](translations/GUIDE-es.md)

Missing translation keys fall back to English automatically.

### UI & Core Improvements
Contributions to player controls, performance, accessibility, responsive layout, and tools are welcome. Keep additions aligned with Mori's core purpose as a media downloader and local utility.

---

## Development & Build Guide

### Prerequisites

- **Node.js**: v18 or later (v20+ recommended)
- **npm**: v9 or later
- **Git**

Platform requirements:
- **Android**: Android Studio, Android SDK (API 34+), NDK 28.2+, Java 17 or 21.
- **iOS**: macOS with Xcode 15+ and CocoaPods (`gem install cocoapods`).

---

### Initial Setup

```bash
git clone https://github.com/YOUR_USERNAME/Mori.git
cd Mori
npm install
```

---

### Building for Android

Mori uses Capacitor with a native OkHttp bridge (`MainActivity.java`) to execute network requests outside WebView CORS constraints.

#### Build Commands

```bash
# Build Debug APK
npm run build:android

# Build Signed Release APK
npm run build:android:release
```

Output: `android/app/build/outputs/apk/release/Mori v{VERSION}.apk` (or debug folder for debug builds).

#### Manual Steps

```bash
# Sync web assets to Android project
npx cap sync android

# Build via Gradle
cd android
./gradlew assembleRelease
```

#### Generating Keystore (One-Time)

```bash
keytool -genkey -v -keystore android/app/release.keystore -alias mori \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass android123 -keypass android123 \
  -dname "CN=Mori, OU=Development, O=MoriApp, L=Unknown, ST=Unknown, C=ID"
```

Configure `signingConfigs` in `android/app/build.gradle`:

```groovy
android {
    signingConfigs {
        release {
            storeFile file('release.keystore')
            storePassword 'android123'
            keyAlias 'mori'
            keyPassword 'android123'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

---

### Building for iOS

#### Running on Simulator or Physical Device

```bash
# 1. Sync web assets & CocoaPods dependencies
npx cap sync ios

# 2. Open Xcode workspace
npx cap open ios

# 3. Select target device and run (Cmd + R)
```

#### Building Unsigned IPA (AltStore, TrollStore, Scarlet)

```bash
# Script command
npm run build:ios:ipa
```

Manual steps:
```bash
npx cap sync ios

xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Release \
  -sdk iphoneos -archivePath build/Mori.xcarchive archive \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY=""

mkdir -p Payload && cp -r build/Mori.xcarchive/Products/Applications/App.app Payload/
zip -r "Mori.ipa" Payload && rm -rf Payload build
```

---

## Architecture & Scraper Engine

- **Frontend**: Vanilla ES6 JavaScript with a modular CSS system under `public/`.
- **Scraper Runtime**: Core scraping modules compile via esbuild into `public/js/scrapers/bundle.js` as a standalone IIFE bundle covering all supported platforms.
- **HTTP Layer**: Requests flow through `public/js/scrapers/httpHelper.js`, calling CapacitorHttp to bypass CORS without relying on third-party proxy servers.

The scraper source files are maintained under `src-scrapers/` and compiled to `public/js/scrapers/bundle.js`. If an endpoint breaks or requires algorithm updates, open an issue or draft PR describing the request flow and data structure.

---

## Contributing Translations (i18n)

Mori supports 10 languages:

```
public/js/i18n/
├── locales/
│   ├── en.js        # English (Source of Truth / Fallback)
│   ├── id.js        # Bahasa Indonesia
│   ├── ja.js        # 日本語 (Japanese)
│   ├── ko.js        # 한국어 (Korean)
│   ├── zh.js        # 中文 (Simplified Chinese)
│   ├── ar.js        # العربية (Arabic with RTL)
│   ├── ru.js        # Русский (Russian)
│   ├── tl.js        # Tagalog (Filipino)
│   ├── hi.js        # हिन्दी (Hindi)
│   └── es.js        # Español (Spanish)
└── index.js         # Translation registry & loader
```

### Updating an Existing Language
1. Edit strings in `public/js/i18n/locales/<lang>.js`.
2. Keep placeholders (`${...}`, `{platform}`) and line breaks intact.
3. Test by switching language in Settings.

### Adding a New Language
1. Create `public/js/i18n/locales/<lang_code>.js` following `en.js` structure.
2. Register the locale in `public/js/i18n/index.js`.
3. Add native string mappings to `android/app/src/main/res/values-<lang>/strings.xml` if relevant.
4. Add the language entry to `public/index.html` and `public/js/modules/settings/language.js`.
5. Update language references in README files.

---

## CSS Architecture

Styles are separated into focused modules under `public/css/`:

```
public/css/
├── variables.css    # Design tokens, themes (dark/light), font, speed, corner presets
├── base.css         # Reset, typography, layout wrappers, bottom navigation
├── components.css   # Buttons, toasts, progress bars, badges
├── home.css         # URL input, batch queue, skeleton loaders, media cards
├── history.css      # History items, summary stats, thumbnail overlays
├── settings.css     # Menu lists, subpage slide transitions, dropdowns
├── modals.css       # Modals, PIN keypad, confirm dialogs, batch manager
├── rtl.css          # Right-to-Left layout overrides for Arabic
└── style.css        # Entry stylesheet importing all modules
```

Guidelines:
- Edit the relevant component stylesheet rather than appending everything to `style.css`.
- Use design tokens from `variables.css`.
- Ensure all components look correct in both dark and light modes.

---

## Submitting a Pull Request

1. Create a feature branch:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Write concise commit messages following conventional commits (`feat:`, `fix:`, `docs:`, `i18n:`).
3. Test your build locally (both web and Android/iOS if touching native code).
4. Do not include personal build files, temporary keys, or test workflows in your PR.
5. Push to your fork and open a PR against `main` explaining what changed, why, and how you tested it.
