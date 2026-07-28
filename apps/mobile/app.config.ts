import { ExpoConfig, ConfigContext } from "expo/config";

const IS_DEV = process.env.APP_VARIANT === "development";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  owner: "andreas.bjorsvik",
  slug: "treningsappen",
  name: IS_DEV ? "Treningsappen - CatDoes (Dev)" : "Treningsappen - CatDoes",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "com.andreasbjorsvik.treningsappen",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    bundleIdentifier: IS_DEV 
      ? "com.andreasbjorsvik.treningsappen.dev" 
      : "com.andreasbjorsvik.treningsappen",
    supportsTablet: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSLocationWhenInUseUsageDescription: "Appen trenger tilgang til din posisjon for å vise din posisjon på kartet under fjellturer og treningsøkter.",
      NSHealthShareUsageDescription: "Appen trenger tilgang til helsedata for å vise din aktivitet.",
      NSHealthUpdateUsageDescription: "Appen trenger tilgang til helsedata for å lagre din aktivitet.",
    },
    entitlements: {
      "com.apple.developer.applesignin": ["Default"],
      "com.apple.developer.healthkit": true,
    },
  },
  android: {
    package: IS_DEV 
      ? "com.andreasbjorsvik.treningsappen.dev" 
      : "com.andreasbjorsvik.treningsappen",
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "expo-font",
    "expo-localization",
    "expo-web-browser",
    "expo-secure-store",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
      },
    ],
    [
      "@rnmapbox/maps",
      {
        // @rnmapbox/maps 10.3.x defaults to Mapbox Maps SDK v11.
        // Ensure MAPBOX_DOWNLOADS_TOKEN is set as an EAS secret.
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    mapboxAccessToken: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN,
    eas: {
      projectId: "b3edac61-7927-48d4-b085-a1330a20d510"
    }
  },
});