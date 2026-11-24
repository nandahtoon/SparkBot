# Android Application Guide — SparkBot: Engineering Academy

SparkBot runs natively on Android in **two ways**:

## Option 1: Instant Android App Install (PWA — Zero Build Required)
1. Open the app URL in **Google Chrome on Android**.
2. Tap the **Install App** button in the top bar (or in **Settings → Install Android App**), or tap Chrome's **⋮ Menu → Install app**.
3. SparkBot installs directly onto your Android home screen & app drawer, launches full-screen without browser bars, caches assets for **offline play**, supports **tactile haptic vibration**, and handles the **Android Back gesture/button** cleanly.

## Option 2: Native Android APK / Play Store AAB (via Capacitor + Android Studio)
If you want a standalone `.apk` or `.aab` package for sideloading or Google Play:

```bash
# 1. Install Capacitor CLI & Android platform locally
npm install @capacitor/core @capacitor/android
npm install -D @capacitor/cli

# 2. Build the production bundle and generate the native Android project
npm run build
npm run android:add

# 3. Sync future web updates into the Android project
npm run android:sync

# 4. Open in Android Studio to run on device/emulator or build a signed APK/AAB
npm run android:open
```

The Android package ID is configured in `capacitor.config.ts` as `com.sparkbot.academy`.
