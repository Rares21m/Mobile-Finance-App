

const os = require("os");






function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {

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

      apiUrl
    }
  };
};