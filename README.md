# Android Slim

A universal Android device management and debloating dashboard. Analyze, manage, and optimize packages on your Android device via ADB over WiFi or USB.

<img width="2561" height="1240" alt="image" src="https://github.com/user-attachments/assets/81a55a79-6f3f-45be-8722-55208bdacb65" />

## Supported Devices

- **Xiaomi** (MIUI, HyperOS)
- **Oppo** (ColorOS)
- **Realme** (Realme UI)
- **OnePlus** (OxygenOS)
- **Samsung** (One UI)
- **Google Pixel**
- **Stock Android** devices

Tested on Android 14 and Android 15.

---

## Important: Bootloader & Root Limitations

Most Android phones ship with a **locked bootloader** and **no root access**. This means:

- **You cannot fully remove system apps** - only disable them or remove for current user
- **Some vendor services will restart** even after disabling
- **Factory reset restores everything** - disabled apps return
- **Deep system modifications are not possible** without unlocking

### Google Pixel - The Exception

**Google Pixel devices are the only mainstream phones that officially support:**
- Unlocking the bootloader without voiding warranty claims
- Installing custom ROMs (GrapheneOS, CalyxOS, LineageOS)
- Full root access with Magisk
- Complete system control and app removal

If you want **full control** over your Android device with proper security, a Pixel running GrapheneOS or CalyxOS is the recommended choice.

### Other Vendors (Xiaomi, Samsung, Oppo, etc.)

- Bootloader unlock often **voids warranty** or is **blocked entirely**
- Some regions/carriers permanently lock bootloaders
- Knox (Samsung) is tripped permanently when unlocked
- This tool works within ADB limitations - disable/remove for user only

---

## Prerequisites

### 1. Install Node.js

Download and install Node.js (v16 or later):
- **Windows/Mac/Linux**: https://nodejs.org/

Verify installation:
```bash
node --version
```

### 2. Install Android Platform Tools (ADB)

#### Windows
1. Download Platform Tools: https://developer.android.com/tools/releases/platform-tools
2. Extract to a folder (e.g., `C:\platform-tools`)
3. Add to PATH:
   - Search "Environment Variables" in Start menu
   - Edit "Path" under System Variables
   - Add `C:\platform-tools`
4. Verify: Open Command Prompt and run `adb version`

#### macOS
```bash
# Using Homebrew
brew install android-platform-tools

# Verify
adb version
```

#### Linux
```bash
# Ubuntu/Debian
sudo apt install android-tools-adb

# Fedora
sudo dnf install android-tools

# Verify
adb version
```

---

## Enable Developer Mode on Your Phone

### All Android Devices

1. Go to **Settings** > **About Phone**
2. Find **Build Number** (may be under "Software Information" on Samsung)
3. Tap **Build Number** 7 times
4. Enter your PIN/password if prompted
5. You'll see "You are now a developer!"

### Enable USB Debugging

1. Go to **Settings** > **Developer Options**
2. Enable **USB Debugging**
3. (Optional) Enable **Wireless Debugging** for WiFi connection

### Brand-Specific Notes

#### Xiaomi/MIUI/HyperOS
- Developer Options may be under **Settings** > **Additional Settings** > **Developer Options**
- Also enable **USB Debugging (Security Settings)** for package removal

#### Oppo/ColorOS/Realme
- Developer Options: **Settings** > **About Phone** > tap **Version** 7 times
- Enable **Disable Permission Monitoring** in Developer Options

#### Samsung/One UI
- Build Number is under **Settings** > **About Phone** > **Software Information**
- May need to enable **OEM Unlocking** for some operations

#### OnePlus/OxygenOS
- Standard Android location: **Settings** > **About Phone** > **Build Number**

---

## Connect Your Device

### Option A: USB Connection

1. Connect phone to PC with USB cable
2. On phone, select **File Transfer** or **MTP** mode when prompted
3. Accept the "Allow USB Debugging" prompt on phone
4. Check "Always allow from this computer" for convenience

Verify connection:
```bash
adb devices
```
You should see your device listed.

### Option B: WiFi Connection (Recommended)

#### Method 1: Wireless Debugging (Android 11+)

1. Connect phone and PC to the **same WiFi network**
2. On phone: **Settings** > **Developer Options** > **Wireless Debugging**
3. Enable Wireless Debugging
4. Tap **Pair device with pairing code**
5. Note the IP:Port and pairing code
6. On PC:
```bash
adb pair <IP>:<PAIRING_PORT>
# Enter the pairing code when prompted

adb connect <IP>:<DEBUG_PORT>
```

#### Method 2: Via USB First (Recommended - Auto-Detect)

The dashboard can **automatically detect your phone's WiFi IP** when connected via USB:

1. Connect phone to PC via USB cable
2. Start the server: `node server.js`
3. Open `http://localhost:3000` in your browser
4. Click the **📡 Detect IP** button
5. The phone's WiFi IP will auto-populate
6. Click **🔌 Connect** to switch to WiFi
7. You can now disconnect the USB cable

**Manual method** (if auto-detect doesn't work):
```bash
# Enable TCP/IP mode
adb tcpip 5555

# Find phone's IP: Settings > WiFi > tap connected network > IP Address
adb connect <PHONE_IP>:5555
```

---

## Installation & Setup

### 1. Clone or Download

```bash
git clone https://github.com/ChrisFryer/Andriod-Slim.git
cd android-slim
```

Or download and extract the ZIP.

### 2. Start the Server

#### Windows (PowerShell or Command Prompt)
```powershell
# Navigate to the project folder
cd C:\path\to\android-slim

# Start the server
node server.js
```

#### macOS/Linux (Terminal)
```bash
cd /path/to/android-slim
node server.js
```

You should see:
```
Using ADB: C:\platform-tools\adb.exe (or /usr/bin/adb on Linux/Mac)
Android Slim server running on http://localhost:3000
```

**Note:** Keep this terminal window open while using the dashboard. Press `Ctrl+C` to stop the server.

### 3. Open the Dashboard

**Option A: Via Browser**
1. Open your web browser
2. Go to `http://localhost:3000`
3. If connected via USB, click **📡 Detect IP** to auto-fill the WiFi address
4. Or manually enter your device's IP:Port (e.g., `192.168.1.100:5555`)
5. Click **🔌 Connect**

**Option B: Direct File**
1. Open `dashboard.html` directly in your web browser
2. Enter your device's IP:Port
3. Click **Connect**

---

## Features

### Package Management
- View all installed packages with friendly names
- Disable, enable, or remove packages
- See package permissions and dependencies
- Phase-based debloating recommendations

### Network Analysis
- Monitor active network connections
- DNS query analysis
- Detect suspicious/telemetry connections
- Identify remote control capabilities

### Process Monitor
- View running processes
- CPU and memory usage
- Detect unregistered or suspicious processes
- Security scan for anomalies

### Wallpaper Management
- Upload wallpapers from PC
- Browse device images
- Set home/lock screen wallpapers

### CPU Monitor
- Real-time CPU usage per core
- Temperature monitoring
- Performance optimization suggestions

---

## Troubleshooting

### "ADB not found"
- Ensure Platform Tools are installed and in your PATH
- Restart terminal/command prompt after adding to PATH
- Try specifying full path to adb

### "Device not found" or "unauthorized"
1. Check USB cable (use data cable, not charge-only)
2. Accept USB debugging prompt on phone
3. Revoke USB debugging authorizations and reconnect:
   - **Settings** > **Developer Options** > **Revoke USB debugging authorizations**

### WiFi connection drops
- Ensure phone and PC are on same network
- Some routers block device-to-device traffic
- Try USB connection as fallback
- Re-run `adb connect <IP>:5555`

### "Package not found" errors
- Some packages may already be removed
- System packages cannot be fully removed without root
- Use "disable" instead of "remove" for system apps

### Packages reappear after reboot
- Disabled packages re-enable on factory reset
- Some system packages auto-restore
- Consider using firewall apps to block network access instead

---

## Safety Notes

- **Always backup** before removing packages
- **Disable first**, test, then remove if safe
- Some vendor packages are required for basic functions
- Removing wrong packages can cause boot loops
- Factory reset will restore all system packages

### Recovery Commands

If something breaks:
```bash
# Re-enable a disabled package
adb shell pm enable <package_name>

# Restore a removed package (if not fully uninstalled)
adb shell cmd package install-existing <package_name>

# Factory reset (last resort)
adb shell recovery --wipe_data
```

---

## Building Standalone Executable

You can build a standalone executable that doesn't require Node.js to be installed.

### Prerequisites for Building

- Node.js v16 or later (for building only)
- npm (comes with Node.js)

### Windows

```powershell
# Double-click build.bat or run from command line:
.\build.bat
```

This creates `dist\android-slim.exe` (~45-50MB)

### macOS / Linux

```bash
# Make build script executable
chmod +x build.sh

# Run build
./build.sh
```

This creates `dist/android-slim` executable.

### Manual Build (All Platforms)

```bash
# Install dependencies
npm install

# Build for current platform
npm run build

# Or build for specific platform
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux

# Build for all platforms
npm run build:all
```

### Running the Executable

1. **Windows**: Double-click `android-slim.exe` or run from command line
2. **macOS/Linux**: Run `./android-slim` from terminal

The executable will:
- Start the server on port 3000
- Automatically open your default browser to the dashboard
- Display connection instructions in the console

**Note**: ADB must still be installed separately. The executable bundles Node.js and the app code, but not Android Platform Tools.

---

## License

MIT License - Use at your own risk.

---

## Contributing

Pull requests welcome! Please test on your device before submitting.
