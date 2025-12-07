/**
 * Android Slim - ADB Backend Server
 *
 * Universal Android device management and debloating tool.
 * Supports: Xiaomi/MIUI/HyperOS, Oppo/ColorOS, OnePlus/OxygenOS,
 *           Samsung/OneUI, Google Pixel, and stock Android devices.
 *
 * Usage: node server.js
 * Then open dashboard.html in your browser
 *
 * Tested on: Android 14, Android 15
 */

const http = require('http');
const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const PORT = 3000;
const AUTO_OPEN_BROWSER = true; // Set to false to disable auto-browser launch

// Cross-platform browser launch
function openBrowser(url) {
    if (!AUTO_OPEN_BROWSER) return;

    const platform = process.platform;
    let command;

    switch (platform) {
    case 'win32':
        command = `start "" "${url}"`;
        break;
    case 'darwin':
        command = `open "${url}"`;
        break;
    case 'linux':
        command = `xdg-open "${url}" || sensible-browser "${url}" || x-www-browser "${url}"`;
        break;
    default:
        console.log(`Please open ${url} in your browser`);
        return;
    }

    exec(command, (error) => {
        if (error) {
            console.log(`Could not auto-open browser. Please open ${url} manually.`);
        }
    });
}
let DEVICE_ID = '';  // Device IP:port - set via connect endpoint

// Auto-detect ADB path
function findAdbPath() {
    const possiblePaths = [
        // Windows paths
        process.env.LOCALAPPDATA + '\\Android\\Sdk\\platform-tools\\adb.exe',
        process.env.USERPROFILE + '\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe',
        'C:\\Android\\platform-tools\\adb.exe',
        'C:\\platform-tools\\adb.exe',
        // Linux/Mac paths
        '/usr/bin/adb',
        '/usr/local/bin/adb',
        process.env.HOME + '/Android/Sdk/platform-tools/adb',
        process.env.HOME + '/Library/Android/sdk/platform-tools/adb',
        // Try PATH
        'adb'
    ];

    for (const adbPath of possiblePaths) {
        try {
            if (adbPath === 'adb') {
                // Check if adb is in PATH
                execSync('adb version', { stdio: 'ignore' });
                return 'adb';
            } else if (fs.existsSync(adbPath)) {
                return adbPath;
            }
        } catch (e) {
            continue;
        }
    }

    console.error('WARNING: ADB not found. Please install Android Platform Tools and ensure adb is in your PATH.');
    console.error('Download from: https://developer.android.com/tools/releases/platform-tools');
    return 'adb'; // Fall back to PATH
}

const ADB_PATH = findAdbPath();
console.log(`Using ADB: ${ADB_PATH}`);

// Activity log
const activityLog = [];

function log(message, type = 'info', command = null) {
    const entry = {
        time: new Date().toISOString(),
        message,
        type,
        command
    };
    activityLog.push(entry);
    console.log(`[${type.toUpperCase()}] ${message}${command ? ' | CMD: ' + command : ''}`);
    return entry;
}

// Check if device is connected
async function isDeviceConnected() {
    return new Promise((resolve) => {
        exec(`"${ADB_PATH}" devices`, (error, stdout) => {
            resolve(stdout && stdout.includes(DEVICE_ID) && !stdout.includes('offline'));
        });
    });
}

// Known IP ranges and their owners (for network analysis)
const knownIpRanges = [
    // Xiaomi
    { range: '110.43.', owner: 'Xiaomi', country: 'CN', risk: 'high', desc: 'Xiaomi Cloud Services' },
    { range: '120.92.', owner: 'Xiaomi', country: 'CN', risk: 'high', desc: 'Xiaomi Beijing' },
    { range: '42.62.', owner: 'Xiaomi', country: 'CN', risk: 'high', desc: 'Xiaomi Infrastructure' },
    { range: '58.83.', owner: 'Xiaomi', country: 'CN', risk: 'high', desc: 'Xiaomi Services' },
    { range: '161.117.', owner: 'Xiaomi/Alibaba', country: 'SG', risk: 'high', desc: 'Xiaomi Singapore' },
    // Alibaba Cloud (often used by Xiaomi)
    { range: '8.219.', owner: 'Alibaba Cloud', country: 'SG', risk: 'high', desc: 'Alibaba Singapore' },
    { range: '47.236.', owner: 'Alibaba Cloud', country: 'SG', risk: 'high', desc: 'Alibaba Singapore' },
    { range: '47.88.', owner: 'Alibaba Cloud', country: 'US', risk: 'medium', desc: 'Alibaba US West' },
    { range: '47.89.', owner: 'Alibaba Cloud', country: 'US', risk: 'medium', desc: 'Alibaba US East' },
    { range: '47.74.', owner: 'Alibaba Cloud', country: 'SG', risk: 'high', desc: 'Alibaba Singapore' },
    { range: '47.91.', owner: 'Alibaba Cloud', country: 'DE', risk: 'medium', desc: 'Alibaba Frankfurt' },
    { range: '149.129.', owner: 'Alibaba Cloud', country: 'ID', risk: 'medium', desc: 'Alibaba Indonesia' },
    // Tencent
    { range: '111.161.', owner: 'Tencent', country: 'CN', risk: 'high', desc: 'Tencent Cloud' },
    { range: '203.205.', owner: 'Tencent', country: 'CN', risk: 'high', desc: 'Tencent Services' },
    { range: '183.3.', owner: 'Tencent', country: 'CN', risk: 'high', desc: 'Tencent Shenzhen' },
    // Google
    { range: '142.250.', owner: 'Google', country: 'US', risk: 'low', desc: 'Google Services' },
    { range: '172.217.', owner: 'Google', country: 'US', risk: 'low', desc: 'Google Services' },
    { range: '216.58.', owner: 'Google', country: 'US', risk: 'low', desc: 'Google Services' },
    { range: '74.125.', owner: 'Google', country: 'US', risk: 'low', desc: 'Google Services' },
    { range: '173.194.', owner: 'Google', country: 'US', risk: 'low', desc: 'Google Services' },
    { range: '209.85.', owner: 'Google', country: 'US', risk: 'low', desc: 'Google Services' },
    { range: '108.177.', owner: 'Google', country: 'US', risk: 'low', desc: 'Google Services' },
    { range: '64.233.', owner: 'Google', country: 'US', risk: 'low', desc: 'Google Services' },
    // Facebook/Meta
    { range: '157.240.', owner: 'Meta', country: 'US', risk: 'medium', desc: 'Facebook/Meta' },
    { range: '31.13.', owner: 'Meta', country: 'US', risk: 'medium', desc: 'Facebook/Meta' },
    { range: '179.60.', owner: 'Meta', country: 'US', risk: 'medium', desc: 'Facebook/Meta' },
    // Microsoft
    { range: '13.107.', owner: 'Microsoft', country: 'US', risk: 'low', desc: 'Microsoft Azure' },
    { range: '52.', owner: 'Microsoft', country: 'US', risk: 'low', desc: 'Microsoft Azure' },
    { range: '40.', owner: 'Microsoft', country: 'US', risk: 'low', desc: 'Microsoft Azure' },
    { range: '20.', owner: 'Microsoft', country: 'US', risk: 'low', desc: 'Microsoft Azure' },
    { range: '204.79.', owner: 'Microsoft', country: 'US', risk: 'low', desc: 'Microsoft Services' },
    // Amazon AWS
    { range: '54.', owner: 'Amazon AWS', country: 'US', risk: 'low', desc: 'AWS' },
    { range: '52.', owner: 'Amazon AWS', country: 'US', risk: 'low', desc: 'AWS' },
    { range: '3.', owner: 'Amazon AWS', country: 'US', risk: 'low', desc: 'AWS' },
    // Cloudflare
    { range: '104.16.', owner: 'Cloudflare', country: 'US', risk: 'low', desc: 'Cloudflare CDN' },
    { range: '172.67.', owner: 'Cloudflare', country: 'US', risk: 'low', desc: 'Cloudflare CDN' },
    { range: '1.1.1.', owner: 'Cloudflare', country: 'US', risk: 'low', desc: 'Cloudflare DNS' },
    // Akamai
    { range: '23.', owner: 'Akamai', country: 'US', risk: 'low', desc: 'Akamai CDN' },
    { range: '104.', owner: 'Akamai', country: 'US', risk: 'low', desc: 'Akamai CDN' },
    // Local/Private
    { range: '127.', owner: 'Localhost', country: 'LOCAL', risk: 'none', desc: 'Loopback' },
    { range: '10.', owner: 'Private', country: 'LOCAL', risk: 'none', desc: 'Private Network' },
    { range: '192.168.', owner: 'Private', country: 'LOCAL', risk: 'none', desc: 'Private Network' },
    { range: '172.16.', owner: 'Private', country: 'LOCAL', risk: 'none', desc: 'Private Network' },
    { range: '172.169.', owner: 'Private', country: 'LOCAL', risk: 'none', desc: 'Private Network' },
    { range: '0.0.0.0', owner: 'Any', country: 'LOCAL', risk: 'none', desc: 'All interfaces' },
];

// Known suspicious ports
const suspiciousPorts = {
    '5222': { service: 'XMPP/Xiaomi Push', risk: 'high', desc: 'Xiaomi push notification service' },
    '5223': { service: 'XMPP-SSL', risk: 'high', desc: 'Encrypted push service' },
    '443': { service: 'HTTPS', risk: 'low', desc: 'Standard secure web traffic' },
    '80': { service: 'HTTP', risk: 'medium', desc: 'Unencrypted web traffic' },
    '8080': { service: 'HTTP-Alt', risk: 'medium', desc: 'Alternative HTTP' },
    '53': { service: 'DNS', risk: 'low', desc: 'DNS queries' },
    '853': { service: 'DNS-TLS', risk: 'low', desc: 'Encrypted DNS' },
    '1883': { service: 'MQTT', risk: 'high', desc: 'IoT messaging protocol' },
    '8883': { service: 'MQTT-SSL', risk: 'medium', desc: 'Secure IoT messaging' },
};

function getKnownIpInfo(ip) {
    if (!ip || ip === '*' || ip === '::') {
        return { owner: 'Any', country: 'LOCAL', risk: 'none', desc: 'Listening on all interfaces' };
    }

    for (const entry of knownIpRanges) {
        if (ip.startsWith(entry.range)) {
            return entry;
        }
    }

    // Check if it's a Chinese IP range (common pattern)
    const firstOctet = parseInt(ip.split('.')[0]);
    if ([1, 14, 27, 36, 39, 42, 49, 58, 59, 60, 61, 101, 106, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 139, 140, 144, 150, 153, 163, 180, 182, 183, 202, 203, 210, 211, 218, 219, 220, 221, 222, 223].includes(firstOctet)) {
        return { owner: 'Unknown (China range)', country: 'CN', risk: 'medium', desc: 'Likely Chinese IP' };
    }

    return { owner: 'Unknown', country: '??', risk: 'unknown', desc: 'Not in database' };
}

function getPortInfo(port) {
    return suspiciousPorts[port] || { service: 'Unknown', risk: 'unknown', desc: '' };
}

// Format bytes to human readable
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Known app names for common packages (global for reuse)
const knownApps = {
    'com.xiaomi.finddevice': 'Find Device',
    'com.miui.analytics': 'MIUI Analytics',
    'com.miui.msa.global': 'MSA (Ad Services)',
    'com.xiaomi.xmsf': 'Xiaomi Service Framework',
    'com.miui.cloudservice': 'Mi Cloud Service',
    'com.miui.cloudbackup': 'Mi Cloud Backup',
    'com.miui.micloudsync': 'Mi Cloud Sync',
    'com.xiaomi.account': 'Mi Account',
    'com.miui.securitycenter': 'Security Center',
    'com.miui.daemon': 'MIUI Daemon',
    'com.xiaomi.joyose': 'Joyose (Analytics)',
    'com.xiaomi.discover': 'Mi Discover',
    'com.miui.android.fashiongallery': 'Wallpaper Carousel',
    'com.xiaomi.glgm': 'Game Center',
    'com.miui.thirdappassistant': 'Install Promotions',
    'com.mi.globalbrowser': 'Mi Browser',
    'com.miui.videoplayer': 'Mi Video',
    'com.miui.player': 'Mi Music',
    'com.xiaomi.midrop': 'Mi Drop (ShareMe)',
    'com.milink.service': 'Mi Link Service',
    'com.milink.crossdeviceservice': 'Mi Link Cross-Device',
    'com.miui.yellowpage': 'Yellow Pages',
    'com.xiaomi.scanner': 'Mi Scanner',
    'com.xiaomi.payment': 'Mi Pay',
    'com.miui.compass': 'Compass',
    'com.facebook.appmanager': 'Facebook App Manager',
    'com.facebook.system': 'Facebook System',
    'com.facebook.services': 'Facebook Services',
    'com.miui.guardprovider': 'Guard Provider (Antivirus)',
    'com.miui.touchassistant': 'Quick Ball',
    'com.xiaomi.barrage': 'Video Toolbox',
    'com.miui.extraphoto': 'Extra Photo Effects',
    'com.xiaomi.aiasst.vision': 'AI Vision',
    'com.xiaomi.cameratools': 'Camera Tools',
    'com.xiaomi.mirror': 'Mi Mirror',
    'com.miui.mediaeditor': 'Media Editor',
    'com.xiaomi.micloud.sdk': 'Mi Cloud SDK',
    'com.lbe.security.miui': 'Permission Manager',
    'com.miui.gallery': 'Gallery',
    'com.miui.home': 'MIUI Launcher',
    'com.miui.notes': 'Notes',
    'com.miui.calculator': 'Calculator',
    'com.miui.weather2': 'Weather',
    'com.miui.cleanmaster': 'Cleaner',
    'com.miui.fm': 'FM Radio',
    'com.miui.voiceassist': 'Voice Assistant',
    'com.miui.backup': 'Backup',
    'com.miui.screenrecorder': 'Screen Recorder',
    'com.android.chrome': 'Chrome',
    'com.google.android.gms': 'Google Play Services',
    'com.google.android.gsf': 'Google Services Framework',
    'com.android.vending': 'Play Store',
    'com.google.android.youtube': 'YouTube',
    'com.google.android.apps.maps': 'Google Maps',
    'com.google.android.apps.photos': 'Google Photos',
    'com.google.android.gm': 'Gmail',
    'com.google.android.calendar': 'Google Calendar',
    'com.whatsapp': 'WhatsApp',
    'com.instagram.android': 'Instagram',
    'com.twitter.android': 'Twitter/X',
    'com.spotify.music': 'Spotify',
    'com.netflix.mediaclient': 'Netflix',
    'com.android.mms': 'Messages (MIUI)',
    'com.google.android.apps.messaging': 'Messages (Google)',
    'com.miui.miwallpaper': 'MIUI Wallpaper',
    'com.android.providers.downloads': 'Download Manager',
    'com.android.settings': 'Settings',
    'com.android.phone': 'Phone',
    'com.android.contacts': 'Contacts',
    'com.android.dialer': 'Dialer',
    'com.android.camera': 'Camera',
    'com.android.systemui': 'System UI',
    'com.android.launcher': 'Launcher',
    'com.android.deskclock': 'Clock',
    'com.android.calendar': 'Calendar',
    'com.android.email': 'Email',
    'com.android.browser': 'Browser',
    'com.android.documentsui': 'Files',
    'com.android.providers.media': 'Media Storage',
    'com.android.providers.contacts': 'Contacts Storage',
    // System processes
    'system_server': 'Android System',
    'surfaceflinger': 'Display Compositor',
    'zygote': 'App Process Manager',
    'zygote64': 'App Process Manager (64-bit)',
    'servicemanager': 'Service Manager',
    'vold': 'Volume Daemon',
    'netd': 'Network Daemon',
    'logd': 'Log Daemon',
    'adbd': 'ADB Daemon',
    'installd': 'Package Installer',

    // ===== OPPO / ColorOS / Realme =====
    'com.coloros.findphone': 'Find My Phone (Oppo)',
    'com.coloros.phonemanager': 'Phone Manager',
    'com.coloros.safecenter': 'Security Center (Oppo)',
    'com.coloros.gamespace': 'Game Space',
    'com.coloros.gallery3d': 'Gallery (Oppo)',
    'com.coloros.filemanager': 'File Manager (Oppo)',
    'com.coloros.weather': 'Weather (Oppo)',
    'com.coloros.compass2': 'Compass (Oppo)',
    'com.coloros.calculator': 'Calculator (Oppo)',
    'com.coloros.soundrecorder': 'Sound Recorder (Oppo)',
    'com.coloros.alarmclock': 'Clock (Oppo)',
    'com.coloros.note': 'Notes (Oppo)',
    'com.coloros.backuprestore': 'Backup & Restore (Oppo)',
    'com.coloros.bootreg': 'Boot Registration',
    'com.coloros.operationmanual': 'User Guide (Oppo)',
    'com.coloros.childrenspace': 'Kids Space (Oppo)',
    'com.oplus.statistics': 'Oplus Statistics',
    'com.oplus.logkit': 'Log Kit (Oppo)',
    'com.heytap.cloud': 'HeyTap Cloud',
    'com.heytap.music': 'Music (Oppo)',
    'com.heytap.browser': 'Browser (Oppo)',
    'com.heytap.mcs': 'Message Cloud Service',
    'com.heytap.openid': 'HeyTap Account',
    'com.nearme.statistics.rom': 'ROM Statistics',
    'com.nearme.instant.platform': 'Quick Apps',
    'com.oppo.fingerprints.service': 'Fingerprint Service',
    'com.oppo.usercenter': 'User Center (Oppo)',
    'com.oppo.market': 'App Market (Oppo)',

    // ===== OnePlus / OxygenOS =====
    'com.oneplus.account': 'OnePlus Account',
    'com.oneplus.security': 'Security (OnePlus)',
    'com.oneplus.brickmode': 'Brick Mode',
    'com.oneplus.gamespace': 'Game Space (OnePlus)',
    'com.oneplus.screenrecord': 'Screen Recorder (OnePlus)',
    'com.oneplus.filemanager': 'File Manager (OnePlus)',
    'com.oneplus.weather': 'Weather (OnePlus)',
    'com.oneplus.gallery': 'Gallery (OnePlus)',
    'com.oneplus.note': 'Notes (OnePlus)',
    'com.oneplus.card': 'Shelf',
    'com.oneplus.opbackup': 'OnePlus Backup',
    'net.oneplus.commonlogtool': 'Log Tool (OnePlus)',
    'net.oneplus.odm': 'Device Manager (OnePlus)',
    'com.oneplus.opbugreportlite': 'Bug Report (OnePlus)',

    // ===== Samsung / OneUI =====
    'com.samsung.android.incallui': 'Phone (Samsung)',
    'com.samsung.android.contacts': 'Contacts (Samsung)',
    'com.samsung.android.messaging': 'Messages (Samsung)',
    'com.samsung.android.dialer': 'Phone (Samsung)',
    'com.sec.android.app.launcher': 'One UI Home',
    'com.sec.android.app.camera': 'Camera (Samsung)',
    'com.sec.android.gallery3d': 'Gallery (Samsung)',
    'com.sec.android.app.myfiles': 'My Files (Samsung)',
    'com.samsung.android.calendar': 'Calendar (Samsung)',
    'com.samsung.android.email.provider': 'Email (Samsung)',
    'com.samsung.android.app.notes': 'Samsung Notes',
    'com.samsung.android.voc': 'Samsung Members',
    'com.samsung.android.game.gamehome': 'Game Launcher',
    'com.samsung.android.game.gametools': 'Game Tools',
    'com.samsung.android.smartcallprovider': 'Smart Call',
    'com.samsung.android.bixby.agent': 'Bixby Voice',
    'com.samsung.android.bixby.service': 'Bixby Service',
    'com.samsung.android.visionintelligence': 'Bixby Vision',
    'com.samsung.android.app.routines': 'Bixby Routines',
    'com.samsung.android.scloud': 'Samsung Cloud',
    'com.samsung.android.mdx': 'Samsung DeX',
    'com.samsung.android.app.watchmanager': 'Galaxy Wearable',
    'com.samsung.android.fmm': 'Find My Mobile',
    'com.samsung.android.spayfw': 'Samsung Pay Framework',
    'com.samsung.android.samsungpass': 'Samsung Pass',
    'com.samsung.android.authfw': 'Authentication Framework',
    'com.samsung.android.knox.containercore': 'Knox Container',
    'com.samsung.android.app.omcagent': 'Configuration Update',
    'com.samsung.android.mobileservice': 'Samsung Account',
    'com.samsung.sree': 'Samsung Security',
    'com.samsung.android.da.daagent': 'Dual Messenger',
    'com.samsung.android.rubin.app': 'Customization Service',
    'com.samsung.android.forest': 'Digital Wellbeing (Samsung)',
    'com.samsung.android.app.tips': 'Samsung Tips',
    'com.sec.android.widgetapp.webmanual': 'User Manual',
    'com.samsung.storyservice': 'Story Service',

    // ===== Google Pixel =====
    'com.google.android.apps.wellbeing': 'Digital Wellbeing',
    'com.google.android.apps.tips': 'Pixel Tips',
    'com.google.android.apps.turbo': 'Device Health Services',
    'com.google.android.apps.safetyhub': 'Safety',
    'com.google.android.apps.nbu.files': 'Files by Google',
    'com.google.android.apps.recorder': 'Recorder',
    'com.google.android.markup': 'Markup',
    'com.google.ar.lens': 'Google Lens',
    'com.google.android.dialer': 'Phone (Google)',
    'com.google.android.contacts': 'Contacts (Google)',

    // ===== Carrier Bloatware =====
    'com.asus.dm': 'ASUS Data Manager',
    'com.verizon.': 'Verizon App',
    'com.att.': 'AT&T App',
    'com.sprint.': 'Sprint App',
    'com.tmobile.': 'T-Mobile App',
    'com.vzw.': 'Verizon Wireless',
    'com.optus.': 'Optus App',
    'com.telstra.': 'Telstra App',
    'com.vodafone.': 'Vodafone App',
};

// Known suspicious/C2 domain patterns
const suspiciousDomainPatterns = [
    // ===== Xiaomi/MIUI tracking/telemetry =====
    { pattern: /tracking\..*xiaomi/i, category: 'telemetry', risk: 'high', desc: 'Xiaomi Tracking' },
    { pattern: /data\.mistat/i, category: 'telemetry', risk: 'high', desc: 'Xiaomi Analytics' },
    { pattern: /logupload/i, category: 'telemetry', risk: 'high', desc: 'Log Upload Service' },
    { pattern: /feedback.*xiaomi/i, category: 'telemetry', risk: 'medium', desc: 'Feedback Service' },
    { pattern: /stats\.xiaomi/i, category: 'telemetry', risk: 'high', desc: 'Xiaomi Statistics' },
    { pattern: /abtest/i, category: 'telemetry', risk: 'medium', desc: 'A/B Testing' },
    { pattern: /xmpush|mipush/i, category: 'push', risk: 'high', desc: 'Xiaomi Push' },
    { pattern: /resolver\.msg\.xiaomi/i, category: 'push', risk: 'high', desc: 'Xiaomi Message Resolver' },
    { pattern: /register\.xmpush/i, category: 'push', risk: 'high', desc: 'Push Registration' },
    { pattern: /app\.chat\.xiaomi/i, category: 'push', risk: 'high', desc: 'Xiaomi Chat Service' },
    { pattern: /account\.xiaomi/i, category: 'account', risk: 'high', desc: 'Xiaomi Account' },
    { pattern: /passport\.xiaomi/i, category: 'account', risk: 'high', desc: 'Xiaomi Auth' },
    { pattern: /find\..*miui/i, category: 'remote', risk: 'critical', desc: 'Find Device (Remote Lock)' },
    { pattern: /i\.mi\.com/i, category: 'cloud', risk: 'high', desc: 'Mi Cloud' },
    { pattern: /ad[s]?\.xiaomi/i, category: 'ads', risk: 'medium', desc: 'Xiaomi Ads' },
    { pattern: /adv\.sec\.miui/i, category: 'ads', risk: 'medium', desc: 'MIUI Ads' },

    // ===== Oppo/ColorOS/Realme telemetry =====
    { pattern: /\.oppo\.com/i, category: 'telemetry', risk: 'high', desc: 'Oppo Services' },
    { pattern: /\.coloros\.com/i, category: 'telemetry', risk: 'high', desc: 'ColorOS Services' },
    { pattern: /\.heytap\.com/i, category: 'telemetry', risk: 'high', desc: 'HeyTap Services' },
    { pattern: /\.nearme\.com\.cn/i, category: 'telemetry', risk: 'high', desc: 'Nearme (Oppo)' },
    { pattern: /push\.oplus/i, category: 'push', risk: 'high', desc: 'Oplus Push' },
    { pattern: /\.realme\.com/i, category: 'telemetry', risk: 'high', desc: 'Realme Services' },

    // ===== OnePlus telemetry =====
    { pattern: /\.oneplus\.com/i, category: 'telemetry', risk: 'medium', desc: 'OnePlus Services' },
    { pattern: /\.oneplus\.cn/i, category: 'telemetry', risk: 'high', desc: 'OnePlus China' },
    { pattern: /open\.oneplus/i, category: 'telemetry', risk: 'medium', desc: 'OnePlus Open Platform' },

    // ===== Samsung telemetry =====
    { pattern: /samsungcloud/i, category: 'cloud', risk: 'medium', desc: 'Samsung Cloud' },
    { pattern: /samsungapps/i, category: 'store', risk: 'low', desc: 'Samsung Apps' },
    { pattern: /samsungdm/i, category: 'telemetry', risk: 'high', desc: 'Samsung Device Manager' },
    { pattern: /samsungcloudsolution/i, category: 'cloud', risk: 'medium', desc: 'Samsung Cloud Solution' },
    { pattern: /findmymobile/i, category: 'remote', risk: 'critical', desc: 'Find My Mobile (Samsung)' },

    // ===== Generic vendor patterns =====
    { pattern: /finddevice/i, category: 'remote', risk: 'critical', desc: 'Find Device Service' },
    { pattern: /sdkconfig\.ad/i, category: 'ads', risk: 'medium', desc: 'Ad SDK Config' },
    { pattern: /globalapi\.ad/i, category: 'ads', risk: 'medium', desc: 'Global Ad API' },
    { pattern: /globalconnect/i, category: 'push', risk: 'high', desc: 'Global Connect Service' },

    // ===== Cloud providers (often used for telemetry) =====
    { pattern: /\.aliyuncs\.com/i, category: 'cloud', risk: 'medium', desc: 'Alibaba Cloud' },
    { pattern: /\.alicdn\.com/i, category: 'cdn', risk: 'low', desc: 'Alibaba CDN' },
    { pattern: /\.tencent\.com/i, category: 'cloud', risk: 'medium', desc: 'Tencent Cloud' },
    { pattern: /\.qq\.com/i, category: 'telemetry', risk: 'medium', desc: 'Tencent/QQ Services' },

    // ===== Suspicious generic patterns =====
    { pattern: /c2\.|cmd\.|command\./i, category: 'c2', risk: 'critical', desc: 'Possible C2 Server' },
    { pattern: /update.*\.cn$/i, category: 'update', risk: 'high', desc: 'China Update Server' },
    { pattern: /config.*\.cn$/i, category: 'config', risk: 'high', desc: 'China Config Server' },
    { pattern: /api.*\.cn$/i, category: 'api', risk: 'medium', desc: 'China API' },

    // ===== DGA-like patterns (random-looking domains) =====
    { pattern: /^[a-z0-9]{20,}\./i, category: 'dga', risk: 'critical', desc: 'Possible DGA Domain' },
];

// Known legitimate domains to exclude from suspicion
const legitimateDomains = [
    /google\.com$/i,
    /googleapis\.com$/i,
    /gstatic\.com$/i,
    /android\.com$/i,
    /cloudflare\.com$/i,
    /akamai/i,
    /microsoft\.com$/i,
    /windows\.com$/i,
    /apple\.com$/i,
    /mozilla\.(org|com)$/i,
];

function analyzeDomainForC2(domain, ip, ipInfo) {
    // Skip obviously legitimate domains
    for (const legit of legitimateDomains) {
        if (legit.test(domain)) {
            return { isSuspicious: false, reason: null, category: 'legitimate', risk: 'none' };
        }
    }

    // Check against suspicious patterns
    for (const pattern of suspiciousDomainPatterns) {
        if (pattern.pattern.test(domain)) {
            return {
                isSuspicious: pattern.risk === 'high' || pattern.risk === 'critical',
                reason: pattern.desc,
                category: pattern.category,
                risk: pattern.risk
            };
        }
    }

    // Check IP-based suspicion
    if (ipInfo && ipInfo.risk === 'high') {
        return {
            isSuspicious: true,
            reason: `Resolves to ${ipInfo.owner} (${ipInfo.country})`,
            category: 'ip-based',
            risk: 'medium'
        };
    }

    // Check for .cn TLD
    if (domain.endsWith('.cn')) {
        return {
            isSuspicious: true,
            reason: 'Chinese TLD',
            category: 'geo',
            risk: 'medium'
        };
    }

    return { isSuspicious: false, reason: null, category: 'unknown', risk: 'unknown' };
}

// Auto-reconnect if needed
async function ensureConnected() {
    const connected = await isDeviceConnected();
    if (!connected && DEVICE_ID) {
        log(`Device disconnected, attempting reconnect to ${DEVICE_ID}...`, 'warning');
        return new Promise((resolve) => {
            exec(`"${ADB_PATH}" connect ${DEVICE_ID}`, (error, stdout) => {
                const success = stdout && (stdout.includes('connected') || stdout.includes('already'));
                if (success) {
                    log(`Reconnected to ${DEVICE_ID}`, 'success');
                }
                resolve(success);
            });
        });
    }
    return connected;
}

// Execute ADB command (with auto-reconnect)
function adb(command) {
    return new Promise(async (resolve, reject) => {
        // Try to ensure connection before shell commands
        if (command.startsWith('shell')) {
            await ensureConnected();
        }

        // Use -s flag to target specific device (works for both USB serial and IP:port)
        const fullCommand = `"${ADB_PATH}" -s ${DEVICE_ID} ${command}`;
        log(`Executing: ${command}`, 'info', fullCommand);

        exec(fullCommand, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
            if (error && !stdout) {
                log(`Error: ${error.message}`, 'error');
                reject({ error: error.message, stderr });
            } else {
                resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
            }
        });
    });
}

// API Handlers
const handlers = {
    // Connection
    async connect(params) {
        const ip = params.ip || DEVICE_ID;
        DEVICE_ID = ip;

        try {
            // Kill existing server and reconnect
            await adb('kill-server');
            await adb('start-server');
            const result = await adb(`connect ${ip}`);

            if (result.stdout.includes('connected') || result.stdout.includes('already')) {
                log(`Connected to ${ip}`, 'success');
                return { success: true, message: result.stdout, ip };
            } else {
                throw new Error(result.stdout || 'Connection failed');
            }
        } catch (e) {
            log(`Connection failed: ${e.message}`, 'error');
            return { success: false, error: e.message };
        }
    },

    async disconnect() {
        const result = await adb('disconnect');
        log('Disconnected', 'info');
        return { success: true, message: result.stdout };
    },

    async status() {
        try {
            const result = await adb('devices -l');
            const connected = result.stdout.includes(DEVICE_ID) && !result.stdout.includes('offline');
            return {
                connected,
                devices: result.stdout,
                ip: DEVICE_ID
            };
        } catch (e) {
            return { connected: false, error: e.message };
        }
    },

    // Device Info
    async deviceInfo() {
        try {
            // Get basic device info
            const [model, android, build, serial, manufacturer, brand] = await Promise.all([
                adb('shell getprop ro.product.model'),
                adb('shell getprop ro.build.version.release'),
                adb('shell getprop ro.build.display.id'),
                adb('shell getprop ro.serialno'),
                adb('shell getprop ro.product.manufacturer'),
                adb('shell getprop ro.product.brand')
            ]);

            // Detect vendor-specific UI version
            let vendorUI = '';
            let vendorUIVersion = '';
            const mfr = manufacturer.stdout.toLowerCase();
            const brandLower = brand.stdout.toLowerCase();

            if (mfr.includes('xiaomi') || brandLower.includes('redmi') || brandLower.includes('poco')) {
                // Xiaomi/MIUI/HyperOS
                const miui = await adb('shell getprop ro.miui.ui.version.name');
                const hyperos = await adb('shell getprop ro.mi.os.version.name');
                if (hyperos.stdout.trim()) {
                    vendorUI = 'HyperOS';
                    vendorUIVersion = hyperos.stdout;
                } else if (miui.stdout.trim()) {
                    vendorUI = 'MIUI';
                    vendorUIVersion = miui.stdout;
                }
            } else if (mfr.includes('oppo') || mfr.includes('realme') || brandLower.includes('oppo') || brandLower.includes('realme')) {
                // Oppo/ColorOS/Realme
                const coloros = await adb('shell getprop ro.build.version.opporom');
                if (coloros.stdout.trim()) {
                    vendorUI = 'ColorOS';
                    vendorUIVersion = coloros.stdout;
                }
            } else if (mfr.includes('oneplus')) {
                // OnePlus/OxygenOS
                const oxygen = await adb('shell getprop ro.oxygen.version');
                const hydrogen = await adb('shell getprop ro.rom.version');
                if (oxygen.stdout.trim()) {
                    vendorUI = 'OxygenOS';
                    vendorUIVersion = oxygen.stdout;
                } else if (hydrogen.stdout.trim()) {
                    vendorUI = 'HydrogenOS';
                    vendorUIVersion = hydrogen.stdout;
                }
            } else if (mfr.includes('samsung')) {
                // Samsung/OneUI
                const oneui = await adb('shell getprop ro.build.version.oneui');
                if (oneui.stdout.trim()) {
                    vendorUI = 'One UI';
                    vendorUIVersion = oneui.stdout;
                }
            } else if (mfr.includes('google')) {
                vendorUI = 'Pixel';
                vendorUIVersion = 'Stock Android';
            }

            return {
                model: model.stdout,
                android: android.stdout,
                build: build.stdout,
                serial: serial.stdout,
                manufacturer: manufacturer.stdout,
                brand: brand.stdout,
                vendorUI,
                vendorUIVersion
            };
        } catch (e) {
            return { error: e.message };
        }
    },

    // Cache for app display names (reduces ADB calls)
    _appNameCache: {},
    _cacheTime: 0,

    // Get app display name from package - use known apps dictionary
    getAppLabel(pkg) {
        // Check known apps first, then generate from package name
        if (knownApps[pkg]) {
            return knownApps[pkg];
        }
        // Generate readable name from package
        const parts = pkg.split('.');
        const lastPart = parts[parts.length - 1];
        return lastPart
            .replace(/([A-Z])/g, ' $1')
            .replace(/_/g, ' ')
            .replace(/^\s+/, '')
            .split(' ')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ');
    },

    // Bulk fetch app labels using a faster method
    async fetchAppLabels() {
        const now = Date.now();
        // Cache for 5 minutes
        if (now - this._cacheTime < 300000 && Object.keys(this._appNameCache).length > 0) {
            return this._appNameCache;
        }

        log('Fetching app display names...', 'info');

        try {
            // Get package list - simple command that works on Windows
            const result = await adb('shell pm list packages --user 0');
            const packages = result.stdout.split('\n')
                .filter(line => line.startsWith('package:'))
                .map(line => line.replace('package:', '').trim())
                .filter(p => p);

            // Use our known apps dictionary + generate readable names from package names
            // This avoids the complex shell commands that fail on Windows
            for (const pkg of packages) {
                if (!this._appNameCache[pkg]) {
                    // Check known apps first
                    if (knownApps[pkg]) {
                        this._appNameCache[pkg] = knownApps[pkg];
                    } else {
                        // Create human-readable name from package name
                        const parts = pkg.split('.');
                        const lastPart = parts[parts.length - 1];
                        // Convert camelCase or snake_case to Title Case
                        const readable = lastPart
                            .replace(/([A-Z])/g, ' $1')
                            .replace(/_/g, ' ')
                            .replace(/^\s+/, '')
                            .split(' ')
                            .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                            .join(' ');
                        this._appNameCache[pkg] = readable;
                    }
                }
            }

            this._cacheTime = now;
            log(`Cached ${Object.keys(this._appNameCache).length} app names`, 'success');
        } catch (e) {
            log(`Error fetching app labels: ${e.message}`, 'error');
        }

        return this._appNameCache;
    },

    // Get app labels - simplified for Windows compatibility
    async getAppLabelsFromDevice() {
        // Just return our known apps dictionary - complex shell commands don't work on Windows
        return { ...knownApps };
    },

    // Packages
    async listPackages(params) {
        const type = params.type || 'all';
        // Use --user 0 to only show packages installed for current user
        let cmd = 'shell pm list packages -f --user 0';

        if (type === 'system') cmd = 'shell pm list packages -s --user 0';
        else if (type === 'user') cmd = 'shell pm list packages -3 --user 0';
        else if (type === 'disabled') cmd = 'shell pm list packages -d --user 0';

        const result = await adb(cmd);

        // Fetch app labels
        await this.fetchAppLabels();
        const deviceLabels = await this.getAppLabelsFromDevice();

        // Merge labels - prefer device labels over generated ones
        const allLabels = { ...this._appNameCache, ...deviceLabels };

        // Use global knownApps for display names

        const packages = result.stdout.split('\n')
            .filter(line => line.startsWith('package:'))
            .map(line => {
                const match = line.match(/package:(.+)=(.+)/);
                let pkg, path;
                if (match) {
                    path = match[1];
                    pkg = match[2];
                } else {
                    pkg = line.replace('package:', '').trim();
                }

                // Get display name from various sources
                let displayName = knownApps[pkg] || allLabels[pkg] || null;

                // If no label found, generate a readable name from package
                if (!displayName) {
                    const parts = pkg.split('.');
                    const lastPart = parts[parts.length - 1];
                    displayName = lastPart
                        .replace(/([A-Z])/g, ' $1')
                        .replace(/_/g, ' ')
                        .replace(/^\s+/, '')
                        .split(' ')
                        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                        .join(' ');
                }

                return { path, pkg, displayName };
            });

        return { packages, count: packages.length };
    },

    async packageInfo(params) {
        const pkg = params.pkg;
        const result = await adb(`shell dumpsys package ${pkg}`);

        // Extract permissions
        const permMatch = result.stdout.match(/requested permissions:\s*([\s\S]*?)(?:install permissions:|User 0:)/);
        const permissions = permMatch ?
            permMatch[1].split('\n')
                .map(p => p.trim())
                .filter(p => p && !p.startsWith('--'))
            : [];

        return {
            pkg,
            dump: result.stdout,
            permissions
        };
    },

    // Analyze package dependencies - what depends on this package and what it depends on
    async packageDependencies(params) {
        const pkg = params.pkg;
        log(`Analyzing dependencies for ${pkg}...`, 'info');

        try {
            // Get the package dump for detailed analysis
            const dumpResult = await adb(`shell dumpsys package ${pkg}`);
            const dump = dumpResult.stdout;

            // ===== PERMISSIONS ANALYSIS =====
            const permissions = {
                requested: [],
                granted: [],
                denied: [],
                dangerous: []  // Permissions that need runtime approval
            };

            // Known dangerous permissions (require user approval)
            const dangerousPermissions = [
                'READ_CONTACTS', 'WRITE_CONTACTS', 'GET_ACCOUNTS',
                'READ_CALL_LOG', 'WRITE_CALL_LOG', 'PROCESS_OUTGOING_CALLS',
                'READ_PHONE_STATE', 'READ_PHONE_NUMBERS', 'CALL_PHONE', 'ANSWER_PHONE_CALLS',
                'READ_SMS', 'SEND_SMS', 'RECEIVE_SMS', 'RECEIVE_MMS', 'RECEIVE_WAP_PUSH',
                'READ_CALENDAR', 'WRITE_CALENDAR',
                'CAMERA', 'RECORD_AUDIO',
                'ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION', 'ACCESS_BACKGROUND_LOCATION',
                'READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE', 'ACCESS_MEDIA_LOCATION',
                'BODY_SENSORS', 'ACTIVITY_RECOGNITION',
                'READ_MEDIA_IMAGES', 'READ_MEDIA_VIDEO', 'READ_MEDIA_AUDIO'
            ];

            // Parse requested permissions
            const reqPermsMatch = dump.match(/requested permissions:\s*([\s\S]*?)(?:install permissions:|runtime permissions:|$)/i);
            if (reqPermsMatch) {
                const permLines = reqPermsMatch[1].split('\n');
                for (const line of permLines) {
                    const permMatch = line.match(/android\.permission\.(\w+)/);
                    if (permMatch) {
                        const perm = permMatch[1];
                        permissions.requested.push(perm);
                        if (dangerousPermissions.includes(perm)) {
                            permissions.dangerous.push(perm);
                        }
                    }
                }
            }

            // Parse granted/denied runtime permissions
            const runtimeMatch = dump.match(/runtime permissions:\s*([\s\S]*?)(?:\n\s*[A-Z]|\n\n|$)/i);
            if (runtimeMatch) {
                const permLines = runtimeMatch[1].split('\n');
                for (const line of permLines) {
                    const permGranted = line.match(/android\.permission\.(\w+).*granted=true/);
                    const permDenied = line.match(/android\.permission\.(\w+).*granted=false/);
                    if (permGranted) {
                        permissions.granted.push(permGranted[1]);
                    } else if (permDenied) {
                        permissions.denied.push(permDenied[1]);
                    }
                }
            }

            // ===== NETWORK CONNECTIONS =====
            let networkInfo = {
                hasInternetPermission: permissions.requested.includes('INTERNET'),
                hasNetworkStatePermission: permissions.requested.includes('ACCESS_NETWORK_STATE'),
                activeConnections: [],
                listeningPorts: []
            };
            try {
                // Get UID for this package
                const uidMatch = dump.match(/userId=(\d+)/);
                const uid = uidMatch ? uidMatch[1] : null;

                if (uid) {
                    // Check network policy for this package
                    const policyResult = await adb(`shell dumpsys netpolicy | grep -A2 "uid=${uid}" 2>/dev/null || echo ""`);
                    if (policyResult.stdout.includes('REJECT_METERED')) {
                        networkInfo.meteredRestricted = true;
                    }
                    if (policyResult.stdout.includes('REJECT_ALL')) {
                        networkInfo.backgroundRestricted = true;
                    }

                    // Try to get active connections - use lsof if available
                    try {
                        const lsofResult = await adb(`shell "lsof -i -n 2>/dev/null | grep ${uid} || echo ''"`);
                        if (lsofResult.stdout.trim()) {
                            const lines = lsofResult.stdout.trim().split('\n');
                            for (const line of lines) {
                                const parts = line.split(/\s+/);
                                if (parts.length >= 9) {
                                    networkInfo.activeConnections.push({
                                        protocol: parts[7]?.includes('TCP') ? 'TCP' : 'UDP',
                                        connection: parts[8] || 'unknown'
                                    });
                                }
                            }
                        }
                    } catch (e) {
                        // lsof may not be available
                    }
                }
            } catch (e) {
                log(`Network analysis partial: ${e.message}`, 'info');
            }

            // ===== RUNNING SERVICES =====
            let runningServices = [];
            try {
                const servicesResult = await adb(`shell dumpsys activity services ${pkg} 2>/dev/null`);
                const servicesOutput = servicesResult.stdout;

                // Parse running services
                const serviceMatches = servicesOutput.matchAll(/\* ServiceRecord\{[^}]+\s+([^\s}]+)\}/g);
                for (const match of serviceMatches) {
                    runningServices.push(match[1]);
                }

                // Also check for foreground services
                if (servicesOutput.includes('isForeground=true')) {
                    // Mark this package as having foreground services
                }
            } catch (e) {
                log(`Services analysis error: ${e.message}`, 'info');
            }

            // ===== PERSISTENT/BACKGROUND STATUS =====
            let persistentInfo = {
                isPersistent: false,
                hasBootReceiver: false,
                hasForegroundService: false,
                batteryOptimization: 'unknown'
            };

            // Check if app is persistent
            if (dump.includes('persistent=true') || dump.includes('FLAG_PERSISTENT')) {
                persistentInfo.isPersistent = true;
            }

            // Check for RECEIVE_BOOT_COMPLETED permission (auto-starts on boot)
            if (permissions.requested.includes('RECEIVE_BOOT_COMPLETED')) {
                persistentInfo.hasBootReceiver = true;
            }

            // Check battery optimization status
            try {
                const batteryResult = await adb(`shell dumpsys deviceidle whitelist | grep ${pkg}`);
                if (batteryResult.stdout.includes(pkg)) {
                    persistentInfo.batteryOptimization = 'whitelisted';
                } else {
                    persistentInfo.batteryOptimization = 'optimized';
                }
            } catch (e) {
                // Ignore
            }

            // ===== DATA USAGE INFO =====
            let dataUsage = { foreground: 0, background: 0 };
            try {
                const uidMatch = dump.match(/userId=(\d+)/);
                if (uidMatch) {
                    const statsResult = await adb(`shell dumpsys netstats | grep -A10 "uid=${uidMatch[1]}" 2>/dev/null || echo ""`);
                    // Parse data usage if available
                    const rxMatch = statsResult.stdout.match(/rb=(\d+)/);
                    const txMatch = statsResult.stdout.match(/tb=(\d+)/);
                    if (rxMatch) dataUsage.received = parseInt(rxMatch[1]);
                    if (txMatch) dataUsage.transmitted = parseInt(txMatch[1]);
                }
            } catch (e) {
                // Ignore
            }

            // Extract uses-library dependencies
            const usesLibraries = [];
            const libMatch = dump.match(/usesLibraries:\s*([\s\S]*?)(?:\n\s*\w|$)/);
            if (libMatch) {
                const libs = libMatch[1].split('\n').map(l => l.trim()).filter(l => l);
                usesLibraries.push(...libs);
            }

            // Extract static shared libraries
            const staticLibs = [];
            const staticMatch = dump.match(/usesStaticLibraries:\s*([\s\S]*?)(?:\n\s*\w|$)/);
            if (staticMatch) {
                const libs = staticMatch[1].split('\n').map(l => l.trim()).filter(l => l);
                staticLibs.push(...libs);
            }

            // Extract shared user ID - packages with same sharedUserId are tightly coupled
            let sharedUserId = null;
            const sharedMatch = dump.match(/sharedUser=SharedUserSetting\{[^}]*\s+([^/\s]+)/);
            if (sharedMatch) {
                sharedUserId = sharedMatch[1];
            }

            // Get all packages to find reverse dependencies
            const allPkgsResult = await adb('shell pm list packages --user 0');
            const allPackages = allPkgsResult.stdout.split('\n')
                .filter(l => l.startsWith('package:'))
                .map(l => l.replace('package:', '').trim())
                .filter(p => p && p !== pkg);

            // Find packages with same shared user ID (reverse dependencies)
            const sameSharedUser = [];

            // Check for packages with same shared user ID
            if (sharedUserId) {
                log(`Checking for packages with shared user ID: ${sharedUserId}`, 'info');
                // Sample check - check related packages by name pattern
                const relatedPkgs = allPackages.filter(p => {
                    const basePkg = pkg.split('.').slice(0, 2).join('.');
                    return p.startsWith(basePkg);
                });

                for (const relPkg of relatedPkgs.slice(0, 10)) {
                    try {
                        const relDump = await adb(`shell dumpsys package ${relPkg}`);
                        if (relDump.stdout.includes(sharedUserId)) {
                            sameSharedUser.push(relPkg);
                        }
                    } catch (e) { /* skip */ }
                }
            }

            // Check for content provider dependencies
            const providesAuthorities = [];
            const authMatch = dump.matchAll(/Provider\{[^}]*\s+([^\s}]+)\}/g);
            for (const m of authMatch) {
                providesAuthorities.push(m[1]);
            }

            // Note: Content provider analysis would require deeper APK inspection

            // Known critical dependencies map for Xiaomi/Android system
            const criticalDependencies = {
                'com.google.android.gms': {
                    description: 'Google Play Services - Core for Google APIs',
                    dependents: ['Most Google apps', 'Apps using Google Sign-In', 'Apps using FCM push', 'Apps using Google Maps'],
                    safeToRemove: false
                },
                'com.google.android.gsf': {
                    description: 'Google Services Framework - Core for Play Store',
                    dependents: ['Google Play Store', 'Google Play Services', 'All Google apps'],
                    safeToRemove: false
                },
                'com.xiaomi.xmsf': {
                    description: 'Xiaomi Service Framework - Push notifications',
                    dependents: ['MIUI apps using push notifications', 'Mi Cloud', 'Find Device'],
                    safeToRemove: true,
                    impact: 'Push notifications for Xiaomi apps may stop working'
                },
                'com.miui.securitycenter': {
                    description: 'MIUI Security Center - Core security features',
                    dependents: ['Permission manager', 'Battery saver', 'Cleaner', 'App lock'],
                    safeToRemove: false,
                    impact: 'Many MIUI features will break'
                },
                'com.lbe.security.miui': {
                    description: 'Permission/Privacy manager',
                    dependents: ['Security Center', 'Permission popups'],
                    safeToRemove: false,
                    impact: 'Permission management will break'
                },
                'com.miui.daemon': {
                    description: 'MIUI background service daemon',
                    dependents: ['Various MIUI system features', 'Push service'],
                    safeToRemove: true,
                    impact: 'Some MIUI background features may stop'
                },
                'com.xiaomi.finddevice': {
                    description: 'Find Device / Remote lock/wipe',
                    dependents: [],
                    safeToRemove: true,
                    impact: 'Cannot remotely locate/lock/wipe device'
                },
                'com.miui.cloudservice': {
                    description: 'Mi Cloud sync service',
                    dependents: ['Cloud backup', 'Photo sync', 'Contact sync'],
                    safeToRemove: true,
                    impact: 'Mi Cloud features will stop'
                },
                'com.miui.analytics': {
                    description: 'MIUI telemetry/analytics',
                    dependents: [],
                    safeToRemove: true,
                    impact: 'None - just stops sending data to Xiaomi'
                },
                'com.miui.msa.global': {
                    description: 'MIUI System Ads',
                    dependents: [],
                    safeToRemove: true,
                    impact: 'Ads in MIUI apps will stop'
                },
                'com.xiaomi.account': {
                    description: 'Mi Account service',
                    dependents: ['Mi Cloud', 'Find Device', 'Mi Store purchases', 'Theme store'],
                    safeToRemove: true,
                    impact: 'Mi Account features will not work'
                },
                'com.miui.home': {
                    description: 'MIUI Launcher',
                    dependents: ['Home screen', 'App drawer', 'Widgets'],
                    safeToRemove: false,
                    impact: 'No home screen - must install alternative first!'
                },
                'com.miui.powerkeeper': {
                    description: 'Battery/Power management',
                    dependents: ['Battery optimization', 'App standby'],
                    safeToRemove: true,
                    impact: 'Battery optimization features will use AOSP defaults'
                },
                'com.miui.guardprovider': {
                    description: 'Antivirus/Guard service',
                    dependents: ['Security Center antivirus'],
                    safeToRemove: true,
                    impact: 'Built-in antivirus will stop'
                }
            };

            // Build response
            const knownInfo = criticalDependencies[pkg] || null;

            // Determine overall safety
            let safetyLevel = 'unknown';
            let safetyReason = 'No dependency information available for this package';

            if (knownInfo) {
                safetyLevel = knownInfo.safeToRemove ? 'safe' : 'dangerous';
                safetyReason = knownInfo.impact || knownInfo.description;
            } else if (pkg.includes('google.android')) {
                safetyLevel = 'caution';
                safetyReason = 'Google system package - may affect Google services';
            } else if (pkg.includes('miui') || pkg.includes('xiaomi')) {
                safetyLevel = 'caution';
                safetyReason = 'Xiaomi system package - may affect MIUI features';
            } else if (pkg.includes('android.') && !pkg.includes('com.android.')) {
                safetyLevel = 'dangerous';
                safetyReason = 'Core Android system package';
            }

            log(`Dependency analysis complete for ${pkg}`, 'success');

            return {
                pkg,
                displayName: knownApps[pkg] || this.getAppLabel(pkg),
                knownInfo,
                safetyLevel,
                safetyReason,
                permissions,
                networkInfo,
                runningServices,
                persistentInfo,
                dataUsage,
                dependencies: {
                    usesLibraries,
                    staticLibs,
                    sharedUserId,
                    sameSharedUser,
                    providesAuthorities
                },
                recommendations: this._getRemovalRecommendation(pkg, knownInfo, safetyLevel)
            };
        } catch (e) {
            log(`Dependency analysis error: ${e.message}`, 'error');
            return { pkg, error: e.message };
        }
    },

    // Helper to generate removal recommendations
    _getRemovalRecommendation(pkg, knownInfo, safetyLevel) {
        const recommendations = [];

        if (safetyLevel === 'dangerous') {
            recommendations.push({
                action: 'DO NOT REMOVE',
                reason: 'This package is critical for system operation',
                icon: '🚫'
            });
        } else if (safetyLevel === 'safe') {
            recommendations.push({
                action: 'Safe to disable/remove',
                reason: knownInfo?.impact || 'No critical dependencies',
                icon: '✅'
            });
        } else if (safetyLevel === 'caution') {
            recommendations.push({
                action: 'Disable first, test before removing',
                reason: 'May affect some system features',
                icon: '⚠️'
            });
        }

        // Add specific recommendations based on package type
        if (pkg.includes('analytics') || pkg.includes('msa') || pkg.includes('joyose')) {
            recommendations.push({
                action: 'Recommended to remove',
                reason: 'Telemetry/advertising package',
                icon: '👍'
            });
        }

        if (pkg.includes('finddevice')) {
            recommendations.push({
                action: 'Consider implications',
                reason: 'Removing disables remote lock/wipe capability',
                icon: '🔐'
            });
        }

        return recommendations;
    },

    // Bulk analyze dependencies for multiple packages
    async bulkPackageDependencies(params) {
        const packages = params.packages || [];
        log(`Bulk analyzing ${packages.length} packages...`, 'info');

        const results = [];
        for (const pkg of packages) {
            const result = await this.packageDependencies({ pkg });
            results.push(result);
        }

        return { results };
    },

    // Get detailed install info for all packages (pre-installed vs updated vs user-installed)
    async packageInstallInfo() {
        log('Analyzing package install dates...', 'info');

        try {
            // Step 1: Get list of all packages
            const pkgListResult = await adb('shell pm list packages --user 0');
            const packageNames = pkgListResult.stdout.split('\n')
                .filter(l => l.startsWith('package:'))
                .map(l => l.replace('package:', '').trim());

            const totalPkgs = packageNames.length;
            log(`Found ${totalPkgs} packages, analyzing install info...`, 'info');

            const packages = [];
            let processed = 0;

            // Step 2: Get install info for each package in batches
            // Process in chunks to avoid overwhelming the device
            const chunkSize = 20;
            for (let i = 0; i < packageNames.length; i += chunkSize) {
                const chunk = packageNames.slice(i, i + chunkSize);

                // Build a simpler command that works on Windows
                // Use a single dumpsys call per package
                for (const pkg of chunk) {
                    processed++;
                    // Log progress every 10 packages
                    if (processed % 10 === 0 || processed === totalPkgs) {
                        log(`Analyzing packages: ${processed}/${totalPkgs} (${Math.round(processed/totalPkgs*100)}%)`, 'info');
                    }
                    try {
                        const result = await adb(`shell dumpsys package ${pkg}`);
                        const output = result.stdout;

                        // Parse the output
                        let firstInstall = null;
                        let lastUpdate = null;
                        let installer = null;

                        // Look for firstInstallTime
                        const firstMatch = output.match(/firstInstallTime=([^\s\n]+)/);
                        if (firstMatch) firstInstall = firstMatch[1];

                        // Look for lastUpdateTime
                        const lastMatch = output.match(/lastUpdateTime=([^\s\n]+)/);
                        if (lastMatch) lastUpdate = lastMatch[1];

                        // Look for installerPackageName
                        const installerMatch = output.match(/installerPackageName=([^\s\n]+)/);
                        if (installerMatch && installerMatch[1] !== 'null') {
                            installer = installerMatch[1];
                        }

                        // Reference date: Pre-installed apps typically show 2009-01-01 or epoch dates
                        const preInstalledDate = new Date('2009-01-01').getTime();
                        const epochDate = new Date('1970-01-01').getTime();

                        // Determine install type
                        let installType = 'unknown';
                        let installSource = 'Unknown';
                        const firstDate = firstInstall ? new Date(firstInstall).getTime() : 0;

                        if (firstDate <= preInstalledDate || firstDate <= epochDate || !firstInstall || firstInstall.includes('1970') || firstInstall.includes('2009-01-01')) {
                            installType = 'pre-installed';
                            installSource = 'Factory ROM';
                        } else if (installer === 'com.android.vending') {
                            installType = 'play-store';
                            installSource = 'Play Store';
                        } else if (installer === 'com.xiaomi.mipicks' || installer === 'com.xiaomi.discover') {
                            installType = 'xiaomi-store';
                            installSource = 'GetApps/Mi Store';
                        } else if (installer === 'com.miui.packageinstaller' || installer === 'com.google.android.packageinstaller') {
                            installType = 'manual';
                            installSource = 'Manual Install (APK)';
                        } else if (installer === null && firstDate > preInstalledDate) {
                            installType = 'system-update';
                            installSource = 'System Update';
                        } else if (installer) {
                            installType = 'other';
                            installSource = installer;
                        }

                        // Check if updated since install
                        const wasUpdated = lastUpdate && firstInstall && lastUpdate !== firstInstall;

                        packages.push({
                            pkg,
                            firstInstall,
                            lastUpdate,
                            installer,
                            installType,
                            installSource,
                            wasUpdated
                        });
                    } catch (e) {
                        // Skip packages that fail
                        packages.push({
                            pkg,
                            firstInstall: null,
                            lastUpdate: null,
                            installer: null,
                            installType: 'unknown',
                            installSource: 'Unknown',
                            wasUpdated: false
                        });
                    }
                }
            }

            // Categorize packages
            const preInstalled = packages.filter(p => p.installType === 'pre-installed');
            const systemUpdates = packages.filter(p => p.installType === 'system-update');
            const playStore = packages.filter(p => p.installType === 'play-store');
            const xiaomiStore = packages.filter(p => p.installType === 'xiaomi-store');
            const manual = packages.filter(p => p.installType === 'manual');

            // Sort system updates by date (newest first)
            systemUpdates.sort((a, b) => {
                const dateA = a.firstInstall ? new Date(a.firstInstall).getTime() : 0;
                const dateB = b.firstInstall ? new Date(b.firstInstall).getTime() : 0;
                return dateB - dateA;
            });

            log(`Package analysis complete: ${preInstalled.length} pre-installed, ${systemUpdates.length} from updates, ${playStore.length} from Play Store`, 'success');

            return {
                packages,
                summary: {
                    total: packages.length,
                    preInstalled: preInstalled.length,
                    systemUpdates: systemUpdates.length,
                    playStore: playStore.length,
                    xiaomiStore: xiaomiStore.length,
                    manual: manual.length
                },
                preInstalled,
                systemUpdates,
                playStore,
                xiaomiStore,
                manual
            };
        } catch (e) {
            log(`Package install info error: ${e.message}`, 'error');
            return {
                packages: [],
                summary: { total: 0, preInstalled: 0, systemUpdates: 0, playStore: 0, xiaomiStore: 0, manual: 0 },
                preInstalled: [],
                systemUpdates: [],
                playStore: [],
                xiaomiStore: [],
                manual: [],
                error: e.message
            };
        }
    },

    async uninstallPackage(params) {
        const pkg = params.pkg;
        log(`Uninstalling ${pkg}`, 'warning');
        const result = await adb(`shell pm uninstall -k --user 0 ${pkg}`);

        // Rescan to verify removal - check packages for user 0 specifically
        log(`Verifying removal of ${pkg}...`, 'info');
        // Use pm list packages --user 0 to check only packages installed for current user
        const verifyResult = await adb(`shell pm list packages --user 0`);
        const stillInstalledForUser = verifyResult.stdout.split('\n').some(line =>
            line.trim() === `package:${pkg}`
        );

        const commandSuccess = result.stdout.includes('Success');
        const alreadyRemoved = result.stdout.includes('-1000'); // Error -1000 means already uninstalled for user
        const verified = !stillInstalledForUser;
        const success = commandSuccess || verified || alreadyRemoved;

        // If -1000 error, it's already removed for this user - that's success
        if (alreadyRemoved || (verified && !stillInstalledForUser)) {
            log(`✓ Already removed: ${pkg} is not installed for user 0`, 'success');
        } else if (commandSuccess && verified) {
            log(`✓ Verified: ${pkg} is no longer installed`, 'success');
        } else if (commandSuccess) {
            log(`⚠ Command succeeded but ${pkg} still appears in package list`, 'warning');
        } else {
            log(`✗ Failed to uninstall ${pkg}: ${result.stdout}`, 'error');
        }

        return {
            success,
            verified,
            alreadyRemoved,
            message: result.stdout,
            pkg,
            verificationStatus: (verified || alreadyRemoved)
                ? 'Package not installed for user 0'
                : 'Package still present'
        };
    },

    async disablePackage(params) {
        const pkg = params.pkg;
        log(`Disabling ${pkg}`, 'warning');
        const result = await adb(`shell pm disable-user --user 0 ${pkg}`);

        return { success: true, message: result.stdout, pkg };
    },

    async enablePackage(params) {
        const pkg = params.pkg;
        log(`Enabling ${pkg}`, 'info');
        const result = await adb(`shell pm enable ${pkg}`);

        return { success: true, message: result.stdout, pkg };
    },

    async restorePackage(params) {
        const pkg = params.pkg;
        log(`Restoring ${pkg}`, 'info');
        const result = await adb(`shell cmd package install-existing ${pkg}`);

        // Rescan to verify restoration
        log(`Verifying restoration of ${pkg}...`, 'info');
        const verifyResult = await adb(`shell pm list packages`);
        const isInstalled = verifyResult.stdout.split('\n').some(line =>
            line.trim() === `package:${pkg}`
        );

        const commandSuccess = result.stdout.includes('Success') || result.stdout.includes('installed');
        const verified = isInstalled;
        const success = commandSuccess || verified;

        if (verified) {
            log(`✓ Verified: ${pkg} is now installed`, 'success');
        } else {
            log(`✗ Failed to restore ${pkg}: ${result.stdout}`, 'error');
        }

        return {
            success,
            verified,
            message: result.stdout,
            pkg,
            verificationStatus: verified ? 'Package confirmed restored' : 'Package not found after restore'
        };
    },

    // Network
    async netstat() {
        // Use -W for wide output (prevents IP truncation) and -tn for TCP numeric
        // Wrap in quotes to ensure redirection happens on Android, not Windows
        const result = await adb('shell "netstat -tnW 2>/dev/null"');

        const connections = result.stdout.split('\n')
            .filter(line => {
                // Must start with tcp or tcp6 (skip headers and error lines)
                const trimmed = line.trim();
                return trimmed.startsWith('tcp') && (
                    trimmed.includes('ESTABLISHED') ||
                    trimmed.includes('LISTEN') ||
                    trimmed.includes('TIME_WAIT') ||
                    trimmed.includes('SYN_SENT') ||
                    trimmed.includes('FIN_WAIT') ||
                    trimmed.includes('CLOSE_WAIT') ||
                    trimmed.includes('LAST_ACK')
                );
            })
            .map(line => {
                const parts = line.trim().split(/\s+/);
                const local = parts[3] || parts[4] || '';
                const remote = parts[4] || parts[5] || '';

                // Parse IP:port - handle both IPv4 and IPv6-mapped addresses
                // IPv6 format: ::ffff:1.2.3.4:port or [::ffff:1.2.3.4]:port
                // IPv4 format: 1.2.3.4:port
                function parseAddress(addr) {
                    if (!addr) return { ip: '', port: '' };

                    // Handle IPv6-mapped IPv4: ::ffff:1.2.3.4:port
                    const ipv6MappedMatch = addr.match(/::ffff:(\d+\.\d+\.\d+\.\d+):(\d+)/i);
                    if (ipv6MappedMatch) {
                        return { ip: ipv6MappedMatch[1], port: ipv6MappedMatch[2] };
                    }

                    // Handle pure IPv4: 1.2.3.4:port
                    const ipv4Match = addr.match(/(\d+\.\d+\.\d+\.\d+):(\d+)/);
                    if (ipv4Match) {
                        return { ip: ipv4Match[1], port: ipv4Match[2] };
                    }

                    // Handle IPv6 with brackets: [::1]:port
                    const ipv6BracketMatch = addr.match(/\[([^\]]+)\]:(\d+)/);
                    if (ipv6BracketMatch) {
                        return { ip: ipv6BracketMatch[1], port: ipv6BracketMatch[2] };
                    }

                    // Fallback: last colon separates port
                    const lastColon = addr.lastIndexOf(':');
                    if (lastColon > 0) {
                        return { ip: addr.substring(0, lastColon), port: addr.substring(lastColon + 1) };
                    }

                    return { ip: addr, port: '' };
                }

                const localParsed = parseAddress(local);
                const remoteParsed = parseAddress(remote);

                return {
                    proto: parts[0],
                    local: local,
                    localIp: localParsed.ip,
                    localPort: localParsed.port,
                    remote: remote,
                    remoteIp: remoteParsed.ip,
                    remotePort: remoteParsed.port,
                    state: parts[5] || parts[6] || parts[1],
                    raw: line,
                    // Add known IP and port info
                    ipInfo: getKnownIpInfo(remoteParsed.ip),
                    portInfo: getPortInfo(remoteParsed.port)
                };
            });

        return { connections, raw: result.stdout };
    },

    async tcpConnections() {
        const result = await adb('shell cat /proc/net/tcp');
        return { raw: result.stdout };
    },

    async dnsInfo() {
        const [dns1, dns2] = await Promise.all([
            adb('shell getprop net.dns1'),
            adb('shell getprop net.dns2')
        ]);
        return { dns: [dns1.stdout, dns2.stdout] };
    },

    // DNS Cache Analysis - looks for C2 indicators
    // Note: Android 15/HyperOS doesn't expose DNS cache without root
    // We use alternative methods: connectivity dump, active connections, logcat
    async dnsAnalysis() {
        log('Analyzing network for DNS/C2 indicators...', 'info');

        // Collect data from multiple sources
        const results = await Promise.all([
            // Get DNS servers being used
            adb('shell getprop net.dns1').catch(() => ({ stdout: '' })),
            adb('shell getprop net.dns2').catch(() => ({ stdout: '' })),
            // Private DNS setting
            adb('shell settings get global private_dns_mode').catch(() => ({ stdout: '' })),
            adb('shell settings get global private_dns_specifier').catch(() => ({ stdout: '' })),
            // Check connectivity DNS
            adb('shell dumpsys connectivity').catch(() => ({ stdout: '' })),
            // Get active network connections
            adb('shell netstat -tn').catch(() => ({ stdout: '' })),
            // Get logcat DNS/network entries (recent)
            adb('shell logcat -d -t 500 -b main -s NetworkMonitor ConnectivityService').catch(() => ({ stdout: '' })),
        ]);

        const [dns1, dns2, privateDnsMode, privateDnsServer, connectivity, netstat, networkLogs] = results;

        const cacheEntries = [];
        const activeConnections = [];

        // Parse connectivity dump for DNS info and active networks
        const connLines = connectivity.stdout.split('\n');
        for (const line of connLines) {
            // Extract validated private DNS addresses
            const validatedMatch = line.match(/ValidatedPrivateDnsAddresses:\s*\[([^\]]+)\]/);
            if (validatedMatch) {
                // Private DNS is active and validated
            }

            // Look for domain references in connectivity
            const domainMatches = line.match(/([a-zA-Z0-9][-a-zA-Z0-9]*\.(?:xiaomi|miui|mi|alibaba|aliyun|qq|tencent|weixin|com\.cn|net\.cn)[a-zA-Z0-9.]*)/gi);
            if (domainMatches) {
                for (const domain of domainMatches) {
                    const d = domain.toLowerCase();
                    if (!cacheEntries.find(e => e.domain === d)) {
                        cacheEntries.push({
                            domain: d,
                            ip: 'N/A',
                            ipInfo: { owner: 'Unknown', country: '??', risk: 'unknown' },
                            suspicious: analyzeDomainForC2(d, '', {}),
                            source: 'connectivity'
                        });
                    }
                }
            }
        }

        // Parse netstat for active connections and reverse-lookup suspicious IPs
        const netstatLines = netstat.stdout.split('\n');
        for (const line of netstatLines) {
            // Match IPv4 connections
            const match = line.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d+)\s+(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d+)\s+(\w+)/);
            if (match) {
                const [, localIp, localPort, remoteIp, remotePort, state] = match;
                const ipInfo = getKnownIpInfo(remoteIp);
                const portInfo = getPortInfo(remotePort);

                activeConnections.push({
                    localIp, localPort,
                    remoteIp, remotePort,
                    state,
                    ipInfo,
                    portInfo
                });

                // If this is a suspicious IP, add as a "resolved domain"
                if (ipInfo.risk === 'high' || ipInfo.country === 'CN') {
                    cacheEntries.push({
                        domain: `[${remoteIp}]`,
                        ip: remoteIp,
                        ipInfo,
                        suspicious: {
                            isSuspicious: true,
                            reason: `Active connection to ${ipInfo.owner} (${ipInfo.country})`,
                            category: 'active-connection',
                            risk: ipInfo.risk
                        },
                        source: 'netstat'
                    });
                }
            }
        }

        // Parse network logs for domain resolutions
        const logLines = networkLogs.stdout.split('\n');
        for (const line of logLines) {
            // Look for domains in network logs
            const domainMatches = line.match(/([a-zA-Z0-9][-a-zA-Z0-9]{2,}\.(?:xiaomi|miui|mi|alibaba|aliyun|qq|tencent|com|net|org|cn)[a-zA-Z0-9.]*)/gi);
            if (domainMatches) {
                for (const domain of domainMatches) {
                    const d = domain.toLowerCase();
                    if (!cacheEntries.find(e => e.domain === d) && d.length > 5) {
                        const suspicious = analyzeDomainForC2(d, '', {});
                        cacheEntries.push({
                            domain: d,
                            ip: 'N/A',
                            ipInfo: { owner: 'Unknown', country: '??', risk: 'unknown' },
                            suspicious,
                            source: 'logcat'
                        });
                    }
                }
            }
        }

        // Extract DNS servers from connectivity dump
        const dnsServers = [];
        const dnsServerMatch = connectivity.stdout.match(/DnsAddresses:\s*\[([^\]]+)\]/g);
        if (dnsServerMatch) {
            for (const match of dnsServerMatch) {
                const ips = match.match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g);
                if (ips) {
                    for (const ip of ips) {
                        if (!dnsServers.find(s => s === ip)) {
                            dnsServers.push(ip);
                        }
                    }
                }
            }
        }
        if (dns1.stdout && dns1.stdout.trim()) dnsServers.push(dns1.stdout.trim());
        if (dns2.stdout && dns2.stdout.trim()) dnsServers.push(dns2.stdout.trim());

        // Also add Google's DNS from the validated private DNS
        const validatedDnsMatch = connectivity.stdout.match(/ValidatedPrivateDnsAddresses:\s*\[([^\]]+)\]/);
        if (validatedDnsMatch) {
            const ips = validatedDnsMatch[1].match(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g);
            if (ips) {
                for (const ip of ips) {
                    if (!dnsServers.find(s => s === ip)) {
                        dnsServers.push(ip);
                    }
                }
            }
        }

        // Add suspicious connections as entries (helps identify C2 traffic)
        for (const conn of activeConnections) {
            if (conn.portInfo.risk === 'high') {
                const existing = cacheEntries.find(e => e.ip === conn.remoteIp);
                if (!existing) {
                    cacheEntries.push({
                        domain: `[Connection:${conn.remotePort}]`,
                        ip: conn.remoteIp,
                        ipInfo: conn.ipInfo,
                        suspicious: {
                            isSuspicious: true,
                            reason: `${conn.portInfo.service}: ${conn.portInfo.desc}`,
                            category: 'suspicious-port',
                            risk: 'high'
                        },
                        source: 'netstat'
                    });
                }
            }
        }

        // Categorize entries
        const xiaomiDomains = cacheEntries.filter(e =>
            e.domain.match(/xiaomi|miui|mi\.|mipush|xmpush/i) ||
            (e.ipInfo && (e.ipInfo.owner === 'Xiaomi' || e.ipInfo.owner?.includes('Xiaomi')))
        );
        const alibabaDomains = cacheEntries.filter(e =>
            e.domain.match(/alibaba|aliyun|taobao|alicdn|alipay/i) ||
            (e.ipInfo && e.ipInfo.owner?.includes('Alibaba'))
        );
        const tencentDomains = cacheEntries.filter(e =>
            e.domain.match(/qq\.|tencent|weixin|wechat/i) ||
            (e.ipInfo && e.ipInfo.owner === 'Tencent')
        );
        const suspiciousDomains = cacheEntries.filter(e => e.suspicious && e.suspicious.isSuspicious);

        log(`DNS analysis complete: ${cacheEntries.length} entries, ${suspiciousDomains.length} suspicious, ${activeConnections.length} active connections`, 'success');

        return {
            dnsServers: [...new Set(dnsServers)].map(ip => ({
                ip,
                info: getKnownIpInfo(ip)
            })),
            privateDns: {
                mode: privateDnsMode.stdout.trim() || 'off',
                server: privateDnsServer.stdout.trim() || null
            },
            activeConnections: activeConnections.slice(0, 50),
            cache: {
                total: cacheEntries.length,
                entries: cacheEntries.slice(0, 100),
                xiaomi: xiaomiDomains,
                alibaba: alibabaDomains,
                tencent: tencentDomains,
                suspicious: suspiciousDomains
            },
            raw: {
                connectivity: connectivity.stdout.slice(0, 3000),
                netstat: netstat.stdout.slice(0, 2000)
            }
        };
    },

    // Processes
    async processes() {
        // Get detailed process info with more columns
        const result = await adb('shell ps -A -o PID,PPID,USER,RSS,VSZ,%CPU,STAT,CMDLINE,NAME');

        // Ensure we have app labels cached
        await this.fetchAppLabels();

        // Uses global knownApps for display names

        // Process state codes explanation
        const stateDescriptions = {
            'R': 'Running',
            'S': 'Sleeping (interruptible)',
            'D': 'Disk sleep (uninterruptible)',
            'T': 'Stopped',
            'Z': 'Zombie',
            't': 'Tracing stop',
            'X': 'Dead',
            'I': 'Idle',
            'K': 'Wakekill',
            'W': 'Waking',
            'P': 'Parked'
        };

        // Known high-risk process patterns
        const highRiskPatterns = [
            { pattern: /xiaomi|miui/i, risk: 'high', category: 'xiaomi' },
            { pattern: /finddevice/i, risk: 'critical', category: 'remote-control' },
            { pattern: /xmsf|mipush/i, risk: 'high', category: 'push-service' },
            { pattern: /analytics|tracking|telemetry/i, risk: 'high', category: 'telemetry' },
            { pattern: /cloud.*sync|backup/i, risk: 'medium', category: 'cloud' },
            { pattern: /facebook/i, risk: 'medium', category: 'facebook' },
            { pattern: /alibaba|alipay/i, risk: 'medium', category: 'alibaba' },
            { pattern: /tencent|qq\./i, risk: 'medium', category: 'tencent' },
        ];

        const processes = result.stdout.split('\n')
            .slice(1) // Skip header
            .filter(line => line.trim())
            .map(line => {
                const parts = line.trim().split(/\s+/);
                const pid = parts[0];
                const ppid = parts[1];
                const user = parts[2];
                const rss = parts[3]; // Resident memory in KB
                const vsz = parts[4]; // Virtual memory
                const cpu = parts[5];
                const stat = parts[6] || '';
                // CMDLINE and NAME may contain spaces, join remaining
                const cmdAndName = parts.slice(7).join(' ');
                const name = parts[parts.length - 1] || cmdAndName;

                // Parse state
                const stateCode = stat.charAt(0);
                const stateDesc = stateDescriptions[stateCode] || 'Unknown';
                const isNice = stat.includes('N');
                const isLowPriority = stat.includes('<');
                const isLocked = stat.includes('L');
                const isSessionLeader = stat.includes('s');
                const isMultiThreaded = stat.includes('l');
                const isForeground = stat.includes('+');

                // Determine package name from process name
                // Process names can be: com.example.app, com.example.app:service, or com.example.app.persistent
                // Note: .service IS often part of real package names (e.g., com.milink.service)
                // Also handle underscored process names like .omadm_client_process
                let pkg = null;
                if (name && name.includes('.')) {
                    // Most Android process names are package names or start with them
                    pkg = name.split(':')[0]; // Handle service processes like com.xiaomi.xmsf:push
                    // Remove common Android process suffixes that aren't part of actual package names
                    // Note: .service is NOT removed as it's commonly part of real package names
                    pkg = pkg
                        .replace(/\.(persistent|unstable|remote|process|isolated|ui)$/i, '')
                        .replace(/\.isolated\d+$/i, '') // e.g., .isolated0, .isolated1
                        .replace(/\.[a-z_]+_process$/i, '') // e.g., .omadm_client_process
                        .replace(/_(zygote|sandboxed|privileged)\d*$/i, ''); // e.g., _zygote, _sandboxed0
                }

                // Get display name
                let displayName = null;
                if (pkg) {
                    displayName = knownApps[pkg] || this._appNameCache[pkg] || null;
                }
                if (!displayName && name) {
                    displayName = knownApps[name] || null;
                }
                // Generate readable name from package if no known name
                if (!displayName && pkg) {
                    const parts = pkg.split('.');
                    const lastPart = parts[parts.length - 1];
                    displayName = lastPart
                        .replace(/([A-Z])/g, ' $1')
                        .replace(/_/g, ' ')
                        .replace(/^\s+/, '')
                        .split(' ')
                        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                        .join(' ');
                }

                // Check risk level
                let risk = 'low';
                let category = 'system';
                for (const pattern of highRiskPatterns) {
                    if (pattern.pattern.test(name) || pattern.pattern.test(cmdAndName)) {
                        risk = pattern.risk;
                        category = pattern.category;
                        break;
                    }
                }

                // Google processes are generally safe
                if (/google|android\.gms|gservices/i.test(name)) {
                    risk = 'low';
                    category = 'google';
                }

                // System processes
                if (user === 'root' || user === 'system') {
                    if (risk !== 'high' && risk !== 'critical') {
                        category = 'system';
                    }
                }

                return {
                    pid,
                    ppid,
                    user,
                    name,
                    displayName,
                    pkg,
                    memory: rss ? `${Math.round(parseInt(rss) / 1024)}MB` : 'N/A',
                    memoryKB: parseInt(rss) || 0,
                    virtualMem: vsz ? `${Math.round(parseInt(vsz) / 1024)}MB` : 'N/A',
                    cpu: cpu || '0%',
                    state: stateCode,
                    stateDesc,
                    stateFull: stat,
                    stateFlags: {
                        nice: isNice,
                        lowPriority: isLowPriority,
                        locked: isLocked,
                        sessionLeader: isSessionLeader,
                        multiThreaded: isMultiThreaded,
                        foreground: isForeground
                    },
                    risk,
                    category,
                    cmdline: cmdAndName
                };
            });

        // Categorize processes
        const xiaomiProcs = processes.filter(p => p.category === 'xiaomi' || p.category === 'remote-control' || p.category === 'push-service');
        const highRiskProcs = processes.filter(p => p.risk === 'high' || p.risk === 'critical');
        const telemetryProcs = processes.filter(p => p.category === 'telemetry');

        // Sort by memory usage
        const sortedByMem = [...processes].sort((a, b) => b.memoryKB - a.memoryKB);

        return {
            processes,
            count: processes.length,
            xiaomi: xiaomiProcs,
            highRisk: highRiskProcs,
            telemetry: telemetryProcs,
            topMemory: sortedByMem.slice(0, 20),
            summary: {
                total: processes.length,
                xiaomi: xiaomiProcs.length,
                highRisk: highRiskProcs.length,
                running: processes.filter(p => p.state === 'R').length,
                sleeping: processes.filter(p => p.state === 'S').length
            }
        };
    },

    // Shell command
    async shell(params) {
        const cmd = params.cmd;
        if (!cmd) return { error: 'No command provided' };

        log(`Shell: ${cmd}`, 'info');
        const result = await adb(`shell ${cmd}`);

        return { output: result.stdout, stderr: result.stderr };
    },

    // Batch operations
    async batchUninstall(params) {
        const packages = params.packages || [];
        const results = [];

        for (const pkg of packages) {
            try {
                const result = await handlers.uninstallPackage({ pkg });
                results.push({ pkg, ...result });
            } catch (e) {
                results.push({ pkg, success: false, error: e.message });
            }
        }

        return { results };
    },

    async batchDisable(params) {
        const packages = params.packages || [];
        const results = [];

        for (const pkg of packages) {
            try {
                const result = await handlers.disablePackage({ pkg });
                results.push({ pkg, ...result });
            } catch (e) {
                results.push({ pkg, success: false, error: e.message });
            }
        }

        return { results };
    },

    // CPU Monitoring - per-core usage and frequency (architecture-agnostic)
    async cpuInfo() {
        log('Fetching CPU information...', 'info');

        try {
            // First, detect number of CPU cores dynamically
            const coreCountResult = await adb('shell "ls -d /sys/devices/system/cpu/cpu[0-9]* 2>/dev/null | wc -l"');
            const numCores = parseInt(coreCountResult.stdout.trim()) || 8;

            // Get CPU stats from /proc/stat (two samples for usage calculation)
            const stat1 = await adb('shell cat /proc/stat');
            await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
            const stat2 = await adb('shell cat /proc/stat');

            // Build dynamic frequency query for detected cores
            const coreRange = Array.from({length: numCores}, (_, i) => i).join(' ');
            const freqResult = await adb(`shell "for i in ${coreRange}; do echo CPU$i; cat /sys/devices/system/cpu/cpu$i/cpufreq/scaling_cur_freq 2>/dev/null || echo 0; cat /sys/devices/system/cpu/cpu$i/cpufreq/scaling_max_freq 2>/dev/null || echo 0; cat /sys/devices/system/cpu/cpu$i/cpufreq/scaling_min_freq 2>/dev/null || echo 0; done"`);

            // Get governor
            const governorResult = await adb('shell "cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor 2>/dev/null"');

            // Get online cores
            const onlineResult = await adb('shell "cat /sys/devices/system/cpu/online 2>/dev/null"');

            // Get temperature - try multiple thermal zones for compatibility
            let tempResult = await adb('shell "cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null"');
            if (!tempResult.stdout || tempResult.stdout.trim() === '') {
                // Try alternative thermal paths
                tempResult = await adb('shell "cat /sys/devices/virtual/thermal/thermal_zone0/temp 2>/dev/null || cat /sys/class/hwmon/hwmon0/temp1_input 2>/dev/null"');
            }

            // Try to get CPU model/architecture info
            const cpuInfoResult = await adb('shell "cat /proc/cpuinfo | grep -E \\"Hardware|model name|Processor\\" | head -3"');

            // Parse CPU stats
            function parseCpuStats(output) {
                const stats = {};
                const lines = output.split('\n');
                for (const line of lines) {
                    const match = line.match(/^(cpu\d*)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/);
                    if (match) {
                        const [, name, user, nice, system, idle, iowait, irq, softirq] = match;
                        const total = parseInt(user) + parseInt(nice) + parseInt(system) + parseInt(idle) +
                            parseInt(iowait) + parseInt(irq) + parseInt(softirq);
                        const busy = total - parseInt(idle) - parseInt(iowait);
                        stats[name] = {
                            user: parseInt(user), nice: parseInt(nice), system: parseInt(system),
                            idle: parseInt(idle), iowait: parseInt(iowait), irq: parseInt(irq),
                            softirq: parseInt(softirq), total, busy
                        };
                    }
                }
                return stats;
            }

            const stats1 = parseCpuStats(stat1.stdout);
            const stats2 = parseCpuStats(stat2.stdout);

            // Calculate usage percentage for each detected core
            const cores = [];
            for (let i = 0; i < numCores; i++) {
                const name = `cpu${i}`;
                if (stats1[name] && stats2[name]) {
                    const deltaTotal = stats2[name].total - stats1[name].total;
                    const deltaBusy = stats2[name].busy - stats1[name].busy;
                    const deltaIowait = stats2[name].iowait - stats1[name].iowait;
                    const deltaSystem = stats2[name].system - stats1[name].system;
                    const deltaUser = stats2[name].user - stats1[name].user;

                    const usage = deltaTotal > 0 ? Math.round((deltaBusy / deltaTotal) * 100) : 0;
                    const userPct = deltaTotal > 0 ? Math.round((deltaUser / deltaTotal) * 100) : 0;
                    const systemPct = deltaTotal > 0 ? Math.round((deltaSystem / deltaTotal) * 100) : 0;
                    const iowaitPct = deltaTotal > 0 ? Math.round((deltaIowait / deltaTotal) * 100) : 0;

                    cores.push({
                        id: i,
                        name: `Core ${i}`,
                        cluster: 'unknown', // Will be determined by frequency analysis
                        clusterName: 'Unknown',
                        usage,
                        userPct,
                        systemPct,
                        iowaitPct,
                        frequency: 0,
                        maxFrequency: 0,
                        minFrequency: 0
                    });
                }
            }

            // Parse frequency info
            const freqLines = freqResult.stdout.split('\n');
            let currentCore = -1;
            let freqIndex = 0;
            for (const line of freqLines) {
                const coreMatch = line.match(/CPU(\d+)/);
                if (coreMatch) {
                    currentCore = parseInt(coreMatch[1]);
                    freqIndex = 0;
                } else if (currentCore >= 0 && currentCore < cores.length) {
                    const freq = parseInt(line.trim()) || 0;
                    if (freqIndex === 0) cores[currentCore].frequency = freq;
                    else if (freqIndex === 1) cores[currentCore].maxFrequency = freq;
                    else if (freqIndex === 2) cores[currentCore].minFrequency = freq;
                    freqIndex++;
                }
            }

            // Dynamically determine clusters based on max frequency
            // Group cores by their max frequency to identify efficiency vs performance clusters
            const freqGroups = {};
            cores.forEach(core => {
                const maxFreq = core.maxFrequency || 0;
                // Round to nearest 100MHz to group similar frequencies
                const freqBucket = Math.round(maxFreq / 100000) * 100000;
                if (!freqGroups[freqBucket]) freqGroups[freqBucket] = [];
                freqGroups[freqBucket].push(core);
            });

            const sortedFreqs = Object.keys(freqGroups).map(Number).sort((a, b) => a - b);

            // Assign cluster names based on frequency tiers
            if (sortedFreqs.length >= 2) {
                // Multi-cluster CPU (big.LITTLE or similar)
                const midpoint = Math.floor(sortedFreqs.length / 2);
                sortedFreqs.forEach((freq, idx) => {
                    const isEfficiency = idx < midpoint;
                    freqGroups[freq].forEach(core => {
                        core.cluster = isEfficiency ? 'efficiency' : 'performance';
                        const maxMHz = Math.round(core.maxFrequency / 1000);
                        core.clusterName = isEfficiency ? `Efficiency (${maxMHz} MHz max)` : `Performance (${maxMHz} MHz max)`;
                    });
                });
            } else {
                // Single cluster CPU (all cores same speed)
                cores.forEach(core => {
                    core.cluster = 'standard';
                    const maxMHz = Math.round(core.maxFrequency / 1000);
                    core.clusterName = maxMHz > 0 ? `Standard (${maxMHz} MHz max)` : 'Standard';
                });
            }

            // Calculate overall CPU usage
            const overallStats1 = stats1['cpu'];
            const overallStats2 = stats2['cpu'];
            let overallUsage = 0;
            if (overallStats1 && overallStats2) {
                const deltaTotal = overallStats2.total - overallStats1.total;
                const deltaBusy = overallStats2.busy - overallStats1.busy;
                overallUsage = deltaTotal > 0 ? Math.round((deltaBusy / deltaTotal) * 100) : 0;
            }

            // Parse temperature (usually in millidegrees)
            let temperature = null;
            if (tempResult.stdout) {
                const temp = parseInt(tempResult.stdout.trim());
                if (!isNaN(temp)) {
                    temperature = temp > 1000 ? temp / 1000 : temp; // Convert from millidegrees if needed
                }
            }

            // Calculate cluster averages dynamically
            const efficiencyCluster = cores.filter(c => c.cluster === 'efficiency');
            const performanceCluster = cores.filter(c => c.cluster === 'performance');
            const standardCluster = cores.filter(c => c.cluster === 'standard');

            const efficiencyAvg = efficiencyCluster.length > 0
                ? Math.round(efficiencyCluster.reduce((sum, c) => sum + c.usage, 0) / efficiencyCluster.length) : 0;
            const performanceAvg = performanceCluster.length > 0
                ? Math.round(performanceCluster.reduce((sum, c) => sum + c.usage, 0) / performanceCluster.length) : 0;
            const standardAvg = standardCluster.length > 0
                ? Math.round(standardCluster.reduce((sum, c) => sum + c.usage, 0) / standardCluster.length) : 0;

            // Parse CPU info for display
            let cpuModel = 'Unknown';
            if (cpuInfoResult.stdout) {
                const hwMatch = cpuInfoResult.stdout.match(/Hardware\s*:\s*(.+)/i);
                const modelMatch = cpuInfoResult.stdout.match(/model name\s*:\s*(.+)/i);
                const procMatch = cpuInfoResult.stdout.match(/Processor\s*:\s*(.+)/i);
                cpuModel = hwMatch?.[1]?.trim() || modelMatch?.[1]?.trim() || procMatch?.[1]?.trim() || 'Unknown';
            }

            // Generate optimization suggestions
            const suggestions = [];

            // High overall usage
            if (overallUsage > 80) {
                suggestions.push({
                    type: 'warning',
                    title: 'High CPU Usage',
                    desc: 'CPU usage is above 80%. Consider closing background apps.',
                    action: 'View running processes to identify resource-heavy apps'
                });
            }

            // I/O wait issues
            const highIowait = cores.filter(c => c.iowaitPct > 20);
            if (highIowait.length > 0) {
                suggestions.push({
                    type: 'warning',
                    title: 'High I/O Wait',
                    desc: `${highIowait.length} core(s) waiting on storage. May indicate slow storage or heavy file operations.`,
                    action: 'Check for apps performing heavy disk operations'
                });
            }

            // Temperature warning
            if (temperature && temperature > 45) {
                suggestions.push({
                    type: temperature > 55 ? 'critical' : 'warning',
                    title: temperature > 55 ? 'Critical Temperature' : 'Elevated Temperature',
                    desc: `CPU temperature is ${temperature.toFixed(1)}°C. ${temperature > 55 ? 'Thermal throttling may occur.' : 'Consider reducing load.'}`,
                    action: 'Close intensive apps and let device cool down'
                });
            }

            // Unbalanced cluster usage (only for multi-cluster CPUs)
            if (efficiencyCluster.length > 0 && performanceCluster.length > 0) {
                if (Math.abs(efficiencyAvg - performanceAvg) > 40 && overallUsage > 30) {
                    if (efficiencyAvg > performanceAvg + 30) {
                        suggestions.push({
                            type: 'info',
                            title: 'Efficiency Cores Overloaded',
                            desc: 'Light tasks are saturating efficiency cores. Scheduler may migrate to performance cores.',
                            action: 'Normal behavior for background tasks'
                        });
                    } else if (performanceAvg > efficiencyAvg + 30) {
                        suggestions.push({
                            type: 'info',
                            title: 'Performance Cores Active',
                            desc: 'Heavy tasks are using performance cores. Higher power consumption expected.',
                            action: 'Normal for demanding apps like games or video encoding'
                        });
                    }
                }
            }

            // Low frequency with high usage (potential throttling)
            const throttledCores = cores.filter(c => c.usage > 50 && c.maxFrequency > 0 && c.frequency < c.maxFrequency * 0.6);
            if (throttledCores.length > Math.max(1, Math.floor(numCores / 4))) {
                suggestions.push({
                    type: 'warning',
                    title: 'Possible Thermal Throttling',
                    desc: `${throttledCores.length} core(s) running below max frequency despite high usage.`,
                    action: 'Let device cool down or check for thermal issues'
                });
            }

            // All good
            if (suggestions.length === 0 && overallUsage < 30) {
                suggestions.push({
                    type: 'success',
                    title: 'CPU Running Efficiently',
                    desc: 'Low CPU usage with no thermal or performance issues detected.',
                    action: 'No action needed'
                });
            }

            log(`CPU info retrieved: ${cores.length} cores, ${overallUsage}% overall usage`, 'success');

            // Build dynamic cluster info
            const clusterInfo = {};
            if (efficiencyCluster.length > 0) {
                clusterInfo.efficiency = {
                    name: efficiencyCluster[0]?.clusterName || 'Efficiency',
                    cores: efficiencyCluster.map(c => c.id),
                    avgUsage: efficiencyAvg,
                    maxFreqMHz: Math.round((efficiencyCluster[0]?.maxFrequency || 0) / 1000)
                };
            }
            if (performanceCluster.length > 0) {
                clusterInfo.performance = {
                    name: performanceCluster[0]?.clusterName || 'Performance',
                    cores: performanceCluster.map(c => c.id),
                    avgUsage: performanceAvg,
                    maxFreqMHz: Math.round((performanceCluster[0]?.maxFrequency || 0) / 1000)
                };
            }
            if (standardCluster.length > 0) {
                clusterInfo.standard = {
                    name: standardCluster[0]?.clusterName || 'Standard',
                    cores: standardCluster.map(c => c.id),
                    avgUsage: standardAvg,
                    maxFreqMHz: Math.round((standardCluster[0]?.maxFrequency || 0) / 1000)
                };
            }

            return {
                overall: {
                    usage: overallUsage,
                    temperature,
                    governor: governorResult.stdout.trim() || 'unknown',
                    online: onlineResult.stdout.trim() || `0-${numCores - 1}`,
                    cpuModel,
                    coreCount: cores.length
                },
                clusters: clusterInfo,
                cores,
                suggestions,
                timestamp: new Date().toISOString()
            };
        } catch (e) {
            log(`CPU info error: ${e.message}`, 'error');
            return { error: e.message };
        }
    },

    // Get top CPU-consuming processes
    async topProcesses() {
        log('Fetching top processes by CPU...', 'info');

        try {
            // Get process CPU usage
            const result = await adb('shell "top -b -n 1 2>/dev/null | head -35"');

            const processes = [];
            const lines = result.stdout.split('\n');

            for (const line of lines) {
                // Parse Android top output format:
                // PID USER PR NI VIRT RES SHR S[%CPU] %MEM TIME+ ARGS
                // Example: 18792 shell 20 0 10G 5.4M 4.1M R 17.2 0.0 0:00.05 top -b -n 1
                // Note: S[%CPU] means state and cpu are adjacent, cpu might have brackets or not

                // Try to match: PID USER PR NI VIRT RES SHR STATE CPU MEM TIME ARGS
                const match = line.trim().match(/^\s*(\d+)\s+(\S+)\s+\S+\s+\S+\s+\S+\s+\S+\s+\S+\s+\S\s*([\d.]+)\s+([\d.]+)\s+\S+\s+(.+)/);
                if (match) {
                    const [, pid, user, cpu, mem, name] = match;
                    const cpuPct = parseFloat(cpu);
                    // Skip top command itself and kernel threads with 0% CPU
                    if (cpuPct >= 0.1 && !name.includes('top -b')) {
                        const cleanName = name.trim();
                        processes.push({
                            pid: parseInt(pid),
                            user,
                            cpu: cpuPct,
                            mem: parseFloat(mem),
                            name: cleanName,
                            displayName: knownApps[cleanName] || cleanName.split('/').pop().split(':')[0]
                        });
                    }
                }
            }

            // Sort by CPU usage
            processes.sort((a, b) => b.cpu - a.cpu);

            log(`Found ${processes.length} active processes`, 'success');
            return { processes: processes.slice(0, 20) };
        } catch (e) {
            log(`Top processes error: ${e.message}`, 'error');
            return { error: e.message, processes: [] };
        }
    },

    // Security review of processes - check for unregistered/suspicious processes
    async processSecurityReview() {
        log('Starting process security review...', 'info');

        try {
            // Get list of installed packages
            const pkgResult = await adb('shell pm list packages --user 0');
            const installedPackages = new Set(
                pkgResult.stdout.split('\n')
                    .filter(l => l.startsWith('package:'))
                    .map(l => l.replace('package:', '').trim())
            );

            // Also get disabled packages (they're still "registered")
            const disabledResult = await adb('shell pm list packages -d');
            disabledResult.stdout.split('\n')
                .filter(l => l.startsWith('package:'))
                .map(l => l.replace('package:', '').trim())
                .forEach(p => installedPackages.add(p));

            log(`Found ${installedPackages.size} registered packages`, 'info');

            // Get all running processes
            const psResult = await adb('shell ps -A -o PID,USER,NAME,CMDLINE');
            const lines = psResult.stdout.split('\n').slice(1); // Skip header

            const allProcesses = [];
            const unregisteredProcesses = [];
            const suspiciousProcesses = [];

            // Known legitimate system processes that don't have packages
            const knownSystemProcesses = new Set([
                'init', 'kthreadd', 'ksoftirqd', 'kworker', 'migration', 'watchdog',
                'cpuhp', 'netns', 'rcu_', 'khelper', 'kdevtmpfs', 'khungtaskd',
                'oom_reaper', 'writeback', 'kcompactd', 'ksmd', 'khugepaged',
                'kswapd', 'vmstat', 'fsnotify', 'kthrotld', 'irq/', 'acpi_',
                'scsi_', 'bioset', 'kblockd', 'ata_sff', 'md', 'devfreq_wq',
                'watchdogd', 'kauditd', 'nfsiod', 'cifsoplockd', 'cifsd',
                'rpciod', 'xprtiod', 'kworker/', 'kswapd0', 'zygote', 'zygote64',
                'system_server', 'surfaceflinger', 'servicemanager', 'vold', 'netd',
                'logd', 'adbd', 'installd', 'lmkd', 'healthd', 'storaged',
                'thermalserviced', 'perfprofd', 'tombstoned', 'traced', 'traced_probes',
                'hwservicemanager', 'vndservicemanager', 'cameraserver', 'mediaserver',
                'audioserver', 'mediadrmserver', 'drmserver', 'keystore', 'gatekeeperd',
                'fingerprintd', 'wificond', 'hostapd', 'wpa_supplicant', 'rild',
                'vendor.', 'android.', 'media.', 'hal_', 'cnss', 'qti', 'ueventd',
                'debuggerd', 'incidentd', 'statsd', 'gpuservice', 'sensors', 'thermal',
                'charger', 'recovery', 'update_engine', 'apexd', 'linker', 'app_process',
                'miuicamera', 'MiuiCamera', 'process-tracker', 'logcat', 'sh', 'ps',
                'top', 'cat', 'grep', 'dumpsys'
            ]);

            // Suspicious patterns to look for
            const suspiciousPatterns = [
                { pattern: /^\/data\/local\/tmp/i, reason: 'Running from temp directory', severity: 'high' },
                { pattern: /^\/sdcard/i, reason: 'Running from sdcard', severity: 'high' },
                { pattern: /busybox/i, reason: 'Busybox binary (potential root tool)', severity: 'medium' },
                { pattern: /su$/i, reason: 'Superuser binary', severity: 'high' },
                { pattern: /magisk/i, reason: 'Magisk detected', severity: 'info' },
                { pattern: /xposed/i, reason: 'Xposed framework', severity: 'medium' },
                { pattern: /frida/i, reason: 'Frida (instrumentation tool)', severity: 'high' },
                { pattern: /inject/i, reason: 'Possible code injection', severity: 'high' },
                { pattern: /hide/i, reason: 'Process hiding attempt', severity: 'medium' },
                { pattern: /\.tmp$/i, reason: 'Temporary executable', severity: 'high' },
                { pattern: /deleted/i, reason: 'Running from deleted file', severity: 'critical' },
                { pattern: /memfd:/i, reason: 'Running from memory (fileless)', severity: 'critical' },
            ];

            for (const line of lines) {
                // Parse: PID USER NAME CMDLINE
                const match = line.trim().match(/^\s*(\d+)\s+(\S+)\s+(\S+)\s*(.*)?$/);
                if (!match) continue;

                const [, pid, user, name, cmdline] = match;
                const fullCmd = cmdline || name;

                // Extract package name from process name
                // Process names can be: com.example.app, com.example.app:service, or com.example.app.persistent
                // Common suffixes that are NOT part of the package: .persistent, .unstable, .remote, .process
                // Also handle underscored process names like .omadm_client_process
                // Note: .service IS often part of real package names (e.g., com.milink.service)
                let packageName = null;
                let packageNameVariants = []; // Store variants to check
                const packageMatch = name.match(/^(com\.[^:]+|org\.[^:]+|net\.[^:]+|io\.[^:]+)/);
                if (packageMatch) {
                    let baseName = packageMatch[1];
                    // Remove common Android process suffixes that aren't part of actual package names
                    // Note: .service is NOT removed as it's commonly part of real package names
                    packageName = baseName
                        .replace(/\.(persistent|unstable|remote|process|isolated|ui)$/i, '')
                        .replace(/\.isolated\d+$/i, '') // e.g., .isolated0, .isolated1
                        .replace(/\.[a-z_]+_process$/i, '') // e.g., .omadm_client_process
                        .replace(/_(zygote|sandboxed|privileged)\d*$/i, ''); // e.g., _zygote, _sandboxed0

                    packageNameVariants.push(packageName);

                    // Add variant for com.android.* -> com.google.android.* (common replacement)
                    if (packageName.startsWith('com.android.')) {
                        packageNameVariants.push(packageName.replace('com.android.', 'com.google.android.'));
                    }
                }

                const processInfo = {
                    pid: parseInt(pid),
                    user,
                    name,
                    cmdline: fullCmd,
                    packageName,
                    isRegistered: true,
                    flags: []
                };

                // Check if it's a known system process
                const isKnownSystem = [...knownSystemProcesses].some(known =>
                    name.startsWith(known) || name.includes(known)
                );

                // Check if it looks like a package name but isn't registered
                // Check all variants (original + com.google.android.* for com.android.*)
                const isPackageRegistered = packageNameVariants.some(variant => installedPackages.has(variant));
                if (packageName && !isPackageRegistered) {
                    processInfo.isRegistered = false;
                    processInfo.flags.push({
                        type: 'unregistered',
                        severity: 'warning',
                        reason: `Package ${packageName} not found in installed packages`
                    });
                    unregisteredProcesses.push(processInfo);
                }

                // Check for suspicious patterns
                for (const { pattern, reason, severity } of suspiciousPatterns) {
                    if (pattern.test(fullCmd) || pattern.test(name)) {
                        processInfo.flags.push({ type: 'suspicious', severity, reason });
                    }
                }

                // Check for processes running as root that shouldn't be
                if (user === 'root' && packageName) {
                    processInfo.flags.push({
                        type: 'privilege',
                        severity: 'warning',
                        reason: 'App process running as root'
                    });
                }

                // Check for shell user processes that aren't expected
                if (user === 'shell' && !isKnownSystem && !fullCmd.includes('adb')) {
                    processInfo.flags.push({
                        type: 'shell',
                        severity: 'info',
                        reason: 'Process running as shell user'
                    });
                }

                if (processInfo.flags.length > 0 && !isKnownSystem) {
                    suspiciousProcesses.push(processInfo);
                }

                allProcesses.push(processInfo);
            }

            // Remove duplicates from suspicious (might also be in unregistered)
            const uniqueSuspicious = suspiciousProcesses.filter(p =>
                !unregisteredProcesses.some(u => u.pid === p.pid) || p.flags.some(f => f.type !== 'unregistered')
            );

            // Sort by severity
            const severityOrder = { critical: 0, high: 1, warning: 2, medium: 3, info: 4 };
            const sortBySeverity = (a, b) => {
                const aSev = Math.min(...a.flags.map(f => severityOrder[f.severity] ?? 5));
                const bSev = Math.min(...b.flags.map(f => severityOrder[f.severity] ?? 5));
                return aSev - bSev;
            };

            unregisteredProcesses.sort(sortBySeverity);
            uniqueSuspicious.sort(sortBySeverity);

            // Generate summary
            const summary = {
                totalProcesses: allProcesses.length,
                registeredPackages: installedPackages.size,
                unregisteredCount: unregisteredProcesses.length,
                suspiciousCount: uniqueSuspicious.length,
                criticalCount: [...unregisteredProcesses, ...uniqueSuspicious].filter(p =>
                    p.flags.some(f => f.severity === 'critical')
                ).length,
                highCount: [...unregisteredProcesses, ...uniqueSuspicious].filter(p =>
                    p.flags.some(f => f.severity === 'high')
                ).length
            };

            log(`Security review complete: ${summary.unregisteredCount} unregistered, ${summary.suspiciousCount} suspicious`, 'success');

            return {
                summary,
                unregisteredProcesses,
                suspiciousProcesses: uniqueSuspicious,
                timestamp: new Date().toISOString()
            };
        } catch (e) {
            log(`Process security review error: ${e.message}`, 'error');
            return { error: e.message };
        }
    },

    // Get log
    async getLog() {
        return { log: activityLog.slice(-100) };
    },

    // Wallpaper Management
    async setWallpaper(params) {
        const { imageData, type = 'both' } = params;
        // type can be: 'home', 'lock', or 'both'

        if (!imageData) {
            return { success: false, error: 'No image data provided' };
        }

        log(`Setting ${type} wallpaper...`, 'info');

        try {
            // Decode base64 image data
            const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
            const imageBuffer = Buffer.from(base64Data, 'base64');

            // Save image temporarily on host
            const tempPath = path.join(__dirname, 'temp_wallpaper.jpg');
            fs.writeFileSync(tempPath, imageBuffer);

            // Push to device - use a permanent location in Pictures
            const timestamp = Date.now();
            const remotePath = `/sdcard/Pictures/wallpaper_${timestamp}.jpg`;
            await adb(`push "${tempPath}" "${remotePath}"`);
            log(`Image pushed to device: ${remotePath}`, 'success');

            // Clean up temp file on host
            fs.unlinkSync(tempPath);

            // Trigger media scan so the file appears in gallery
            await adb(`shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d "file://${remotePath}"`);
            await new Promise(resolve => setTimeout(resolve, 500));

            // Try to open wallpaper picker with the uploaded image
            let pickerOpened = false;
            let pickerMessage = '';

            // Method 1: Try MIUI Wallpaper service directly (HyperOS/MIUI)
            try {
                const miwallpaperResult = await adb(`shell am start -a android.intent.action.ATTACH_DATA -d "file://${remotePath}" -t "image/*" -n com.miui.miwallpaper/.wallpaper.WallpaperPreviewActivity`);
                if (!miwallpaperResult.stdout.includes('Error') && !miwallpaperResult.stderr?.includes('Error')) {
                    log('Opened MIUI Wallpaper preview', 'success');
                    pickerOpened = true;
                    pickerMessage = 'Wallpaper preview opened on device. Tap "Apply" to set.';
                }
            } catch (e) {
                log('MIUI Wallpaper not available, trying alternatives...', 'info');
            }

            // Method 2: Try MIUI Gallery
            if (!pickerOpened) {
                try {
                    const galleryResult = await adb(`shell am start -a android.intent.action.VIEW -d "file://${remotePath}" -t "image/*" -n com.miui.gallery/.activity.ExternalPhotoPageActivity`);
                    if (!galleryResult.stdout.includes('Error')) {
                        pickerOpened = true;
                        pickerMessage = 'Image opened in Gallery. Tap ⋮ menu > "Set as wallpaper"';
                    }
                } catch (e) { /* continue */ }
            }

            // Method 3: Try Google Photos
            if (!pickerOpened) {
                try {
                    const photosResult = await adb(`shell am start -a android.intent.action.VIEW -d "file://${remotePath}" -t "image/*" -n com.google.android.apps.photos/.viewer.pager.PhotoViewActivity`);
                    if (!photosResult.stdout.includes('Error')) {
                        pickerOpened = true;
                        pickerMessage = 'Image opened in Google Photos. Use menu > "Use as" > "Wallpaper"';
                    }
                } catch (e) { /* continue */ }
            }

            // Method 4: Try generic SET_WALLPAPER intent
            if (!pickerOpened) {
                try {
                    await adb(`shell am start -a android.intent.action.SET_WALLPAPER`);
                    pickerOpened = true;
                    pickerMessage = 'Wallpaper picker opened. Select the uploaded image from Gallery.';
                } catch (e) { /* continue */ }
            }

            if (pickerOpened) {
                log(pickerMessage, 'success');
            } else {
                log(`Image saved to ${remotePath}`, 'success');
                log('To set wallpaper: Long-press home screen > Wallpapers > Gallery', 'info');
                pickerMessage = 'Image uploaded to Pictures folder. To set as wallpaper: Long-press on home screen > Wallpapers > Select from Gallery';
            }

            return {
                success: true,
                remotePath,
                message: pickerMessage,
                needsManual: true,
                pickerOpened
            };
        } catch (e) {
            log(`Wallpaper error: ${e.message}`, 'error');
            return { success: false, error: e.message };
        }
    },

    // Set wallpaper from URL on device (for images already on phone)
    async setWallpaperFromDevice(params) {
        const { path: imagePath, type = 'both' } = params;

        if (!imagePath) {
            return { success: false, error: 'No image path provided' };
        }

        log(`Setting wallpaper from device path: ${imagePath}`, 'info');

        try {
            let result = { success: false, needsManual: true };

            // Method 1: Try MIUI Wallpaper service directly (HyperOS/MIUI)
            try {
                const miwallpaperResult = await adb(`shell am start -a android.intent.action.ATTACH_DATA -d "file://${imagePath}" -t "image/*" -n com.miui.miwallpaper/.wallpaper.WallpaperPreviewActivity`);
                if (!miwallpaperResult.stdout.includes('Error') && !miwallpaperResult.stderr?.includes('Error')) {
                    log('Opened MIUI Wallpaper preview', 'success');
                    result = { success: true, needsManual: true, output: 'Wallpaper preview opened. Tap "Apply" to set.' };
                }
            } catch (e) {
                log('MIUI Wallpaper service not available', 'info');
            }

            // Method 2: Open directly in MIUI Gallery
            if (!result.success) {
                try {
                    const galleryResult = await adb(`shell am start -a android.intent.action.VIEW -d "file://${imagePath}" -t "image/*" -n com.miui.gallery/.activity.ExternalPhotoPageActivity`);
                    if (!galleryResult.stdout.includes('Error')) {
                        log('Opened image in Gallery - tap menu > "Set as wallpaper"', 'success');
                        result = { success: true, needsManual: true, output: 'Image opened in Gallery. Tap ⋮ menu > "Set as wallpaper"' };
                    }
                } catch (e) {
                    log('MIUI Gallery not available', 'info');
                }
            }

            // Method 3: Try Google Photos
            if (!result.success) {
                try {
                    const photosResult = await adb(`shell am start -a android.intent.action.VIEW -d "file://${imagePath}" -t "image/*" -n com.google.android.apps.photos/.viewer.pager.PhotoViewActivity`);
                    if (!photosResult.stdout.includes('Error')) {
                        log('Opened image in Google Photos', 'success');
                        result = { success: true, needsManual: true, output: 'Image opened in Photos. Use menu > "Use as" > "Wallpaper"' };
                    }
                } catch (e) {
                    log('Google Photos not available', 'info');
                }
            }

            // Method 4: Generic image viewer with SET_WALLPAPER action
            if (!result.success) {
                try {
                    await adb(`shell am start -a android.intent.action.ATTACH_DATA -d "file://${imagePath}" -t "image/*" --grant-read-uri-permission`);
                    log('Opened image with wallpaper intent', 'info');
                    result = { success: true, needsManual: true, output: 'Image opened. Select wallpaper option.' };
                } catch (e) {
                    // Continue to next method
                }
            }

            // Method 5: Open system wallpaper picker directly
            if (!result.success) {
                try {
                    // Try to open the wallpaper cropper/setter directly
                    await adb(`shell am start -a android.intent.action.SET_WALLPAPER`);
                    log('Opened wallpaper picker - select image from Gallery', 'info');
                    result = { success: true, needsManual: true, output: 'Wallpaper picker opened. Select from Gallery' };
                } catch (e) {
                    result = { success: false, error: 'Could not open wallpaper picker' };
                }
            }

            // Method 6: Last resort - open device settings wallpaper section
            if (!result.success) {
                try {
                    await adb(`shell am start -a android.intent.action.MAIN -n com.android.settings/.wallpaper.WallpaperTypeSettings`);
                    result = { success: true, needsManual: true, output: 'Wallpaper settings opened. Select from options.' };
                } catch (e) {
                    result = { success: false, error: 'Could not open wallpaper picker. Check if Gallery or Wallpaper apps are enabled.' };
                }
            }

            return {
                success: result.success,
                home: type !== 'lock' ? result : { success: false },
                lock: type !== 'home' ? result : { success: false },
                needsManual: result.needsManual,
                message: result.needsManual ? 'Wallpaper picker opened on device - please complete setup' : result.output
            };
        } catch (e) {
            log(`Wallpaper error: ${e.message}`, 'error');
            return { success: false, error: e.message };
        }
    },

    // List images on device (for selecting existing wallpapers)
    async listDeviceImages() {
        log('Scanning device for images...', 'info');

        try {
            // Use a single command to find all images with their sizes
            // This is much faster and more reliable than individual stat calls
            const result = await adb(`shell "find /sdcard/DCIM /sdcard/Pictures /sdcard/Download /sdcard/Wallpapers -maxdepth 2 -type f \\( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' \\) -exec ls -la {} \\; 2>/dev/null"`);

            const images = [];

            if (result.stdout) {
                const lines = result.stdout.split('\n').filter(l => l.trim());

                for (const line of lines.slice(0, 100)) { // Limit to 100 total images
                    // Parse ls -la output: -rw-rw---- 1 u0_a123 media_rw 1234567 2024-01-15 10:30 /path/to/file.jpg
                    const match = line.match(/^[-drwx]+\s+\d+\s+\S+\s+\S+\s+(\d+)\s+(\d{4}-\d{2}-\d{2})\s+\d{2}:\d{2}\s+(.+)$/);
                    if (match) {
                        const [, sizeStr, dateStr, filePath] = match;
                        const trimmedPath = filePath.trim();
                        if (trimmedPath && !trimmedPath.includes('No such file')) {
                            const size = parseInt(sizeStr) || 0;
                            images.push({
                                path: trimmedPath,
                                name: trimmedPath.split('/').pop(),
                                size: size,
                                sizeFormatted: formatBytes(size),
                                date: dateStr,
                                directory: trimmedPath.substring(0, trimmedPath.lastIndexOf('/'))
                            });
                        }
                    } else {
                        // Try simpler parsing if ls format differs
                        const parts = line.trim().split(/\s+/);
                        if (parts.length > 0) {
                            const filePath = parts[parts.length - 1];
                            if (filePath && (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg') || filePath.endsWith('.png') ||
                                filePath.endsWith('.JPG') || filePath.endsWith('.PNG'))) {
                                images.push({
                                    path: filePath,
                                    name: filePath.split('/').pop(),
                                    size: 0,
                                    sizeFormatted: '',
                                    date: '',
                                    directory: filePath.substring(0, filePath.lastIndexOf('/'))
                                });
                            }
                        }
                    }
                }
            }

            log(`Found ${images.length} images on device`, 'success');
            return { images, count: images.length };
        } catch (e) {
            log(`Error listing images: ${e.message}`, 'error');
            return { images: [], error: e.message };
        }
    },

    // Get current wallpaper info
    async getWallpaperInfo() {
        try {
            // Run head inside the shell command to avoid Windows pipe issues
            const result = await adb('shell "dumpsys wallpaper 2>/dev/null | head -50"');
            return { info: result.stdout };
        } catch (e) {
            // Fallback without head if it fails
            try {
                const result = await adb('shell dumpsys wallpaper');
                // Truncate on the JS side
                const lines = result.stdout.split('\n').slice(0, 50).join('\n');
                return { info: lines };
            } catch (e2) {
                return { error: e2.message };
            }
        }
    },

    // Full scan
    async fullScan() {
        log('Starting full device scan...', 'info');

        // Run all scans with error handling for each
        let deviceInfo = { error: 'Not retrieved' };
        let allPackages = { packages: [], count: 0 };
        let disabledPackages = { packages: [], count: 0 };
        let network = { connections: [] };
        let processes = { processes: [], count: 0 };

        try {
            [deviceInfo, allPackages, disabledPackages, network, processes] = await Promise.all([
                handlers.deviceInfo().catch(err => ({ error: err.message })),
                handlers.listPackages({ type: 'all' }).catch(() => ({ packages: [], count: 0 })),
                handlers.listPackages({ type: 'disabled' }).catch(() => ({ packages: [], count: 0 })),
                handlers.netstat().catch(() => ({ connections: [], raw: '' })),
                handlers.processes().catch(() => ({ processes: [], count: 0 }))
            ]);
        } catch (err) {
            log(`Scan error: ${err.message}`, 'error');
        }

        // Count Xiaomi packages
        const xiaomiPackages = allPackages.packages.filter(p =>
            p.pkg.includes('xiaomi') || p.pkg.includes('miui') || p.pkg.includes('mi.')
        );

        // Analyze connections for suspicious IPs
        const suspiciousConnections = network.connections.filter(c => {
            const remote = c.remote || '';
            return remote.includes('5222') || // Xiaomi push
                   remote.includes('161.117') || // Xiaomi
                   remote.includes('8.219') || // Alibaba
                   remote.includes('47.236'); // Alibaba
        });

        log('Full scan complete', 'success');

        return {
            device: deviceInfo,
            packages: {
                total: allPackages.count,
                disabled: disabledPackages.count,
                xiaomi: xiaomiPackages.length,
                list: allPackages.packages
            },
            network: {
                connections: network.connections,
                suspicious: suspiciousConnections
            },
            processes: {
                count: processes.count,
                list: processes.processes.slice(0, 50)
            }
        };
    }
};

// HTTP Server
const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Parse URL and body
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const action = url.pathname.slice(1); // Remove leading /
    const params = Object.fromEntries(url.searchParams);

    // Read POST body if present
    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        await new Promise(resolve => req.on('end', resolve));
        try {
            Object.assign(params, JSON.parse(body));
        } catch (e) {}
    }

    // Handle request
    if (handlers[action]) {
        try {
            const result = await handlers[action](params);
            res.writeHead(200);
            res.end(JSON.stringify(result));
        } catch (e) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: e.message }));
        }
    } else if (action === '' || action === 'index.html' || action === 'dashboard.html') {
        // Serve the dashboard
        res.setHeader('Content-Type', 'text/html');
        res.writeHead(200);
        res.end(fs.readFileSync(path.join(__dirname, 'dashboard.html')));
    } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Unknown action', available: Object.keys(handlers) }));
    }
});

server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║           Android Slim - ADB Backend Server                ║
╠════════════════════════════════════════════════════════════╣
║  Server running at: http://localhost:${PORT}                   ║
║  Dashboard:         http://localhost:${PORT}/                  ║
║                                                            ║
║  API Endpoints:                                            ║
║    /connect?ip=x.x.x.x:5555  - Connect to device          ║
║    /status                    - Check connection          ║
║    /deviceInfo                - Get device info           ║
║    /listPackages?type=all     - List packages             ║
║    /uninstallPackage?pkg=x    - Uninstall package         ║
║    /disablePackage?pkg=x      - Disable package           ║
║    /enablePackage?pkg=x       - Enable package            ║
║    /restorePackage?pkg=x      - Restore package           ║
║    /netstat                   - Network connections       ║
║    /dnsAnalysis               - DNS cache analysis        ║
║    /processes                 - Running processes         ║
║    /shell?cmd=x               - Execute shell command     ║
║    /fullScan                  - Complete device scan      ║
║    /getLog                    - Get activity log          ║
╚════════════════════════════════════════════════════════════╝
    `);
    log('Server started', 'success');

    // Auto-open browser after short delay to ensure server is ready
    setTimeout(() => {
        openBrowser(`http://localhost:${PORT}`);
    }, 500);
});
