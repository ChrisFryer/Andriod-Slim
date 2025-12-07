#!/bin/bash
# Restore All Removed Packages
# Xiaomi Redmi Note 13 Pro 5G (garnet_global)
#
# This script restores all packages that were removed during debloating.
# Run this if you need to undo the debloat.

ADB="/c/Users/c/AppData/Local/Android/Sdk/platform-tools/adb.exe"

echo "=== Restoring All Removed Packages ==="
echo ""

# Re-enable disabled packages first
echo "--- Re-enabling Disabled Packages ---"
$ADB shell pm enable com.miui.miwallpaper
$ADB shell pm enable com.xiaomi.aicr
echo ""

# Facebook
echo "--- Restoring Facebook ---"
$ADB shell cmd package install-existing com.facebook.appmanager
$ADB shell cmd package install-existing com.facebook.system
$ADB shell cmd package install-existing com.facebook.services

# Xiaomi Promotional
echo "--- Restoring Xiaomi Promotional Apps ---"
$ADB shell cmd package install-existing com.miui.msa.global
$ADB shell cmd package install-existing com.miui.analytics
$ADB shell cmd package install-existing com.xiaomi.mipicks
$ADB shell cmd package install-existing com.xiaomi.joyose
$ADB shell cmd package install-existing com.xiaomi.discover
$ADB shell cmd package install-existing com.miui.android.fashiongallery
$ADB shell cmd package install-existing com.xiaomi.glgm
$ADB shell cmd package install-existing com.miui.thirdappassistant

# Xiaomi Apps
echo "--- Restoring Xiaomi Apps ---"
$ADB shell cmd package install-existing com.mi.globalbrowser
$ADB shell cmd package install-existing com.miui.videoplayer
$ADB shell cmd package install-existing com.miui.player
$ADB shell cmd package install-existing com.xiaomi.midrop
$ADB shell cmd package install-existing com.miui.yellowpage
$ADB shell cmd package install-existing com.xiaomi.scanner
$ADB shell cmd package install-existing com.miui.bugreport
$ADB shell cmd package install-existing com.miui.phrase
$ADB shell cmd package install-existing com.xiaomi.barrage
$ADB shell cmd package install-existing com.mi.globalminusscreen
$ADB shell cmd package install-existing com.miui.touchassistant
$ADB shell cmd package install-existing com.xiaomi.payment
$ADB shell cmd package install-existing org.mipay.android.manager
$ADB shell cmd package install-existing com.miui.compass
$ADB shell cmd package install-existing com.miui.mediaeditor
$ADB shell cmd package install-existing com.miui.extraphoto
$ADB shell cmd package install-existing com.xiaomi.aiasst.vision
$ADB shell cmd package install-existing com.xiaomi.cameratools
$ADB shell cmd package install-existing com.xiaomi.mirror

# Amazon
echo "--- Restoring Amazon ---"
$ADB shell cmd package install-existing com.amazon.appmanager

# Microsoft
echo "--- Restoring Microsoft ---"
$ADB shell cmd package install-existing com.microsoft.appmanager
$ADB shell cmd package install-existing com.microsoft.office.word
$ADB shell cmd package install-existing com.microsoft.skydrive
$ADB shell cmd package install-existing com.microsoftsdk.crossdeviceservicebroker
$ADB shell cmd package install-existing com.microsoft.deviceintegrationservice

# Google
echo "--- Restoring Google ---"
$ADB shell cmd package install-existing com.google.android.videos
$ADB shell cmd package install-existing com.google.android.apps.podcasts
$ADB shell cmd package install-existing com.google.android.play.games
$ADB shell cmd package install-existing com.google.earth
$ADB shell cmd package install-existing com.google.android.apps.tachyon
$ADB shell cmd package install-existing com.google.android.apps.subscriptions.red
$ADB shell cmd package install-existing com.google.android.apps.kids.familylink
$ADB shell cmd package install-existing com.google.android.keep
$ADB shell cmd package install-existing com.google.android.apps.nbu.files
$ADB shell cmd package install-existing com.google.android.apps.docs
$ADB shell cmd package install-existing com.google.ar.core

echo ""
echo "=== Restore Complete ==="
echo "Reboot your phone to ensure all changes take effect."
echo ""
echo "Command: adb reboot"
