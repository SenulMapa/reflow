import * as Font from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Updates from "expo-updates";
import { useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ErrorBoundary } from "../src/components/ErrorBoundary";
import { configureNotifications } from "../src/lib/notify";

export default function RootLayout() {
  // FONTS: embedded at BUILD TIME via the `expo-font` config plugin (app.json),
  // referenced by PostScript name in src/theme/tokens.ts. We deliberately do NOT
  // use runtime `useFonts`/registration on native: on the re-signed SideStore
  // build, expo-font's `CTFontManagerRegisterFontsForURL` fatally SIGABRTs at
  // launch (confirmed via .ips: ExpoFont.registerFont → whisper terminate handler,
  // reproduced with both the variable and the flattened Doto). Embedding sidesteps
  // that path entirely (iOS registers the fonts from the bundle at init) and is
  // the recommended production approach — so there is nothing to wait on; render
  // immediately. Web has no build-time embedding (and no CTFontManager), so load
  // there at runtime under the same PostScript-name keys.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    Font.loadAsync({
      "Doto-Regular": require("../assets/fonts/Doto.ttf"),
      "Geist-Regular": require("../assets/fonts/Geist-Regular.ttf"),
      "Geist-SemiBold": require("../assets/fonts/Geist-SemiBold.ttf"),
      "GeistMono-Regular": require("../assets/fonts/GeistMono-Regular.ttf"),
      "GeistMono-Medium": require("../assets/fonts/GeistMono-Medium.ttf"),
      "Newsreader-Italic": require("../assets/fonts/Newsreader-Italic.ttf"),
    }).catch(() => {});
  }, []);

  // Configure local notifications once at boot (no-op on web).
  useEffect(() => { configureNotifications(); }, []);

  // OTA is fully disabled (`updates.enabled: false`, app.json) because expo-updates'
  // ErrorRecovery/anti-bricking pipeline SIGABRTs the sideloaded build. This guard
  // is inert (`Updates.isEnabled` is false) — kept so re-enabling OTA is one flip.
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    const t = setTimeout(async () => {
      try {
        const res = await Updates.checkForUpdateAsync();
        if (res.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch {
        // Offline / no compatible update / sideload quirks — never surface, never crash.
      }
    }, 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <StatusBar style="auto" />
          <ErrorBoundary>
            <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />
          </ErrorBoundary>
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
