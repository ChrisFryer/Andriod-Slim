#!/bin/bash
# Phase 3: Advanced Xiaomi Debloat
# Xiaomi Redmi Note 13 Pro 5G (garnet_global)
#
# CAUTION: These apps may have dependencies or affect some features.
# Test your phone after each removal.
#
# Usage: Run commands ONE AT A TIME and test
# Restore: adb shell cmd package install-existing <package_name>

ADB="/c/Users/c/AppData/Local/Android/Sdk/platform-tools/adb.exe"

echo "=== Phase 3: Advanced Debloat (CAUTION) ==="
echo ""
echo "Run these ONE AT A TIME and test your phone!"
echo ""

# ============================================
# MI CLOUD SERVICES (if using Google backup)
# ============================================
echo "--- Mi Cloud Services ---"
echo "Remove if using Google backup instead of Mi Cloud"
echo ""

# Mi Cloud Service
# $ADB shell pm uninstall -k --user 0 com.miui.cloudservice
# echo "[OK] Removed: Mi Cloud Service"

# Mi Cloud Backup
# $ADB shell pm uninstall -k --user 0 com.miui.cloudbackup
# echo "[OK] Removed: Mi Cloud Backup"

# Mi Cloud Sync
# $ADB shell pm uninstall -k --user 0 com.miui.micloudsync
# echo "[OK] Removed: Mi Cloud Sync"

# Mi Cloud SDK
# $ADB shell pm uninstall -k --user 0 com.xiaomi.micloud.sdk
# echo "[OK] Removed: Mi Cloud SDK"

# ============================================
# XIAOMI OPTIONAL FEATURES
# ============================================
echo ""
echo "--- Optional Xiaomi Features ---"

# Quick Ball (floating button)
$ADB shell pm uninstall -k --user 0 com.miui.touchassistant
echo "[OK] Removed: Quick Ball"

# Mi Pay
$ADB shell pm uninstall -k --user 0 com.xiaomi.payment
echo "[OK] Removed: Mi Pay"

# MiPay Service
$ADB shell pm uninstall -k --user 0 org.mipay.android.manager
echo "[OK] Removed: MiPay Service"

# Compass
$ADB shell pm uninstall -k --user 0 com.miui.compass
echo "[OK] Removed: Compass"

# Media Editor
$ADB shell pm uninstall -k --user 0 com.miui.mediaeditor
echo "[OK] Removed: Media Editor"

# Extra Photo (camera modes)
$ADB shell pm uninstall -k --user 0 com.miui.extraphoto
echo "[OK] Removed: Extra Photo"

# AI Vision
$ADB shell pm uninstall -k --user 0 com.xiaomi.aiasst.vision
echo "[OK] Removed: AI Vision"

# Camera Tools Beta
$ADB shell pm uninstall -k --user 0 com.xiaomi.cameratools
echo "[OK] Removed: Camera Tools Beta"

# Mirror (screen mirroring)
$ADB shell pm uninstall -k --user 0 com.xiaomi.mirror
echo "[OK] Removed: Mirror"

# Mi Service
# $ADB shell pm uninstall -k --user 0 com.miui.miservice
# echo "[OK] Removed: Mi Service"

# ============================================
# DISABLE ONLY (Safer approach)
# ============================================
echo ""
echo "--- Disabling Instead of Removing ---"
echo "These are better disabled than removed:"
echo ""

# MIUI Wallpaper (may affect lockscreen)
$ADB shell pm disable-user --user 0 com.miui.miwallpaper
echo "[OK] Disabled: Mi Wallpaper"

# AI Call Recording
$ADB shell pm disable-user --user 0 com.xiaomi.aicr
echo "[OK] Disabled: AI Call Recording"

# Cleaner (may be integrated with Security app)
# $ADB shell pm disable-user --user 0 com.miui.cleaner
# echo "[OK] Disabled: Cleaner"

echo ""
echo "=== Phase 3 Complete ==="
echo ""
echo "To re-enable disabled apps:"
echo "adb shell pm enable <package_name>"
