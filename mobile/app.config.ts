import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "DueShare",
  slug: "split",

  scheme: process.env.EXPO_PUBLIC_AUTH_SCHEME || "dueshare",

  ios: {
    ...config.ios,
    ...(process.env.SPLIT_IOS_BUNDLE_ID
      ? { bundleIdentifier: process.env.SPLIT_IOS_BUNDLE_ID }
      : {}),
  },

  android: {
    ...config.android,
    ...(process.env.SPLIT_ANDROID_PACKAGE
      ? { package: process.env.SPLIT_ANDROID_PACKAGE }
      : {}),
  },

  // Apple is intentionally deferred; do not request its entitlement yet.
  plugins: [
    ...(config.plugins ?? []),
    [
      "expo-build-properties",
      {
        ios: {
          enableSceneSupport: true,
        },
      },
    ],
  ],
});