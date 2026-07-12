import * as Font from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ErrorBoundary } from "../src/components/ErrorBoundary";

export default function RootLayout() {
  // FONTS: embedded at BUILD TIME via the `expo-font` config plugin (app.json),
  // referenced by PostScript name in src/theme/tokens.ts. We deliberately do NOT
  // use runtime `useFonts`/registration on native: on the re-signed SideStore
  // build, expo-font's `CTFontManagerRegisterFontsForURL` fatally SIGABRTs at
  // launch. Embedding sidesteps that path entirely (iOS registers the fonts from
  // the bundle at init) so there is nothing to wait on; render immediately. Web
  // has no build-time embedding, so load there at runtime under the same keys.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    Font.loadAsync({
      "IBMPlexMono-Regular": require("../assets/fonts/IBMPlexMono-Regular.ttf"),
      "IBMPlexMono-SemiBold": require("../assets/fonts/IBMPlexMono-SemiBold.ttf"),
      "DotGothic16-Regular": require("../assets/fonts/DotGothic16-Regular.ttf"),
      "Newsreader-Italic": require("../assets/fonts/Newsreader-Italic.ttf"),
    }).catch(() => {});
  }, []);

  // NOTE: no runtime OTA check. expo-updates is disabled (app.json updates.enabled
  // false) because a manual checkForUpdateAsync() natively aborted the re-signed
  // SideStore build ~5-10s after boot (v2.2.0). src/lib/ota.ts stays as dormant,
  // tested infra for a future attempt on a distribution channel that supports it.

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <ErrorBoundary>
          <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
