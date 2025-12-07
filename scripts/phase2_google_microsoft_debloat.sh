#!/bin/bash
# Phase 2: Google & Microsoft Debloat
# Xiaomi Redmi Note 13 Pro 5G (garnet_global)
#
# These are optional Google/Microsoft apps that duplicate functionality
# or may not be needed. Review each before running.
#
# Usage: Run commands individually based on your needs
# Restore: adb shell cmd package install-existing <package_name>

ADB="/c/Users/c/AppData/Local/Android/Sdk/platform-tools/adb.exe"

echo "=== Phase 2: Google & Microsoft Debloat ==="
echo ""

# ============================================
# MICROSOFT APPS (if not using Windows ecosystem)
# ============================================
echo "--- Microsoft Apps ---"
echo "Remove these if not using Windows/Office integration"
echo ""

# Link to Windows
$ADB shell pm uninstall -k --user 0 com.microsoft.appmanager
echo "[OK] Removed: Link to Windows"

# Microsoft Word
$ADB shell pm uninstall -k --user 0 com.microsoft.office.word
echo "[OK] Removed: Microsoft Word"

# Outlook (if using Gmail)
# $ADB shell pm uninstall -k --user 0 com.microsoft.office.outlook
# echo "[OK] Removed: Microsoft Outlook"

# OneDrive (if using Google Drive)
$ADB shell pm uninstall -k --user 0 com.microsoft.skydrive
echo "[OK] Removed: OneDrive"

# Teams (if not using for work)
# $ADB shell pm uninstall -k --user 0 com.microsoft.teams
# echo "[OK] Removed: Microsoft Teams"

# Cross Device Service
$ADB shell pm uninstall -k --user 0 com.microsoftsdk.crossdeviceservicebroker
echo "[OK] Removed: Cross Device Service"

# Device Integration Service
$ADB shell pm uninstall -k --user 0 com.microsoft.deviceintegrationservice
echo "[OK] Removed: Device Integration Service"

# ============================================
# GOOGLE APPS - ENTERTAINMENT (Optional)
# ============================================
echo ""
echo "--- Google Entertainment Apps ---"

# Google Play Movies & TV
$ADB shell pm uninstall -k --user 0 com.google.android.videos
echo "[OK] Removed: Google Play Movies"

# Google Podcasts (being discontinued anyway)
$ADB shell pm uninstall -k --user 0 com.google.android.apps.podcasts
echo "[OK] Removed: Google Podcasts"

# YouTube Music (if using Spotify)
# $ADB shell pm uninstall -k --user 0 com.google.android.apps.youtube.music
# echo "[OK] Removed: YouTube Music"

# Google Play Games
$ADB shell pm uninstall -k --user 0 com.google.android.play.games
echo "[OK] Removed: Google Play Games"

# ============================================
# GOOGLE APPS - UTILITIES (Optional)
# ============================================
echo ""
echo "--- Google Utility Apps ---"

# Google Earth
$ADB shell pm uninstall -k --user 0 com.google.earth
echo "[OK] Removed: Google Earth"

# Google Translate (if not traveling)
# $ADB shell pm uninstall -k --user 0 com.google.android.apps.translate
# echo "[OK] Removed: Google Translate"

# Google Meet/Duo (if not using)
$ADB shell pm uninstall -k --user 0 com.google.android.apps.tachyon
echo "[OK] Removed: Google Meet"

# Google Lens
# $ADB shell pm uninstall -k --user 0 com.google.ar.lens
# echo "[OK] Removed: Google Lens"

# Google One (subscription manager)
$ADB shell pm uninstall -k --user 0 com.google.android.apps.subscriptions.red
echo "[OK] Removed: Google One"

# Google Home (if no Chromecast)
# $ADB shell pm uninstall -k --user 0 com.google.android.apps.chromecast.app
# echo "[OK] Removed: Google Home"

# Family Link (if no kids)
$ADB shell pm uninstall -k --user 0 com.google.android.apps.kids.familylink
echo "[OK] Removed: Family Link"

# Google Keep (if not using)
$ADB shell pm uninstall -k --user 0 com.google.android.keep
echo "[OK] Removed: Google Keep"

# Files by Google (Mi File Manager works)
$ADB shell pm uninstall -k --user 0 com.google.android.apps.nbu.files
echo "[OK] Removed: Files by Google"

# Android Auto (if no car)
# $ADB shell pm uninstall -k --user 0 com.google.android.projection.gearhead
# echo "[OK] Removed: Android Auto"

# Google Docs
$ADB shell pm uninstall -k --user 0 com.google.android.apps.docs
echo "[OK] Removed: Google Docs"

# AR Core (if not using AR apps)
$ADB shell pm uninstall -k --user 0 com.google.ar.core
echo "[OK] Removed: AR Core"

echo ""
echo "=== Phase 2 Complete ==="
echo ""
echo "NOTE: Some commands are commented out."
echo "Uncomment and run individually if you want to remove them."
