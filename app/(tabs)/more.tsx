import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PressableScale } from "../../src/components/PressableScale";
import { useTheme } from "../../src/theme/theme";
import { spacing, type, radius, bounded } from "../../src/theme/tokens";

/**
 * Everything beyond the daily loop. Navigate via router.push() on PressableScale
 * (an unstyled Pressable under the hood) — never a styled Pressable under <Link>,
 * which crashes react-native-web 0.21 (CLAUDE.md web-quirk).
 */
const ROWS: { href: string; icon: string; label: string; sub: string }[] = [
  { href: "/metrics", icon: "📊", label: "Insights", sub: "Confidence, performance, countdown" },
  { href: "/corrections", icon: "📓", label: "Corrections", sub: "Log mistakes, drive the weakness loop" },
  { href: "/sources", icon: "📚", label: "Library", sub: "PDFs, videos and links" },
  { href: "/tutor", icon: "💬", label: "Tutor", sub: "Ask a question or think out loud" },
  { href: "/rewards", icon: "🪙", label: "Rewards", sub: "Coins, streaks and the shop" },
  { href: "/setup", icon: "⚙︎", label: "Settings", sub: "Subjects, exams, availability, goal" },
];

export default function More() {
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[type.hero, { color: colors.text, marginBottom: spacing.lg }]}>More</Text>
        <View style={{ gap: spacing.sm }}>
          {ROWS.map((r) => (
            <PressableScale
              key={r.href}
              haptic="light"
              onPress={() => router.push(r.href)}
              style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.separator }]}
            >
              <View style={[styles.iconWrap, { backgroundColor: colors.accentSoft }]}>
                <Text style={{ fontSize: 18 }}>{r.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[type.callout, { color: colors.text, fontWeight: "700" }]}>{r.label}</Text>
                <Text style={[type.footnote, { color: colors.textDim }]}>{r.sub}</Text>
              </View>
              <Text style={{ color: colors.textFaint, fontSize: 20 }}>›</Text>
            </PressableScale>
          ))}
        </View>
        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.lg, ...bounded },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
