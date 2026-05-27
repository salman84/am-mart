#!/bin/bash
# Local Android APK build — uses Android Studio's bundled Java, no EAS cloud credits needed

export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools:$PATH"

echo "Using Java: $(java -version 2>&1 | head -1)"
echo "Android SDK: $ANDROID_HOME"
echo ""
echo "Starting local APK build..."

EAS="/Users/saleemniamat/.pnpm-global/5/.pnpm/eas-cli@19.0.8_@types+node@25.9.1_typescript@5.9.3/node_modules/eas-cli/node_modules/.bin/eas"

$EAS build --local --platform android --profile production-apk
