# Contributing to Mori

Thank you for your interest in contributing to **Mori**! Whether you want to fix bugs, add UI features, expand language translations, or improve documentation, your help is welcome.

---

## 📋 Table of Contents

1. [Code of Conduct & Etiquette](#-code-of-conduct--etiquette)
2. [How Can I Contribute?](#-how-can-i-contribute)
3. [Development & Build Guide](#-development--build-guide)
   * [Prerequisites](#prerequisites)
   * [Initial Setup](#initial-setup)
   * [Building for Android](#-building-for-android)
   * [Building for Desktop (macOS & Windows)](#-building-for-desktop-macos--windows)
   * [Building for iOS](#-building-for-ios)
4. [Architecture & Scraper Engine](#-architecture--scraper-engine)
5. [Submitting a Pull Request](#-submitting-a-pull-request)

---

## 🤝 Code of Conduct & Etiquette

* **Be Respectful**: Treat everyone in the community with courtesy and respect.
* **Keep it Clean**: Mori is a free, ad-free, and tracker-free application. We will strictly reject any PR that introduces telemetry, ads, trackers, or monetization schemes.
* **Respect Copyleft**: Mori is licensed under **GPL-3.0**. All code contributions must honor this copyleft license.

---

## 💡 How Can I Contribute?

### 1. Reporting Bugs & Requesting Features
* Check existing [GitHub Issues](https://github.com/coflyn/Mori/issues) before opening a new one to prevent duplicates.
* Clearly specify your **Platform & OS version** (Android / macOS / Windows / iOS), **Mori Version**, and the **Source URL** causing the error.

### 2. Translating & Localization (`public/js/i18n/`)
Mori supports multiple languages (English, Indonesian, Japanese, Arabic with RTL, Russian, Tagalog, Hindi). If you want to refine translations or add a new locale, edit the dictionary files in `public/js/i18n/`.

### 3. Frontend & UI Enhancements
Feel free to refine the CSS design system, optimize MoriPlayer controls, enhance glassmorphism effects, or add responsive styling.

---

## 🛠️ Development & Build Guide

### Prerequisites

* **Node.js**: `v18.x` or higher (Node `v20+` recommended)
* **npm**: `v9.x` or higher
* **Git**: Installed and configured

#### Platform-Specific Requirements:
* **Android**: Android Studio, Android SDK (API 34+), NDK (`28.2+`), Java 17.
* **Desktop (macOS & Windows)**: Rust toolchain (`rustup`, `cargo`), Tauri CLI.
* **iOS**: macOS with Xcode 15+ and CocoaPods (`gem install cocoapods`).

---

### Initial Setup

1. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Mori.git
   cd Mori
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

---

### 📱 Building for Android

Mori uses **CapacitorJS** paired with a native **OkHttp** bridge (`MainActivity.java`) to handle network requests and bypass WebView CORS restrictions.

#### Single-Command Build

```bash
# Build Debug APK
npm run build:android

# Build Signed Release APK (Requires keystore configured below)
npm run build:android:release
```

Output location: `android/app/build/outputs/apk/release/Mori v{VERSION}.apk`

#### Manual Build Steps

```bash
# 1. Sync web assets to Android
npx cap sync android

# 2. Compile via Gradle
cd android
./gradlew assembleRelease
```

#### Setting Up Signing Keystore (One-Time)

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

### 🖥️ Building for Desktop (macOS & Windows)

Mori Desktop is powered by **Tauri v2 (Rust)** for minimal resource usage and instant startup times.

#### Development Mode

```bash
npm run tauri:dev
```

#### Building Release Installers

```bash
npm run tauri:build
```

**Output artifacts:**
* **macOS**: `src-tauri/target/release/bundle/macos/Mori.app` & `.dmg` / `.tar.gz`
* **Windows**: `src-tauri/target/release/bundle/msi/*.msi` & `.exe` setup bundle

---

### 🍎 Building for iOS

#### Running on Simulator or Physical Device

```bash
# 1. Sync web assets & CocoaPods dependencies
npx cap sync ios

# 2. Open Xcode workspace
npx cap open ios

# 3. Select target device and press Run (Cmd + R)
```

#### Building Unsigned IPA (For Sideloading via AltStore / TrollStore)

```bash
# Single-command build
npm run build:ios:ipa
```

**Manual steps:**
```bash
# 1. Sync assets
npx cap sync ios

# 2. Compile archive without code signing
xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Release \
  -sdk iphoneos -archivePath build/Mori.xcarchive archive \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY=""

# 3. Package into IPA
mkdir -p Payload && cp -r build/Mori.xcarchive/Products/Applications/App.app Payload/
zip -r "Mori.ipa" Payload && rm -rf Payload build
```

---

## ⚙️ Architecture & Scraper Engine

* **Frontend**: Vanilla ES6 JavaScript + modern CSS design system located in `public/`.
* **Scraper Runtime**: The core scraping engine runs from `public/js/scrapers.bin` and is dynamically decrypted during runtime via native handshake (`libmorisec.so` on Android, Rust machine code on Desktop).
* **HTTP Layer**: Cross-origin requests are routed through `public/js/scrapers/httpHelper.js`, utilizing native OkHttp on Android and native Rust HTTP on Desktop to bypass CORS.

> [!NOTE]
> **Scraper Core Contributions**: Because the scraper engine is distributed as an integrity-protected bytecode (`scrapers.bin`) to deter low-effort ad-injected repackaging, honest developers who wish to fix broken endpoints or suggest scraper algorithms are encouraged to discuss them in an issue or PR with the author.

---

## 🚀 Submitting a Pull Request

1. Fork the repo and create a descriptive branch:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Keep your commits clean and follow conventional commit syntax (`feat: ...`, `fix: ...`, `docs: ...`).
3. Ensure the project builds cleanly without lint or syntax errors.
4. Push to your fork and submit a Pull Request to `main`.
5. Describe what your PR changes, why it is needed, and how it was verified.

---

Developed with ❤️ by coflyn.  
GitHub: https://github.com/coflyn  
Instagram: @\_coflyn
