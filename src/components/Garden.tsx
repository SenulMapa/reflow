import { View, Text } from "react-native";
import { Surface } from "./Surface";
import { useTheme } from "../theme/theme";
import { type, spacing } from "../theme/tokens";

/** Deep-work reward: the garden fills as focus sessions complete. */
export function Garden({ plants, caption }: { plants: string[]; caption: string }) {
  const { colors } = useTheme();
  return (
    <Surface style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 2, flex: 1 }}>
        {plants.length === 0
          ? <Text style={[type.footnote, { color: colors.textDim }]}>Your garden grows as you focus.</Text>
          : plants.map((p, i) => <Text key={i} style={{ fontSize: 18 }}>{p}</Text>)}
      </View>
      <View>
        <Text style={[type.caption, { color: colors.textDim }]}>GARDEN</Text>
        <Text style={[type.footnote, { color: colors.text, fontWeight: "700" }]}>{caption}</Text>
      </View>
    </Surface>
  );
}
