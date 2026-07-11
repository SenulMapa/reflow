import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Updates from "expo-updates";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { palette } from "../src/theme/tokens";
import { configureNotifications } from "../src/lib/notify";

export default function RootLayout() {
  // "Nothing" type system — family keys must match `fonts.*` in src/theme/tokens.ts.
  // Doto (dot-matrix numerals) · Geist (UI/body) · Geist SemiBold (headings) ·
  // Geist Mono (labels/data) · Newsreader Italic (page accent). SIL OFL 1.1, bundled.
  const [fontsLoaded, fontError] = useFonts({
    Doto: require("../assets/fonts/Doto-ROND-wght.ttf"),
    Geist: require("../assets/fonts/Geist-Regular.ttf"),
    GeistSemiBold: require("../assets/fonts/Geist-SemiBold.ttf"),
    GeistMono: require("../assets/fonts/GeistMono-Regular.ttf"),
    GeistMonoMedium: require("../assets/fonts/GeistMono-Medium.ttf"),
    NewsreaderItalic: require("../assets/fonts/Newsreader-Italic.ttf"),
  });

  // Never let font loading brick launch. The old gate hard-blocked on `loaded`
  // and dropped `useFonts`' error, so a single font that fails to register
  // on-device (the Doto *variable* font is the prime suspect) left the app on a
  // permanent blank screen — which reads as a launch "crash" but writes NO iOS
  // crash log, because nothing actually crashed. Proceed as soon as fonts settle
  // (load OR error), with a hard timeout so a hung loader can never block boot.
  // A missing font simply falls back to the system face — degraded, never bricked.
  const [ready, setReady] = useState(false);
  useEffect(() => { if (fontsLoaded || fontError) setReady(true); }, [fontsLoaded, fontError]);
  useEffect(() => { const t = setTimeout(() => setReady(true), 2500); return () => clearTimeout(t); }, []);

  // Configure local notifications once at boot (no-op on web).
  useEffect(() => { configureNotifications(); }, []);

  // OTA updates, decoupled from launch. `checkAutomatically: NEVER` +
  // `fallbackToCacheTimeout: 0` (app.json) mean the app NEVER blocks boot on the
  // remote update loader — that launch-time loader was crashing the sideloaded
  // build via expo-updates' ErrorRecovery. Instead we check manually a few seconds
  // AFTER the app is stable, fully guarded so a failed check can never abort boot.
  useEffect(() => {
    if (__DEV__) return;
    const t = setTimeout(async () => {
      try {
        const res = await Updates.checkForUpdateAsync();
        if (res.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch {
        // Offline / no compatible update / sideload quirks — stay on the embedded
        // bundle. Never surface, never crash.
      }
    }, 4000);
    return () => clearTimeout(t);
  }, []);

  if (!ready) return <View style={{ flex: 1, backgroundColor: palette.light.bg }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <SafeAreaProvider>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />
        </SafeAreaProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
