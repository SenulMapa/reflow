import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme/theme";
import { spacing, radius, type } from "../theme/tokens";
import { PressableScale } from "./PressableScale";

/**
 * Trust receipt — the auditable "why" behind a session or a readiness number.
 * A number you can open is a number you can trust. Dumb + controlled: the caller
 * computes the title and lines (from allocation.rationale / readiness inputs).
 */
export interface WhyData {
  title: string;
  lines: string[];
}

export function WhySheet({ data, onClose }: { data: WhyData | null; onClose: () => void }) {
  const { colors } = useTheme();
  return (
    <Modal visible={data != null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.bg, borderColor: colors.separator }]} onPress={() => {}}>
          <View style={[styles.grabber, { backgroundColor: colors.separator }]} />
          <Text style={[type.title, { color: colors.text, marginBottom: spacing.md }]}>{data?.title}</Text>
          <View style={{ gap: spacing.sm }}>
            {data?.lines.map((l, i) => (
              <Text key={i} style={[type.body, { color: colors.textDim }]}>{l}</Text>
            ))}
          </View>
          <PressableScale haptic="selection" onPress={onClose} style={[styles.close, { backgroundColor: colors.display }]}>
            <Text style={[type.headline, { color: colors.bg }]}>Got it</Text>
          </PressableScale>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderWidth: 1, padding: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.xs },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: spacing.md },
  close: { marginTop: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.sm, alignItems: "center" },
});
