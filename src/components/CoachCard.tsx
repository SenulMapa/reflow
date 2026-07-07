import { View, Text } from "react-native";
import { useTheme } from "../theme/theme";
import { type, spacing, radius } from "../theme/tokens";

/** The tutor's voice at the top of the deck. */
export function CoachCard({ body, why }: { body: string; why?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{
      backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
      borderLeftWidth: 3, borderLeftColor: colors.accent, gap: spacing.sm,
    }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 12, color: colors.accent }}>✎</Text>
        </View>
        <Text style={[type.caption, { color: colors.textDim }]}>Your tutor</Text>
      </View>
      <Text style={[type.body, { color: colors.text }]}>{body}</Text>
      {why && <Text style={[type.footnote, { color: colors.textDim }]}>↳ {why}</Text>}
    </View>
  );
}
