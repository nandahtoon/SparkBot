#!/usr/bin/env python3
"""Packages the synced Capacitor Android project into a self-contained ZIP
ready to open directly in Android Studio or build with ./gradlew assembleDebug.
"""
from pathlib import Path
import os
import shutil
import zipfile

ROOT = Path(__file__).resolve().parent.parent
ANDROID_DIR = ROOT / "android"
CAP_ANDROID_DIR = ROOT / "node_modules" / "@capacitor" / "android" / "capacitor"
EXPORTS_DIR = ROOT / "exports"
OUTPUT_ZIP = EXPORTS_DIR / "sparkbot-android-project.zip"

# Keep only the 4 character portraits actually referenced in src/game/customization.ts
USED_AISTUDIO_ASSETS = {
    "image_7fdf8a7b.png",
    "image_94069a90.png",
    "image_542ffeb1.png",
    "image_abb9114d.png",
}

README_TEXT = """SparkBot: Engineering Academy — Native Android App Build Guide
===============================================================

This archive is completely self-contained (includes the synced web bundle and
the Capacitor Android runtime) so you do NOT need to run `npm install`.

Option A — Build APK in Android Studio (Easiest)
------------------------------------------------
1. Unzip this archive.
2. Open Android Studio and choose "Open", then select the `android/` folder.
3. Wait for Gradle Sync to finish.
4. To install directly on a USB-connected Android tablet/phone: click Run (▶).
5. To export an APK file: Build -> Build Bundle(s) / APK(s) -> Build APK(s).
   Output: android/app/build/outputs/apk/debug/app-debug.apk

Option B — Command-Line Gradle Build (JDK 17+ & Android SDK required)
---------------------------------------------------------------------
cd android
./gradlew assembleDebug
# Windows: gradlew.bat assembleDebug
# Output APK: android/app/build/outputs/apk/debug/app-debug.apk
"""


def prune_android_public_assets() -> None:
    public_dir = ANDROID_DIR / "app" / "src" / "main" / "assets" / "public"
    # Never include any nested download zip inside APK assets
    downloads_dir = public_dir / "downloads"
    if downloads_dir.exists():
        shutil.rmtree(downloads_dir)

    # Strip unused chat screenshot files from the native APK web bundle
    aistudio_dir = public_dir / "assets" / "aistudio"
    if aistudio_dir.exists():
        for item in aistudio_dir.iterdir():
            if item.is_file() and item.name not in USED_AISTUDIO_ASSETS:
                item.unlink()


def add_dir_to_zip(zf: zipfile.ZipFile, src_dir: Path, arc_prefix: str) -> None:
    for root, dirs, files in os.walk(src_dir):
        # Skip build outputs & caches if present
        dirs[:] = [
            d for d in dirs
            if d not in {".gradle", "build", ".idea", "__pycache__"}
        ]
        root_path = Path(root)
        for filename in sorted(files):
            file_path = root_path / filename
            rel = file_path.relative_to(src_dir)
            arcname = f"{arc_prefix}/{rel.as_posix()}"
            info = zipfile.ZipInfo.from_file(file_path, arcname)
            info.compress_type = zipfile.ZIP_DEFLATED
            # Preserve executable bit for gradlew
            if filename == "gradlew":
                info.external_attr = (0o100755 << 16)
            with open(file_path, "rb") as fh:
                zf.writestr(info, fh.read(), compress_type=zipfile.ZIP_DEFLATED)


def main() -> None:
    if not ANDROID_DIR.exists():
        raise SystemExit("android/ directory not found. Run `npm run android:sync` first.")
    if not CAP_ANDROID_DIR.exists():
        raise SystemExit("node_modules/@capacitor/android/capacitor not found.")

    prune_android_public_assets()
    EXPORTS_DIR.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(OUTPUT_ZIP, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        add_dir_to_zip(zf, ANDROID_DIR, "sparkbot-android/android")
        add_dir_to_zip(
            zf,
            CAP_ANDROID_DIR,
            "sparkbot-android/node_modules/@capacitor/android/capacitor",
        )
        for extra in ("capacitor.config.ts", "ANDROID_BUILD.md"):
            extra_path = ROOT / extra
            if extra_path.exists():
                zf.write(extra_path, f"sparkbot-android/{extra}")
        zf.writestr("sparkbot-android/README_BUILD_APK.txt", README_TEXT)

    size_mb = OUTPUT_ZIP.stat().st_size / (1024 * 1024)
    print(f"Packed {OUTPUT_ZIP} ({size_mb:.2f} MB)")


if __name__ == "__main__":
    main()
