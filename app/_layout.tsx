import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Updates from "expo-updates";
import { useEffect } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { palette } from "../src/theme/tokens";
import { configureNotifications } from "../src/lib/notify";

export default function RootLayout() {
  // PP Editorial New — the whole app's editorial voice. Family keys must match
  // `fonts.*` in src/theme/tokens.ts.
  const [loaded] = useFonts({
    PPEditorialUltrabold: require("../assets/fonts/PPEditorialNew-Ultrabold.otf"),
    PPEditorialUltraboldItalic: require("../assets/fonts/PPEditorialNew-UltraboldItalic.otf"),
    PPEditorialUltralight: require("../assets/fonts/PPEditorialNew-Ultralight.otf"),
    PPEditorialUltralightItalic: require("../assets/fonts/PPEditorialNew-UltralightItalic.otf"),
  });

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

  if (!loaded) return <View style={{ flex: 1, backgroundColor: palette.light.bg }} />;

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
