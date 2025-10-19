import {MD3DarkTheme as DefaultTheme} from "react-native-paper";
export const paperTheme ={
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#3B82F6',     // albastru accent
    secondary: '#F8729C',   // roz accent
    background: '#0E0F11',  // fundal principal
    surface: '#181A1E',     // carduri
    text: '#E6EDF3',        // text principal
    outline: '#2D333B',     // linii subtile
    error: '#F43F5E',       // roșu pentru erori

  },
  roundness:18,
} as const;
