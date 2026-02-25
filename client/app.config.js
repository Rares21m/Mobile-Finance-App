// Dynamic Expo configuration
// Extends app.json with runtime configuration
module.exports = ({ config }) => {
    return {
        ...config,
        extra: {
            // API URL — override with EXPO_PUBLIC_API_URL env variable
            // For physical devices, set this to your machine's local IP:
            //   EXPO_PUBLIC_API_URL=http://192.168.0.163:3000/api npx expo start
            apiUrl:
                process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api",
        },
    };
};
