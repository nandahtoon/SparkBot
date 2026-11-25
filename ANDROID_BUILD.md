# SparkBot: Engineering Academy — Full-Frame Android Tablet & Phone Export Guide

SparkBot: Engineering Academy ships with **both** a ready-to-build **native Capacitor Android project (`/android`)** and an **offline-first full-frame Tablet PWA**.

---

## Key Android Tablet Features Configured Out of the Box

- **Full-Frame Edge-to-Edge Immersive Display**: `MainActivity.java` activates Android sticky immersive mode (`WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE`), hides system bars cleanly, fills display cutouts (`LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES`), and keeps the screen awake during missions.
- **Adaptive Landscape & Portrait Tablet Mode**: Configured with `android:screenOrientation="fullUser"`, `android:resizeableActivity="true"`, `<supports-screens largeScreens="true" xlargeScreens="true" />`, and automatic 3D camera + HUD reflow across tablet landscape (`1280×800`, `1138×712`, `1024×768`) and portrait (`800×1280`, `768×1024`).
- **Hardware WebGL & Haptics**: Hardware acceleration enabled, zero-flash dark `#0b1222` splash theme, `VIBRATE` permission for tactile feedback, and hardware Back button/gesture navigation.
- **100% Offline Play**: Workbox precaches all JS, CSS, icons, and character portraits for zero-Wi-Fi classroom or travel play.

---

## Option 1: Build Native Android Tablet APK / Play Store AAB (Capacitor)

The native Android project is already generated in `/android` (`com.sparkbot.academy`).

### Prerequisites
- Node.js 18+
- Android Studio (Ladybug / Meerkat or newer) with Android SDK 34+ and JDK 17+

### Build & Sync Steps

1. **Build the latest web bundle & sync into `/android`**:
   ```bash
   npm run android:sync
   ```

2. **Open the native tablet project in Android Studio**:
   ```bash
   npm run android:open
   ```
   - Select your connected Android tablet (or a Tablet AVD such as *Pixel Tablet* / *10.1" WXGA Tablet*) and click **Run ▶**.
   - To export an installable tablet APK: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
   - To export a Google Play Store bundle: **Build → Generate Signed Bundle / APK → Android App Bundle (`.aab`)**.

3. **Optional Command-Line Gradle Build (no Android Studio UI needed)**:
   ```bash
   cd android
   ./gradlew assembleDebug
   # Output APK: android/app/build/outputs/apk/debug/app-debug.apk
   ```

---

## Option 2: Instant Offline Full-Frame Tablet PWA (Zero Build Tools)

1. Open the hosted SparkBot URL in **Chrome**, **Edge**, or **Samsung Internet** on your Android tablet.
2. Tap the **Install Android App** button on the title screen (or browser menu **⋮ → Install app**).
3. Launch **SparkBot** from your tablet home screen — it opens in full-frame fullscreen mode (`display: "fullscreen"`) and works completely offline.
4. When playing directly inside a tablet browser tab, tap the top-left **Full Screen** toggle icon for instant edge-to-edge full-frame play.
