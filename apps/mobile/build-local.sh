#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# AM Mart — Local Android APK builder (Gradle direct — fast, no cloud credits)
# Output: AM Mart/builds/AM-Mart-latest.apk
#
# OTA updates: after a JS-only change, run  ./publish-update.sh  instead —
#              no new APK needed, users get it silently on next launch.
# ─────────────────────────────────────────────────────────────────────────────

export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export APP_ENV="production"
export EXPO_PUBLIC_API_URL="http://192.168.0.38:3001/api/v1"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools:$PATH"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILDS_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)/builds"
mkdir -p "$BUILDS_DIR"

VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "1.0.0")
DATE=$(date +%Y%m%d)

echo "┌─────────────────────────────────────────────────────────────┐"
echo "│  AM Mart — Local APK Build (Gradle)                         │"
echo "│  Output: builds/AM-Mart-v${VERSION}-${DATE}.apk             │"
echo "└─────────────────────────────────────────────────────────────┘"
echo ""

cd "$SCRIPT_DIR"

# Step 1: Bundle JS
echo "▶  Bundling JavaScript..."
mkdir -p android/app/src/main/assets

npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file node_modules/expo-router/entry.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res

if [ $? -ne 0 ]; then
  echo "❌  JS bundle failed."
  exit 1
fi

# Step 2: Build APK with Gradle
echo ""
echo "▶  Building APK with Gradle..."
cd android
./gradlew assembleRelease

if [ $? -eq 0 ]; then
  APK_SRC="$SCRIPT_DIR/android/app/build/outputs/apk/release/app-release.apk"
  cp "$APK_SRC" "$BUILDS_DIR/AM-Mart-v${VERSION}-${DATE}.apk"
  cp "$APK_SRC" "$BUILDS_DIR/AM-Mart-latest.apk"

  echo ""
  echo "✅  APK saved to:"
  echo "    $BUILDS_DIR/AM-Mart-v${VERSION}-${DATE}.apk"
  echo "    $BUILDS_DIR/AM-Mart-latest.apk"
  echo ""
  echo "📱  Transfer to phone and install"
  echo "🔄  For JS-only changes: cd apps/mobile && ./publish-update.sh"
else
  echo ""
  echo "❌  Gradle build failed."
  exit 1
fi
