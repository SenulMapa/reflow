import { useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Stop } from "react-native-svg";
import { useTheme } from "../src/theme/theme";
import { spacing, type, radius } from "../src/theme/tokens";
import { studentModel, type ChatMessage } from "../src/state/model";
import { useStore } from "../src/state/store";
import { chatReply, type ChatMsg } from "../src/lib/llm";
import { PressableScale } from "../src/components/PressableScale";
import { Skeleton } from "../src/components/Skeleton";
import { haptics } from "../src/lib/haptics";

// The signature aurora orb, ported from Tani's VoiceOrb (#1E5BFF → #33D6FF →
// #7C3BFF). expo-linear-gradient isn't installed, so this is a pure
// react-native-svg build: an atmospheric radial glow, a diagonal three-stop
// aurora core, two offset colour blobs for lava-lamp depth, and a specular
// white highlight so it reads as a glass bead. Static (no animation) — it's a
// small avatar, and the gradient alone carries the identity.
function AuroraOrb({ size = 28 }: { size?: number }) {
  const c = size / 2;
  const gid = `orb${size}`; // unique-ish per size so multiple orbs don't clash
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={`${gid}-glow`} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#33D6FF" stopOpacity={0.45} />
          <Stop offset="100%" stopColor="#33D6FF" stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id={`${gid}-core`} x1="12%" y1="8%" x2="88%" y2="92%">
          <Stop offset="0%" stopColor="#1E5BFF" />
          <Stop offset="52%" stopColor="#33D6FF" />
          <Stop offset="100%" stopColor="#7C3BFF" />
        </LinearGradient>
        <RadialGradient id={`${gid}-cyan`} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#33D6FF" stopOpacity={0.9} />
          <Stop offset="100%" stopColor="#33D6FF" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={`${gid}-violet`} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#7C3BFF" stopOpacity={0.9} />
          <Stop offset="100%" stopColor="#7C3BFF" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={`${gid}-hi`} cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.65} />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {/* outer atmospheric glow */}
      <Circle cx="50" cy="50" r="50" fill={`url(#${gid}-glow)`} />
      {/* aurora core */}
      <Circle cx="50" cy="50" r="33" fill={`url(#${gid}-core)`} />
      {/* counter-offset colour blobs for depth */}
      <Circle cx="38" cy="40" r="22" fill={`url(#${gid}-cyan)`} />
      <Circle cx="62" cy="60" r="22" fill={`url(#${gid}-violet)`} />
      {/* specular top highlight */}
      <Circle cx="40" cy="36" r="12" fill={`url(#${gid}-hi)`} />
      {/* faint glass rim */}
      <Circle cx="50" cy="50" r="33" fill="none" stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={1} />
    </Svg>
  );
}

/** Hex #RRGGBB → rgba() at the given alpha. Used for the user-bubble accent tint. */
function tint(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return hex;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const toChatMsg = (m: ChatMessage): ChatMsg => ({ role: m.role, content: m.content });

export default function Tutor() {
  const { colors } = useTheme();
  const router = useRouter();
  const chat = useStore((s) => s.state.chat);
  const stateRef = useStore((s) => s.state);
  const appendChat = useStore((s) => s.appendChat);

  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const scrollToEnd = useCallback(() => {
    // Guard: no-op when the list is empty (empty state renders instead).
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || pending) return;
    haptics.light();

    const now = Date.now();
    const userMsg: ChatMessage = {
      id: `${now}`,
      role: "user",
      content: text,
      at: new Date(now).toISOString(),
    };
    // currentMessages must include the turn we're sending.
    const currentMessages = [...chat.map(toChatMsg), toChatMsg(userMsg)];
    appendChat(userMsg);
    setInput("");
    setPending(true);
    scrollToEnd();

    let reply: string | null = null;
    try {
      reply = await chatReply(currentMessages, studentModel(stateRef));
    } catch {
      reply = null; // never crash — treat as offline
    }

    const at = new Date().toISOString();
    if (reply != null) {
      appendChat({ id: `${Date.now()}`, role: "assistant", content: reply, at });
    } else {
      appendChat({
        id: `${Date.now()}`,
        role: "system",
        content: "I could not reach your tutor just now — check your connection and try again.",
        at,
      });
    }
    setPending(false);
    scrollToEnd();
  }, [input, pending, chat, appendChat, stateRef, scrollToEnd]);

  const canSend = input.trim().length > 0 && !pending;

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => {
      if (item.role === "user") {
        return (
          <View style={styles.userRow}>
            <View style={[styles.userBubble, { backgroundColor: tint(colors.accent, 0.2) }]}>
              <Text style={[type.body, { color: colors.text }]}>{item.content}</Text>
            </View>
          </View>
        );
      }
      if (item.role === "system") {
        return (
          <Text style={[type.footnote, styles.system, { color: colors.textDim }]}>
            {item.content}
          </Text>
        );
      }
      // assistant — clean full-width prose, no bubble
      return (
        <View style={styles.assistantRow}>
          <Text style={[styles.assistantText, { color: colors.text }]}>{item.content}</Text>
        </View>
      );
    },
    [colors]
  );

  const Empty = (
    <View style={styles.empty}>
      <AuroraOrb size={72} />
      <Text style={[type.serif, styles.emptyText, { color: colors.text }]}>
        Ask me anything about your subjects, your schedule, or what to study next.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top"]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.separator }]}>
        <Pressable hitSlop={8} style={styles.back} onPress={() => router.push("/")}>
          <Text style={[type.callout, { color: colors.accent }]}>‹ Home</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <AuroraOrb size={24} />
          <Text style={[type.headline, { color: colors.text }]}>Tutor</Text>
        </View>
        {/* spacer to balance the back link so the title stays centred */}
        <View style={styles.back} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <FlatList
          ref={listRef}
          data={chat}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.transcript,
            chat.length === 0 && styles.transcriptEmpty,
          ]}
          ListEmptyComponent={pending ? null : Empty}
          ListFooterComponent={
            pending ? (
              <View style={styles.assistantRow}>
                <Text style={[type.footnote, { color: colors.textDim, marginBottom: spacing.sm }]}>
                  …thinking
                </Text>
                <Skeleton height={14} width="92%" />
                <View style={{ height: spacing.sm }} />
                <Skeleton height={14} width="76%" />
              </View>
            ) : null
          }
          onContentSizeChange={scrollToEnd}
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        />

        {/* Composer */}
        <View style={[styles.composer, { borderTopColor: colors.separator, backgroundColor: colors.bg }]}>
          <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.separator }]}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask your tutor…"
              placeholderTextColor={colors.textFaint}
              style={[type.body, styles.input, { color: colors.text }]}
              multiline
              onSubmitEditing={send}
              submitBehavior="submit"
              returnKeyType="send"
            />
          </View>
          <PressableScale
            haptic={false}
            onPress={send}
            disabled={!canSend}
            style={[
              styles.send,
              { backgroundColor: canSend ? colors.accent : colors.accentSoft },
            ]}
          >
            <Text style={[styles.sendGlyph, { color: canSend ? "#fff" : colors.textFaint }]}>↑</Text>
          </PressableScale>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { minWidth: 64 },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: spacing.sm },

  transcript: { padding: spacing.lg, gap: spacing.lg, flexGrow: 1 },
  transcriptEmpty: { justifyContent: "center" },

  userRow: { flexDirection: "row", justifyContent: "flex-end", paddingLeft: spacing.xxl },
  userBubble: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
  },

  assistantRow: { width: "100%" },
  assistantText: { fontSize: 16, lineHeight: 25, fontWeight: "400" },

  system: { textAlign: "center", paddingHorizontal: spacing.xl },

  empty: { alignItems: "center", gap: spacing.lg, paddingHorizontal: spacing.xl },
  emptyText: { textAlign: "center" },

  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputWrap: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === "ios" ? spacing.sm : spacing.xs,
    maxHeight: 132,
  },
  input: { maxHeight: 108, paddingTop: 0, paddingBottom: 0 },
  send: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  sendGlyph: { fontSize: 20, fontWeight: "800", lineHeight: 22 },
});
