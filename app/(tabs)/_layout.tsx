import { Tabs } from "expo-router";
import { Text, type ColorValue } from "react-native";
import { useTheme } from "../../src/theme/theme";

/**
 * The persistent tab bar — the app's spine. Its whole reason for existing: no
 * built screen can ever be orphaned again (the V2 redesign stranded Week and its
 * whole subtree by deleting one link). Home / Week / Practice are the daily loop;
 * More reaches everything else.
 */
const icon = (glyph: string) => ({ color }: { color: ColorValue }) =>
  <Text style={{ fontSize: 20, color }}>{glyph}</Text>;

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.separator },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: icon("🏠") }} />
      <Tabs.Screen name="week" options={{ title: "Week", tabBarIcon: icon("🗓") }} />
      <Tabs.Screen name="practice" options={{ title: "Practice", tabBarIcon: icon("✎") }} />
      <Tabs.Screen name="more" options={{ title: "More", tabBarIcon: icon("⋯") }} />
    </Tabs>
  );
}
