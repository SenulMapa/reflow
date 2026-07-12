import { Tabs } from "expo-router";
import { View, type ColorValue } from "react-native";
import { useTheme } from "../../src/theme/theme";
import { fonts } from "../../src/theme/tokens";

/**
 * The persistent tab bar — the app's spine. Its whole reason for existing: no
 * built screen can ever be orphaned again (the V2 redesign stranded Week and its
 * whole subtree by deleting one link). Home / Week / Practice are the daily loop;
 * More reaches everything else.
 *
 * Nothing tab bar: flat, hairline top border, no shadow. Icons are a single
 * filled round dot that inverts with the active tint (display) / inactive
 * (textDim); the mono-uppercase label carries the meaning.
 */
// Active = solid filled dot; inactive = hollow ring. A filled-vs-ring contrast
// reads as "you are here" far more clearly than two filled dots that differ only
// in grey value — and stays true to the mono/dot Nothing language.
const dot = () => ({ color, focused }: { color: ColorValue; focused: boolean }) =>
  <View
    style={{
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: focused ? color : "transparent",
      borderWidth: focused ? 0 : 1.5,
      borderColor: color,
    }}
  />;

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.display,
        tabBarInactiveTintColor: colors.textDim,
        tabBarLabelStyle: {
          fontFamily: fonts.mono,
          fontSize: 10,
          letterSpacing: 1,
          textTransform: "uppercase",
        },
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.separator,
          borderTopWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
          shadowRadius: 0,
          shadowOffset: { width: 0, height: 0 },
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Now", tabBarIcon: dot() }} />
      <Tabs.Screen name="week" options={{ title: "Plan", tabBarIcon: dot() }} />
      <Tabs.Screen name="practice" options={{ title: "Practice", tabBarIcon: dot() }} />
      <Tabs.Screen name="progress" options={{ title: "Progress", tabBarIcon: dot() }} />
    </Tabs>
  );
}
