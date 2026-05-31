#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# AM Mart — Push OTA (Over-the-Air) JS update
#
# After any JS/TypeScript/asset change that doesn't touch native code,
# run this script instead of rebuilding the APK.
# Users get the update silently on next app launch — no reinstall needed.
#
# Usage:
#   ./publish-update.sh              → pushes to "live" channel (default)
#   ./publish-update.sh preview      → pushes to "preview" channel
#
# The app checks for updates on every launch (configured in app.config.js:
#   updates.checkAutomatically = 'ON_LOAD')
# ─────────────────────────────────────────────────────────────────────────────

CHANNEL="${1:-production}"
EAS="/Users/saleemniamat/.local/bin/eas"

echo "┌─────────────────────────────────────────────────────────────┐"
echo "│  AM Mart — Publishing OTA Update                            │"
echo "│  Channel: $CHANNEL                                          │"
echo "│  Users get this update silently on next app launch          │"
echo "└─────────────────────────────────────────────────────────────┘"
echo ""

$EAS update \
  --channel "$CHANNEL" \
  --message "Update $(date '+%Y-%m-%d %H:%M')" \
  --non-interactive

if [ $? -eq 0 ]; then
  echo ""
  echo "✅  OTA update published to channel: $CHANNEL"
  echo "    All users on this channel will receive it on next launch."
else
  echo ""
  echo "❌  Failed to publish OTA update."
  exit 1
fi
