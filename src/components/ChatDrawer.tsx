import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Alert, View, Text, Pressable, ScrollView, StyleSheet, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/theme";
import { spacing, radius, type } from "../theme/tokens";
import { PressableScale } from "./PressableScale";

export type DrawerConversation = { id: string; title: string };

/**
 * Chat history drawer (Grok/Tani-style), reflow-themed + adaptive. Slides in from
 * the left over a scrim. Core RN Animated (no worklets) so it ships via OTA.
 * New chat · MRU conversation list · long-press to rename/delete.
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

  const progress = useRef(new Animated.Value(open ? 1 : 0)).current;
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) setMounted(true);
    const anim = Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start(({ finished }) => { if (finished && !open) setMounted(false); });
    return () => anim.stop();
  }, [open, progress]);

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [-panelWidth, 0] });

  const closeGesture = useMemo(
    () => Gesture.Pan().runOnJS(true).activeOffsetX(-18).failOffsetY([-22, 22])
      .onEnd((e) => { if (e.translationX < -50) onClose(); }),
    [onClose]
  );

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
    <Animated.View style={[StyleSheet.absoluteFill, styles.layer]} pointerEvents={open ? "auto" : "box-none"}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: progress }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close menu">
          <View style={styles.scrim} />
        </Pressable>
      </Animated.View>

      <GestureDetector gesture={closeGesture}>
        <Animated.View
          style={[
            styles.panel,
            { width: panelWidth, backgroundColor: colors.bg, borderRightColor: colors.separator, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 },
            { transform: [{ translateX }] },
          ]}
        >
          <PressableScale onPress={() => { onNewChat(); onClose(); }} haptic="selection" style={styles.row} accessibilityLabel="New chat">
            <Text style={[styles.icon, { color: colors.accent }]}>＋</Text>
            <Text style={[type.callout, { color: colors.text, fontWeight: "600" }]}>New chat</Text>
          </PressableScale>

          <View style={[styles.divider, { backgroundColor: colors.separator }]} />

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
                    style={[styles.convRow, active && { backgroundColor: colors.accentSoft }]}
                    accessibilityLabel={c.title}
                  >
                    <Text style={[type.footnote, { color: active ? colors.accent : colors.text, fontWeight: active ? "700" : "400" }]} numberOfLines={1}>
                      {c.title}
                    </Text>
                  </PressableScale>
                );
              })
            )}
          </ScrollView>

          <View style={[styles.divider, { backgroundColor: colors.separator }]} />
          <Text style={[type.caption, { color: colors.textFaint, paddingHorizontal: spacing.md }]}>
            Hold a chat to rename or delete
          </Text>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: { zIndex: 100 },
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.32)" },
  panel: {
    position: "absolute", top: 0, bottom: 0, left: 0,
    borderRightWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.sm,
    shadowColor: "#000", shadowOffset: { width: 2, height: 0 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 16,
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderRadius: radius.md },
  icon: { fontSize: 20, width: 22, textAlign: "center" },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.sm, marginHorizontal: 4 },
  history: { flex: 1 },
  convRow: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderRadius: radius.md },
});
