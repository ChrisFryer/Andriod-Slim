#!/bin/bash
# Phase 1: Safe Debloat - Zero Risk Removals
# Xiaomi Redmi Note 13 Pro 5G (garnet_global)
#
# These packages can be safely removed with no system impact.
# All removals are for current user only and can be restored.
#
# Usage: Run each command individually or source this script
# Restore: adb shell cmd package install-existing <package_name>

ADB="/c/Users/c/AppData/Local/Android/Sdk/platform-tools/adb.exe"

echo "=== Phase 1: Safe Debloat ==="
echo "Device: Xiaomi Redmi Note 13 Pro 5G"
echo ""

# ============================================
# FACEBOOK BLOATWARE (100% Safe)
# ============================================
echo "--- Removing Facebook Bloatware ---"

# Facebook App Manager - manages FB app updates
$ADB shell pm uninstall -k --user 0 com.facebook.appmanager
echo "[OK] Removed: Facebook App Manager"

# Facebook System Installer - auto-installs Facebook
$ADB shell pm uninstall -k --user 0 com.facebook.system
echo "[OK] Removed: Facebook Installer"

# Facebook Services - background FB services
$ADB shell pm uninstall -k --user 0 com.facebook.services
echo "[OK] Removed: Facebook Services"

# ============================================
# XIAOMI PROMOTIONAL/AD APPS
# ============================================
echo ""
echo "--- Removing Xiaomi Promotional Apps ---"

# MSA - MIUI System Ads framework
$ADB shell pm uninstall -k --user 0 com.miui.msa.global
echo "[OK] Removed: MIUI System Ads (MSA)"

# Analytics - Xiaomi telemetry
$ADB shell pm uninstall -k --user 0 com.miui.analytics
echo "[OK] Removed: MIUI Analytics"

# GetApps - Xiaomi app store
$ADB shell pm uninstall -k --user 0 com.xiaomi.mipicks
echo "[OK] Removed: GetApps Store"

# Joyose - Analytics/optimization
$ADB shell pm uninstall -k --user 0 com.xiaomi.joyose
echo "[OK] Removed: Joyose"

# Discover - Promotional content
$ADB shell pm uninstall -k --user 0 com.xiaomi.discover
echo "[OK] Removed: Xiaomi Discover"

# Wallpaper Carousel - lockscreen ads/wallpapers
$ADB shell pm uninstall -k --user 0 com.miui.android.fashiongallery
echo "[OK] Removed: Wallpaper Carousel"

# Games folder/launcher
$ADB shell pm uninstall -k --user 0 com.xiaomi.glgm
echo "[OK] Removed: Xiaomi Games"

# Third Party Assistant - app suggestions
$ADB shell pm uninstall -k --user 0 com.miui.thirdappassistant
echo "[OK] Removed: Third Party Assistant"

# ============================================
# XIAOMI DUPLICATE/UNNECESSARY APPS
# ============================================
echo ""
echo "--- Removing Xiaomi Duplicate Apps ---"

# Mi Browser - use Chrome/Firefox
$ADB shell pm uninstall -k --user 0 com.mi.globalbrowser
echo "[OK] Removed: Mi Browser"

# Mi Video - use VLC
$ADB shell pm uninstall -k --user 0 com.miui.videoplayer
echo "[OK] Removed: Mi Video Player"

# Mi Music - use Spotify
$ADB shell pm uninstall -k --user 0 com.miui.player
echo "[OK] Removed: Mi Music"

# Mi Drop/ShareMe - use Nearby Share
$ADB shell pm uninstall -k --user 0 com.xiaomi.midrop
echo "[OK] Removed: Mi Drop"

# Yellow Pages
$ADB shell pm uninstall -k --user 0 com.miui.yellowpage
echo "[OK] Removed: Yellow Pages"

# Scanner - use Google Lens
$ADB shell pm uninstall -k --user 0 com.xiaomi.scanner
echo "[OK] Removed: Mi Scanner"

# Bug Report tool
$ADB shell pm uninstall -k --user 0 com.miui.bugreport
echo "[OK] Removed: Bug Report"

# Frequent Phrases
$ADB shell pm uninstall -k --user 0 com.miui.phrase
echo "[OK] Removed: Frequent Phrases"

# Screen Barrage (floating comments)
$ADB shell pm uninstall -k --user 0 com.xiaomi.barrage
echo "[OK] Removed: Screen Barrage"

# App Vault (left swipe screen)
$ADB shell pm uninstall -k --user 0 com.mi.globalminusscreen
echo "[OK] Removed: App Vault"

# ============================================
# AMAZON BLOATWARE
# ============================================
echo ""
echo "--- Removing Amazon Bloatware ---"

$ADB shell pm uninstall -k --user 0 com.amazon.appmanager
echo "[OK] Removed: Amazon App Manager"

echo ""
echo "=== Phase 1 Complete ==="
echo "Removed: 20 packages"
echo ""
echo "To restore any package:"
echo "adb shell cmd package install-existing <package_name>"
