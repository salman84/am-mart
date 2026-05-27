# AM Mart — Mobile Build Guide

Complete instructions for testing on real Android/iOS devices and building for production.

---

## Prerequisites

Install these once, globally:

```bash
# Node.js 20+ (https://nodejs.org)
node --version   # should be v20+

# pnpm
npm install -g pnpm

# Expo CLI
npm install -g expo-cli

# EAS CLI (Expo Application Services — for cloud builds)
npm install -g eas-cli

# Android: Install Android Studio (https://developer.android.com/studio)
# → SDK Manager → Install Android 14 (API 34)
# → Configure ANDROID_HOME env var

# iOS (Mac only): Install Xcode from App Store
# → sudo xcode-select --switch /Applications/Xcode.app
# → Install CocoaPods: sudo gem install cocoapods
```

---

## Step 1 — Project Setup

```bash
cd "AM Mart/apps/mobile"

# Install dependencies
pnpm install

# Generate placeholder assets (icon, splash, etc.)
node scripts/generate-assets.js

# Create your local .env
cp .env .env.local
# → Edit .env.local: set EXPO_PUBLIC_API_URL to your machine's IP
```

**Find your machine's IP for real device testing:**
```bash
# macOS / Linux
ifconfig | grep "inet " | grep -v 127.0.0.1
# Windows
ipconfig | findstr IPv4
```

Then in `.env.local`:
```
EXPO_PUBLIC_API_URL=http://192.168.1.XXX:3001/api/v1
```

---

## Step 2 — EAS Account Setup (required for builds)

```bash
# Create free account at https://expo.dev
eas login

# Link project to EAS (creates a project ID)
eas init

# Copy the projectId from the output into eas.json and app.config.js
```

---

## Real Device Testing (Fastest — No Build Required)

### Method A: Expo Go App (No native modules)

> ⚠️ This works for basic testing but **won't support** Stripe, Maps, or push notifications.
> For full testing use Method B or C.

```bash
# Start dev server
pnpm start

# Scan the QR code with:
#   Android: Expo Go app (from Play Store)
#   iPhone:  Camera app → opens in Expo Go (from App Store)
```

### Method B: Development Build APK (Recommended for Android)

A development build is like the full app but with a debugger attached.

```bash
# Build dev APK via EAS cloud (free tier: ~20 minutes)
pnpm build:dev:android

# OR build locally if you have Android Studio installed:
pnpm prebuild:android          # generates android/ folder
cd android
./gradlew assembleDebug        # builds debug APK
# Output: android/app/build/outputs/apk/debug/app-debug.apk

# Install directly on connected Android device:
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### Method C: Development Build iOS (Mac + Xcode required)

```bash
# Build dev IPA via EAS cloud:
pnpm build:dev:ios

# OR run locally on connected iPhone:
pnpm prebuild:ios              # generates ios/ folder
cd ios && pod install          # install CocoaPods dependencies
# Open ios/ammart.xcworkspace in Xcode
# Select your device → Product → Run (⌘R)
```

---

## Testing on Physical Devices

### Android Setup

1. Enable Developer Options on your phone:
   - Settings → About Phone → tap **Build Number** 7 times
   - Settings → Developer Options → enable **USB Debugging**

2. Connect via USB or Wi-Fi:
   ```bash
   # USB
   adb devices          # should show your device
   
   # Wi-Fi (Android 11+)
   adb pair IP:PORT     # use the pair code shown in Developer Options → Wireless debugging
   adb connect IP:5555
   ```

3. Install and run:
   ```bash
   pnpm android:device  # builds and runs on connected device
   ```

### iOS Setup

1. Connect iPhone/iPad via USB cable
2. Trust the computer on your device (popup prompt)
3. In Xcode: Window → Devices and Simulators — your device should appear
4. You need an **Apple Developer account** (free or paid):
   - Free: can test on your own device, 7-day expiry per build
   - Paid ($99/yr): required for TestFlight and App Store

```bash
pnpm ios:device        # builds and deploys to connected device
# OR open Xcode → select device → Run
```

---

## APK Build (Direct Install on Any Android Device)

### EAS Cloud Build (No Android Studio required)

```bash
# Preview APK — for internal testing, distributable link
pnpm build:preview:android
# → EAS sends you a download link when done (~15-20 min)
# → Share the link with testers; they download and install it

# Production release APK (signed)
pnpm build:apk
# → Download the APK from expo.dev/builds
```

### Local APK Build (Android Studio required)

```bash
# Generate native Android project
pnpm prebuild:android

# Build debug APK
cd android && ./gradlew assembleDebug
# Output: android/app/build/outputs/apk/debug/app-debug.apk

# Build release APK (requires signing config — see Signing section)
cd android && ./gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk

# Install on connected device
adb install android/app/build/outputs/apk/release/app-release.apk
```

**Allow unknown sources on Android device:**
Settings → Security → Install unknown apps → Allow your browser or Files app

---

## AAB Build (Google Play Store)

```bash
# EAS Cloud (recommended)
pnpm build:aab
# → Downloads .aab file from expo.dev/builds
# → Upload to Google Play Console → Internal Testing

# Local build
cd android && ./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

---

## iOS Build for TestFlight

### Step 1 — Apple Developer Setup

1. Enroll at [developer.apple.com](https://developer.apple.com) ($99/year)
2. Create App ID in Apple Developer Portal:
   - Identifier: `com.ammart.app`
   - Enable: Push Notifications, Associated Domains, In-App Purchase

3. Create App in App Store Connect:
   - Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
   - Apps → + → New App
   - Copy the **Apple ID** number

4. Configure EAS with your Apple credentials:
   ```bash
   eas credentials --platform ios
   # EAS will create/manage certificates and provisioning profiles automatically
   ```

### Step 2 — Build and Upload

```bash
# Build for TestFlight (EAS cloud)
pnpm build:prod:ios

# EAS will ask for Apple ID on first run — enter your credentials
# Build takes ~20-30 minutes on EAS servers

# Submit directly to TestFlight
pnpm submit:ios
# OR upload the .ipa manually via Xcode → Organizer → Distribute
```

### Step 3 — TestFlight Distribution

1. Go to App Store Connect → Your App → TestFlight
2. Click the build number → Add External Testers
3. Share the TestFlight link with your testers
4. Testers install TestFlight from App Store, enter the invite code

---

## Android Signing (Required for Release Builds)

### Generate a Keystore

```bash
keytool -genkeypair \
  -v \
  -storetype PKCS12 \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass YOUR_STORE_PASSWORD \
  -keypass YOUR_KEY_PASSWORD \
  -alias ammart-key \
  -keystore android/app/ammart-release.keystore \
  -dname "CN=AM Mart, OU=Mobile, O=AM Mart Inc, L=Seoul, S=Seoul, C=KR"
```

### Configure Gradle Signing

Create `android/gradle.properties` (never commit this):
```properties
MYAPP_UPLOAD_STORE_FILE=ammart-release.keystore
MYAPP_UPLOAD_KEY_ALIAS=ammart-key
MYAPP_UPLOAD_STORE_PASSWORD=YOUR_STORE_PASSWORD
MYAPP_UPLOAD_KEY_PASSWORD=YOUR_KEY_PASSWORD
```

In `android/app/build.gradle`, add under `android { ... }`:
```gradle
signingConfigs {
    release {
        if (project.hasProperty('MYAPP_UPLOAD_STORE_FILE')) {
            storeFile file(MYAPP_UPLOAD_STORE_FILE)
            storePassword MYAPP_UPLOAD_STORE_PASSWORD
            keyAlias MYAPP_UPLOAD_KEY_ALIAS
            keyPassword MYAPP_UPLOAD_KEY_PASSWORD
        }
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
    }
}
```

> ⚠️ **IMPORTANT**: Save your keystore file safely. If you lose it you cannot update your app on Play Store.

### EAS Managed Signing (Easier)

```bash
eas credentials --platform android
# EAS creates and stores the keystore securely in the cloud
```

---

## Icon and Splash Screen Replacement

Replace the placeholder assets with your real designs:

```
apps/mobile/assets/
  icon.png              1024×1024  No transparency (iOS requirement)
  adaptive-icon.png     1024×1024  Android adaptive icon foreground
  splash.png            1284×2778  Splash screen (safe zone: centre 480×480)
  favicon.png           32×32      Web favicon
  notification-icon.png 96×96      White icon on transparent background
```

**Quick icon generation:**
1. Design your icon at 1024×1024 in Figma / Photoshop / Canva
2. Upload to [appicon.co](https://appicon.co) — downloads all required sizes
3. Replace the files in `assets/`

**Or use Expo's tool:**
```bash
# After replacing icon.png:
npx expo-image-sharp --input assets/icon.png
```

---

## Responsive Layout Summary

The app auto-adapts to screen size using `src/utils/responsive.ts`:

| Device | Width | Product Grid | Font Scale |
|--------|-------|--------------|------------|
| Phone (small) | <375pt | 2 columns | 0.9× |
| Phone (normal) | 390pt | 2 columns | 1× (base) |
| Phone (large) | 428pt | 2 columns | 1.05× |
| Tablet (9") | 768pt | 3 columns | 1.2× |
| Tablet (11") | 834pt | 3 columns | 1.25× |
| iPad Pro 12.9" | 1024pt | 4 columns | 1.35× |

**Using responsive utilities in your screens:**
```tsx
import { useResponsive } from '../../src/hooks/useResponsive';

export default function MyScreen() {
  const { isTablet, gridColumns, contentPadding, fontSize } = useResponsive();
  
  return (
    <FlatList
      numColumns={gridColumns}
      contentContainerStyle={{ padding: contentPadding }}
      ...
    />
  );
}
```

---

## Build Commands Reference

| Command | Description |
|---------|-------------|
| `pnpm start` | Start Expo dev server (scan QR with Expo Go) |
| `pnpm android` | Run on Android emulator |
| `pnpm ios` | Run on iOS simulator |
| `pnpm android:device` | Run on connected Android phone |
| `pnpm ios:device` | Run on connected iPhone |
| `pnpm build:dev:android` | EAS: Dev APK with debugger |
| `pnpm build:dev:ios` | EAS: Dev iOS build with debugger |
| `pnpm build:preview:android` | EAS: Internal test APK |
| `pnpm build:preview:ios` | EAS: Internal test iOS |
| `pnpm build:apk` | EAS: Signed release APK |
| `pnpm build:aab` | EAS: Signed AAB (Play Store) |
| `pnpm build:prod:ios` | EAS: Release iOS (TestFlight/App Store) |
| `pnpm submit:android` | EAS: Upload AAB to Play Console |
| `pnpm submit:ios` | EAS: Upload IPA to App Store Connect |
| `pnpm update:prod` | Push OTA update to production users |

---

## Troubleshooting

### Metro bundler issues
```bash
pnpm start:clear        # clears Metro cache
# If still failing:
rm -rf node_modules && pnpm install
npx expo start --clear
```

### Android build fails
```bash
cd android
./gradlew clean          # clean Gradle build cache
cd .. && pnpm prebuild:android --clean   # regenerate from scratch
```

### iOS CocoaPods issues
```bash
cd ios
pod repo update          # update CocoaPods repo
pod install --repo-update
# If still failing:
pod deintegrate && pod install
```

### "Unable to connect to backend" on real device
- The device must be on the **same Wi-Fi network** as your development machine
- Use your machine's LAN IP (not `localhost`) in `.env.local`
- Make sure your firewall allows port 3001
- On Mac: System Settings → Network → Firewall → Allow port 3001

### Android device not detected
```bash
adb kill-server
adb start-server
adb devices
```

### iOS "Untrusted Developer" error
Settings → General → VPN & Device Management → Your developer account → Trust

---

## Play Store Submission Checklist

- [ ] Real icon (1024×1024, PNG, no transparency)
- [ ] Splash screen
- [ ] Store listing screenshots (phone + 7" tablet + 10" tablet)
- [ ] Privacy Policy URL
- [ ] App description (short + full)
- [ ] Content rating questionnaire
- [ ] Release signed AAB built with `pnpm build:aab`
- [ ] Target API 34 (already configured)

## App Store Submission Checklist

- [ ] Real icon (1024×1024, PNG, no transparency, no rounded corners — Apple adds them)
- [ ] Screenshots: 6.7" iPhone, 6.1" iPhone, 12.9" iPad Pro (required for tablet support)
- [ ] Privacy Policy URL
- [ ] App description
- [ ] Age rating questionnaire
- [ ] TestFlight tested by at least 1 person
- [ ] Build submitted via `pnpm build:prod:ios` + `pnpm submit:ios`
