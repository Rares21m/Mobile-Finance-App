// Dynamic Expo configuration
// Extends app.json with runtime configuration
const os = require("os");

/**
 * Automatically detects the local machine's IPv4 address.
 * Falls back to "localhost" if no suitable interface is found.
 * This runs in Node.js (not React Native), so the `os` module is available.
 */
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip loopback and non-IPv4
            if (iface.family === "IPv4" && !iface.internal) {
                return iface.address;
            }
        }
    }
    return "localhost";
}

module.exports = ({ config }) => {
    const localIP = getLocalIP();
    const apiUrl =
        process.env.EXPO_PUBLIC_API_URL || `http://${localIP}:3000/api`;

    console.log(`[app.config] API URL: ${apiUrl}`);

    return {
        ...config,
        extra: {
            // Auto-detected at every `expo start` — no manual IP changes needed
            apiUrl,
        },
    };
};
