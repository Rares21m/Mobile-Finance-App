module.exports = ({ config }) => {
  const apiUrl =
  process.env.EXPO_PUBLIC_API_URL || "https://novence-api.onrender.com/api";

  return {
    ...config,
    owner: "raresselea",
    android: {
      ...config.android,
      package: "com.raresselea.novence"
    },
    extra: {
      ...config.extra,
      apiUrl,
      eas: {
        projectId: "87e9f99f-df97-492b-b9f7-c1dfb1a9e35b"
      }
    }
  };
};
