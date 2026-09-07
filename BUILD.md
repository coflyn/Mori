# Building Mori from Source

This document contains instructions for building Mori from source for Android, macOS, Windows, and iOS.

---

## 🛠️ Prerequisites

* **Node.js**: `v18.x` or higher (Node `v20+` recommended)
* **npm**: `v9.x` or higher
* **Git**: Installed and configured

### Platform-Specific Tools:
* **For Android**: Android Studio, Android SDK (API 34+), NDK (`28.2+`), Java 17.
* **For Desktop (macOS & Windows)**: Rust toolchain (`rustup`, `cargo`), Tauri CLI.
* **For iOS**: macOS with Xcode 15+ and CocoaPods (`gem install cocoapods`).

---

## 🚀 Initial Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/coflyn/Mori.git
   cd Mori
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

---

## 📱 Building for Android

Mori uses **CapacitorJS** paired with a custom native **OkHttp** bridge (`MainActivity.java`) to handle network requests and bypass WebView CORS restrictions.

### 1. Single-Command Quick Build

```bash
# Build Debug APK
npm run build:android

# Build Signed Release APK (Requires keystore configured below)
npm run build:android:release
```

The output APK will be located at:
`android/app/build/outputs/apk/release/Mori v{VERSION}.apk`

---

### 2. Manual Build Steps

```bash
# 1. Sync web assets to Android
npx cap sync android

# 2. Compile via Gradle
cd android
./gradlew assembleRelease
```

---

### 3. Setting Up Signing Keystore (One-Time)

For a production release APK, generate a keystore file:

```bash
keytool -genkey -v -keystore android/app/release.keystore -alias mori \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass android123 -keypass android123 \
  -dname "CN=Mori, OU=Development, O=MoriApp, L=Unknown, ST=Unknown, C=ID"
```

Then ensure `signingConfigs` in `android/app/build.gradle` is configured:

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

## 🖥️ Building for Desktop (macOS & Windows)

Mori Desktop is powered by **Tauri v2 (Rust)** for minimal resource consumption and ultra-fast startup times.

### Development Mode

```bash
npm run tauri:dev
```

### Building Release Installers

```bash
npm run tauri:build
```

**Output files:**
* **macOS**: `src-tauri/target/release/bundle/macos/Mori.app` & `.dmg`
* **Windows**: `src-tauri/target/release/bundle/msi/*.msi` & `.exe` setup bundle

---

## 🍎 Building for iOS

### Running on Simulator or Physical Device

```bash
# 1. Sync web assets & CocoaPods dependencies
npx cap sync ios

# 2. Open Xcode workspace
npx cap open ios

# 3. Select your device/simulator and press Run (Cmd + R)
```

---

### Building Unsigned IPA (For Sideloading via AltStore / TrollStore)

If you don't have a paid Apple Developer Account:

```bash
# Single command build
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
zip -r "Mori v4.3.1.ipa" Payload && rm -rf Payload build
```

---

## ⚙️ Core Architecture Notes

* **Frontend**: Vanilla ES6 JavaScript + modern CSS design system located in `public/`.
* **Scraper Runtime**: The core scraping engine runs from `public/js/scrapers.bin` and is dynamically decrypted during runtime via native handshake (`libmorisec.so` on Android, Rust machine code on Desktop).
* **HTTP Layer**: Cross-origin requests are routed through `public/js/scrapers/httpHelper.js`, utilizing native OkHttp on Android and native Rust HTTP on Desktop to bypass CORS.

---

Developed with ❤️ by coflyn.  
GitHub: https://github.com/coflyn  
Instagram: @\_coflyn
