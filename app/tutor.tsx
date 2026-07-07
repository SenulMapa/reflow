import { useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../src/theme/theme";
import { spacing, type, radius, bounded } from "../src/theme/tokens";
import { studentModel, type ChatMessage } from "../src/state/model";
import { useStore } from "../src/state/store";
import { chatReply, type ChatMsg } from "../src/lib/llm";
import { PressableScale } from "../src/components/PressableScale";
import { Markdown } from "../src/components/Markdown";
import { TypingDots } from "../src/components/TypingDots";
import { haptics } from "../src/lib/haptics";

const toChatMsg = (m: ChatMessage): ChatMsg => ({ role: m.role, content: m.content });

/** Grok/Tani-style tutor chat: assistant replies are bubble-less Markdown prose,
 *  the student's turns sit in a light bubble with the asymmetric Figma radius. */
export default function Tutor() {
  const { colors } = useTheme();
  const router = useRouter();
  const chat = useStore((s) => s.state.chat);
  const stateRef = useStore((s) => s.state);
  const appendChat = useStore((s) => s.appendChat);
  const clearChat = useStore((s) => s.clearChat);

  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || pending) return;
    haptics.light();
    const now = Date.now();
    const userMsg: ChatMessage = { id: `${now}`, role: "user", content: text, at: new Date(now).toISOString() };
    const history = [...chat.map(toChatMsg), toChatMsg(userMsg)];
    appendChat(userMsg);
    setInput("");
    setPending(true);
    scrollToEnd();

    let reply: string | null = null;
    try { reply = await chatReply(history, studentModel(stateRef)); } catch { reply = null; }

    const at = new Date().toISOString();
    if (reply != null) {
      appendChat({ id: `${Date.now()}`, role: "assistant", content: reply, at });
      haptics.success();
    } else {
      appendChat({ id: `${Date.now()}`, role: "system", content: "I couldn't reach your tutor just now — check your connection and try again.", at });
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
            <View style={[styles.userBubble, { backgroundColor: colors.surface, borderColor: colors.separator }]}>
              <Text style={[type.body, { color: colors.text }]}>{item.content}</Text>
            </View>
          </View>
        );
      }
      if (item.role === "system") {
        return <Text style={[type.footnote, styles.system, { color: colors.textDim }]}>{item.content}</Text>;
      }
      return (
        <View style={styles.aiRow}>
          <Markdown content={item.content} />
        </View>
      );
    },
    [colors]
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top"]}>
      {/* Top bar */}
      <View style={styles.bar}>
        <PressableScale haptic="selection" onPress={() => router.push("/")} style={styles.circleBtn}>
          <Text style={[type.headline, { color: colors.text }]}>‹</Text>
        </PressableScale>
        <Text style={[type.headline, { color: colors.text }]}>Tutor</Text>
        <PressableScale
          haptic="selection"
          onPress={() => chat.length && clearChat()}
          style={styles.circleBtn}
          accessibilityLabel="New conversation"
        >
          <Text style={[type.body, { color: chat.length ? colors.textDim : colors.textFaint }]}>⟲</Text>
        </PressableScale>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <FlatList
          ref={listRef}
          data={chat}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          style={styles.flex}
          contentContainerStyle={[styles.content, chat.length === 0 && styles.contentEmpty]}
          ListEmptyComponent={
            pending ? null : (
              <View style={styles.empty}>
                <Text style={[type.largeTitle, styles.emptyTitle, { color: colors.text }]}>Ask me anything.</Text>
                <Text style={[type.serif, styles.emptySub, { color: colors.textDim }]}>
                  Your subjects, your schedule, what to revise next — or work a past-paper question through with me.
                </Text>
              </View>
            )
          }
          ListFooterComponent={pending ? <View style={styles.aiRow}><TypingDots /></View> : null}
          onContentSizeChange={scrollToEnd}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        />

        {/* Input dock */}
        <View style={styles.dockWrap}>
          <View style={[styles.dock, { backgroundColor: colors.surface, borderColor: colors.separator }]}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask your tutor…"
              placeholderTextColor={colors.textFaint}
              style={[type.body, styles.input, { color: colors.text }]}
              multiline
              maxLength={4000}
              onSubmitEditing={send}
              submitBehavior="submit"
              returnKeyType="send"
            />
            <PressableScale
              haptic={false}
              onPress={send}
              disabled={!canSend}
              style={[styles.send, { backgroundColor: canSend ? colors.accent : colors.accentSoft }]}
              accessibilityLabel="Send message"
            >
              <Text style={[styles.sendGlyph, { color: canSend ? "#fff" : colors.textFaint }]}>↑</Text>
            </PressableScale>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  bar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, ...bounded,
  },
  circleBtn: { width: 40, height: 40, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },

  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md, ...bounded },
  contentEmpty: { flexGrow: 1, justifyContent: "center" },

  aiRow: { alignItems: "stretch", marginVertical: spacing.sm },
  userRow: { alignItems: "flex-end", marginVertical: spacing.sm, paddingLeft: 48 },
  userBubble: {
    borderWidth: 1,
    borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 10,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, maxWidth: "86%",
  },
  system: { textAlign: "center", paddingHorizontal: spacing.xl, marginVertical: spacing.md },

  empty: { alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.xl },
  emptyTitle: { textAlign: "center" },
  emptySub: { textAlign: "center" },

  dockWrap: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, paddingTop: spacing.xs, ...bounded },
  dock: {
    flexDirection: "row", alignItems: "flex-end", gap: spacing.sm,
    borderRadius: radius.xl, borderWidth: 1, paddingLeft: spacing.lg, paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
  },
  input: { flex: 1, maxHeight: 120, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  send: { width: 38, height: 38, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  sendGlyph: { fontSize: 19, lineHeight: 22, fontFamily: type.headline.fontFamily },
});
