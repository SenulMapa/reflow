import { useEffect, useState } from "react";
import { Alert, View, Text, Pressable, ScrollView, StyleSheet, useWindowDimensions } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/theme";
import { spacing, radius, type } from "../theme/tokens";
import { useDecayPan } from "../ui/useDecayPan";
import { PressableScale } from "./PressableScale";
import { Hairline } from "./Hairline";

export type DrawerConversation = { id: string; title: string };

/**
 * Chat history drawer (Grok/Tani-style), reflow-themed + adaptive. Slides in from
 * the left over a scrim. The panel follows the finger 1:1 with Apple rubber-band
 * physics (useDecayPan) — a velocity-flick or drag past halfway dismisses it,
 * otherwise it springs back open. Reanimated worklets run on the UI thread but
 * ship via OTA (reanimated is already in the native binary). New chat · MRU
 * conversation list · long-press to rename/delete.
 */
export function ChatDrawer(props: {
  open: boolean;
  onClose: () => void;
  conversations: DrawerConversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onRename?: (id: string, currentTitle: string) => void;
  onDelete?: (id: string) => void;
}) {
  const { open, onClose, conversations, activeId, onSelect, onNewChat, onRename, onDelete } = props;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const panelWidth = Math.min(320, Math.round(width * 0.82));

  const [mounted, setMounted] = useState(open);

  // Panel x-offset in points: −panelWidth = dismissed (off-screen left), 0 = open.
  // The gesture drives this live; a dismiss-flick calls onClose (parent flips
  // `open`), and the effect below animates open/close when `open` changes.
  const { offset, gesture } = useDecayPan({
    bounds: [-panelWidth, 0],
    initial: -panelWidth,
    dismissTo: "min",
    onSettle: onClose,
  });

  useEffect(() => {
    if (open) {
      setMounted(true);
      offset.value = withSpring(0, { mass: 1, damping: 30, stiffness: 300 });
    } else {
      offset.value = withSpring(
        -panelWidth,
        { mass: 1, damping: 32, stiffness: 320 },
        (finished) => { if (finished) runOnJS(setMounted)(false); },
      );
    }
  }, [open, panelWidth, offset]);

  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(offset.value, [-panelWidth, 0], [0, 1], Extrapolation.CLAMP),
  }));

  const onLongPress = (c: DrawerConversation) => {
    if (!onRename && !onDelete) return;
    const buttons: any[] = [];
    if (onRename) buttons.push({ text: "Rename", onPress: () => onRename(c.id, c.title) });
    if (onDelete) buttons.push({ text: "Delete", style: "destructive", onPress: () => onDelete(c.id) });
    buttons.push({ text: "Cancel", style: "cancel" });
    Alert.alert(c.title, undefined, buttons);
  };

  if (!mounted) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.layer]} pointerEvents={open ? "auto" : "box-none"}>
      <Animated.View style={[StyleSheet.absoluteFill, scrimStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close menu">
          <View style={styles.scrim} />
        </Pressable>
      </Animated.View>

      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[
            styles.panel,
            { width: panelWidth, backgroundColor: colors.bg, borderRightColor: colors.line2, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 },
            panelStyle,
          ]}
        >
          <PressableScale onPress={() => { onNewChat(); onClose(); }} haptic="selection" style={styles.row} accessibilityLabel="New chat">
            <Text style={[styles.icon, { color: colors.text }]}>＋</Text>
            <Text style={[type.callout, { color: colors.text }]}>New chat</Text>
          </PressableScale>

          <Hairline style={styles.divider} />

          <ScrollView style={styles.history} contentContainerStyle={{ paddingVertical: 4 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {conversations.length === 0 ? (
              <Text style={[type.footnote, { color: colors.textFaint, paddingHorizontal: spacing.md, paddingVertical: spacing.lg }]}>
                No conversations yet.
              </Text>
            ) : (
              conversations.map((c) => {
                const active = c.id === activeId;
                return (
                  <PressableScale
                    key={c.id}
                    onPress={() => { onSelect(c.id); onClose(); }}
                    onLongPress={() => onLongPress(c)}
                    haptic="selection"
                    style={[styles.convRow, active && { backgroundColor: colors.raised }]}
                    accessibilityLabel={c.title}
                  >
                    <Text style={[type.footnote, { color: active ? colors.text : colors.textDim }]} numberOfLines={1}>
                      {c.title}
                    </Text>
                  </PressableScale>
                );
              })
            )}
          </ScrollView>

          <Hairline style={styles.divider} />
          <Text style={[type.caption, { color: colors.textFaint, paddingHorizontal: spacing.md }]}>
            Hold a chat to rename or delete
          </Text>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { zIndex: 100 },
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.32)" },
  panel: {
    position: "absolute", top: 0, bottom: 0, left: 0,
    borderRightWidth: 1, paddingHorizontal: spacing.sm,
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderRadius: radius.md },
  icon: { fontSize: 20, width: 22, textAlign: "center" },
  divider: { marginVertical: spacing.sm, marginHorizontal: 4 },
  history: { flex: 1 },
  convRow: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderRadius: radius.md },
});
