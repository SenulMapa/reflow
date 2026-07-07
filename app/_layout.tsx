import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { palette } from "../src/theme/tokens";

export default function RootLayout() {
  // PP Editorial New — the whole app's editorial voice. Family keys must match
  // `fonts.*` in src/theme/tokens.ts.
  const [loaded] = useFonts({
    PPEditorialUltrabold: require("../assets/fonts/PPEditorialNew-Ultrabold.otf"),
    PPEditorialUltraboldItalic: require("../assets/fonts/PPEditorialNew-UltraboldItalic.otf"),
    PPEditorialUltralight: require("../assets/fonts/PPEditorialNew-Ultralight.otf"),
    PPEditorialUltralightItalic: require("../assets/fonts/PPEditorialNew-UltralightItalic.otf"),
  });

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
