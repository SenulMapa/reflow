import { View, Text } from "react-native";
import { Surface } from "./Surface";
import { useTheme } from "../theme/theme";
import { type, spacing } from "../theme/tokens";

/**
 * Deep-work reward, Nothing-style: no emoji plants (Nothing bans emoji-as-UI /
 * mascots). Each completed focus session is one filled round dot in a matrix —
 * the garden "grows" as the dot field fills. `plants` is still a string[]; only
 * its length matters here (one dot per entry).
 */
export function Garden({ plants, caption }: { plants: string[]; caption: string }) {
  const { colors } = useTheme();
  const count = plants.length;
  const cells = Math.max(24, Math.ceil(count / 6) * 6); // grow the grid in rows of 6
  return (
    <Surface style={{ flexDirection: "row", alignItems: "center", gap: spacing.lg }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5, flex: 1, maxWidth: 132 }}>
        {Array.from({ length: cells }).map((_, i) => (
          <View
            key={i}
            style={{
              width: 8, height: 8, borderRadius: 4,
              backgroundColor: i < count ? colors.display : colors.separator,
            }}
          />
        ))}
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={[type.caption, { color: colors.textDim }]}>GARDEN</Text>
        <Text style={[type.data, { color: colors.text, fontSize: 20 }]}>{count}</Text>
        <Text style={[type.caption, { color: colors.textDim }]}>{caption.toUpperCase()}</Text>
      </View>
    </Surface>
  );
}
