import { View, Text } from "react-native";
import { useTheme } from "../theme/theme";
import { type, spacing } from "../theme/tokens";
import { Surface } from "./Surface";

/** The tutor's voice at the top of the deck. */
export function CoachCard({ body, why }: { body: string; why?: string }) {
  const { colors } = useTheme();
  return (
    <Surface style={{ gap: spacing.sm, borderLeftWidth: 2, borderLeftColor: colors.display }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.display }} />
        <Text style={[type.caption, { color: colors.textDim }]}>TUTOR</Text>
      </View>
      <Text style={[type.body, { color: colors.text }]}>{body}</Text>
      {why && <Text style={[type.footnote, { color: colors.textDim }]}>{why}</Text>}
    </Surface>
  );
}
