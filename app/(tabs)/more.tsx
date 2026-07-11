import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PressableScale } from "../../src/components/PressableScale";
import { DotField } from "../../src/components/DotField";
import { Hairline } from "../../src/components/Hairline";
import { useTheme } from "../../src/theme/theme";
import { spacing, type, radius, bounded } from "../../src/theme/tokens";

/**
 * Everything beyond the daily loop. Navigate via router.push() on PressableScale
 * (an unstyled Pressable under the hood) — never a styled Pressable under <Link>,
 * which crashes react-native-web 0.21 (CLAUDE.md web-quirk).
 *
 * Nothing: monochrome rows, mono-uppercase eyebrow labels, a filled dot marker
 * (no emoji), structured with hairlines + whitespace, no shadows.
 */
const ROWS: { href: string; label: string; sub: string }[] = [
  { href: "/metrics", label: "Insights", sub: "Confidence, performance, countdown" },
  { href: "/corrections", label: "Corrections", sub: "Log mistakes, drive the weakness loop" },
  { href: "/sources", label: "Library", sub: "PDFs, videos and links" },
  { href: "/tutor", label: "Tutor", sub: "Ask a question or think out loud" },
  { href: "/rewards", label: "Rewards", sub: "Coins, streaks and the shop" },
  { href: "/setup", label: "Settings", sub: "Subjects, exams, availability, goal" },
];

export default function More() {
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top"]}>
      <DotField />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[type.caption, { color: colors.textDim, marginBottom: spacing.sm }]}>MORE</Text>
        <Text style={[type.largeTitle, { color: colors.text, marginBottom: spacing.lg }]}>Everything else</Text>
        <View style={[styles.list, { borderColor: colors.line2, backgroundColor: colors.surface }]}>
          {ROWS.map((r, i) => (
            <View key={r.href}>
              {i > 0 && <Hairline />}
              <PressableScale
                haptic="light"
                onPress={() => router.push(r.href)}
                style={styles.row}
              >
                <View style={[styles.marker, { borderColor: colors.line2, backgroundColor: colors.raised }]}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.display }} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[type.headline, { color: colors.text }]}>{r.label}</Text>
                  <Text style={[type.footnote, { color: colors.textDim, marginTop: 2 }]}>{r.sub}</Text>
                </View>
                <Text style={[type.body, { color: colors.textFaint }]}>›</Text>
              </PressableScale>
            </View>
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
  list: { borderRadius: radius.md, borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  marker: { width: 40, height: 40, borderRadius: radius.sm, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
