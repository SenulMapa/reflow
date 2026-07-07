import { View } from "react-native";
import { OrbitRing } from "./OrbitRing";
import { Surface } from "./Surface";
import { useTheme } from "../theme/theme";
import { spacing } from "../theme/tokens";

export function OrbitRow({
  subjects, leadId,
}: {
  subjects: { id: string; name: string; color: string; daysToExam: number | null; coverage?: number }[];
  leadId?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: spacing.sm }}>
      {subjects.map((s) => {
        const lead = s.id === leadId;
        return (
          <Surface
            key={s.id}
            padded={false}
            style={{
              flex: 1, paddingVertical: spacing.md, alignItems: "center",
              borderWidth: lead ? 1.5 : (colors.bg === "#141219" ? 1 : 0),
              borderColor: lead ? s.color : colors.separator,
            }}
          >
            <OrbitRing
              name={s.name.length > 8 ? s.name.slice(0, 7) + "…" : s.name}
              color={s.color} daysToExam={s.daysToExam} coverage={s.coverage} lead={lead}
            />
          </Surface>
        );
      })}
    </View>
  );
}
