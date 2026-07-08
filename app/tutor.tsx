import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList, Keyboard, KeyboardAvoidingView, Platform, Alert,
  Pressable, StyleSheet, Text, TextInput, View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../src/theme/theme";
import { spacing, type, radius, bounded } from "../src/theme/tokens";
import { studentModel, type ChatMessage } from "../src/state/model";
import { useStore } from "../src/state/store";
import { chatReply, type ChatMsg } from "../src/lib/llm";
import { PressableScale } from "../src/components/PressableScale";
import { Markdown } from "../src/components/Markdown";
import { TypingDots } from "../src/components/TypingDots";
import { ChatDrawer } from "../src/components/ChatDrawer";
import { haptics } from "../src/lib/haptics";

const toChatMsg = (m: ChatMessage): ChatMsg => ({ role: m.role, content: m.content });

const SUGGESTIONS = [
  "What should I revise next?",
  "Quiz me on my weakest topic",
  "Explain a past-paper question I got wrong",
  "Why is my schedule the way it is?",
];

/** Grok/Tani-style tutor: bubble-less Markdown replies, a light user bubble, and
 *  a history drawer of past conversations (new / switch / rename / delete). */
export default function Tutor() {
  const { colors } = useTheme();
  const router = useRouter();

  const conversations = useStore((s) => s.state.conversations);
  const activeConversationId = useStore((s) => s.state.activeConversationId);
  const stateRef = useStore((s) => s.state);
  const appendMessage = useStore((s) => s.appendMessage);
  const startNewConversation = useStore((s) => s.startNewConversation);
  const selectConversation = useStore((s) => s.selectConversation);
  const renameConversation = useStore((s) => s.renameConversation);
  const deleteConversation = useStore((s) => s.deleteConversation);

  const messages = useMemo(
    () => conversations.find((c) => c.id === activeConversationId)?.messages ?? [],
    [conversations, activeConversationId]
  );
  const convList = useMemo(() => conversations.map((c) => ({ id: c.id, title: c.title })), [conversations]);

  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
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
    const history = [...messages.map(toChatMsg), toChatMsg(userMsg)];
    appendMessage(userMsg);
    setInput("");
    setPending(true);
    scrollToEnd();

    let reply: string | null = null;
    try { reply = await chatReply(history, studentModel(stateRef)); } catch { reply = null; }

    const at = new Date().toISOString();
    if (reply != null) {
      appendMessage({ id: `${Date.now()}`, role: "assistant", content: reply, at });
      haptics.success();
    } else {
      appendMessage({ id: `${Date.now()}`, role: "system", content: "I couldn't reach your tutor just now — check your connection and try again.", at });
    }
    setPending(false);
    scrollToEnd();
  }, [input, pending, messages, appendMessage, stateRef, scrollToEnd]);

  const onRename = useCallback((id: string, currentTitle: string) => {
    if (typeof Alert.prompt !== "function") return; // iOS only; no-op elsewhere
    Alert.prompt("Rename chat", undefined, (text?: string) => {
      const title = (text || "").trim();
      if (title) { renameConversation(id, title); haptics.success(); }
    }, "plain-text", currentTitle);
  }, [renameConversation]);

  const onDelete = useCallback((id: string) => {
    Alert.alert("Delete chat", "This removes the conversation and its messages.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => { deleteConversation(id); haptics.success(); } },
    ]);
  }, [deleteConversation]);

  const canSend = input.trim().length > 0 && !pending;

  // Edge-swipe from the left opens the history drawer (Grok gesture).
  const edgeSwipe = useMemo(
    () => Gesture.Pan().runOnJS(true).hitSlop({ left: 0, width: 44 }).activeOffsetX(18).failOffsetY([-22, 22])
      .onEnd((e) => { if (e.translationX > 55) setDrawerOpen(true); }),
    []
  );

  const renderItem = useCallback(({ item }: { item: ChatMessage }) => {
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
    return <View style={styles.aiRow}><Markdown content={item.content} /></View>;
  }, [colors]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top"]}>
      {/* Top bar: menu (history) · Tutor · new chat */}
      <View style={styles.bar}>
        <PressableScale haptic="selection" onPress={() => setDrawerOpen(true)} style={styles.circleBtn} accessibilityLabel="Chat history">
          <Text style={[type.headline, { color: colors.text }]}>☰</Text>
        </PressableScale>
        <Text style={[type.headline, { color: colors.text }]}>Tutor</Text>
        <PressableScale haptic="selection" onPress={() => { startNewConversation(); setInput(""); }} style={styles.circleBtn} accessibilityLabel="New chat">
          <Text style={[type.body, { color: colors.textDim }]}>✎</Text>
        </PressableScale>
      </View>

      <GestureDetector gesture={edgeSwipe}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderItem}
            style={styles.flex}
            contentContainerStyle={[styles.content, messages.length === 0 && styles.contentEmpty]}
            ListEmptyComponent={
              pending ? null : (
                <View style={styles.empty}>
                  <Text style={[type.largeTitle, styles.center, { color: colors.text }]}>Ask me anything.</Text>
                  <Text style={[type.serif, styles.center, { color: colors.textDim }]}>
                    Your subjects, your schedule, what to revise next — or work a past-paper question through with me.
                  </Text>
                  <View style={styles.chips}>
                    {SUGGESTIONS.map((sug) => (
                      <PressableScale key={sug} haptic="selection" onPress={() => setInput(sug)}
                        style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.separator }]}>
                        <Text style={[type.footnote, { color: colors.text }]}>{sug}</Text>
                      </PressableScale>
                    ))}
                  </View>
                </View>
              )
            }
            ListFooterComponent={pending ? <View style={styles.aiRow}><TypingDots /></View> : null}
            onContentSizeChange={scrollToEnd}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
          />

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
              <PressableScale haptic={false} onPress={send} disabled={!canSend}
                style={[styles.sendBtn, { backgroundColor: canSend ? colors.accent : colors.accentSoft }]} accessibilityLabel="Send message">
                <Text style={[styles.sendGlyph, { color: canSend ? "#fff" : colors.textFaint }]}>↑</Text>
              </PressableScale>
            </View>
          </View>
        </KeyboardAvoidingView>
      </GestureDetector>

      <ChatDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        conversations={convList}
        activeId={activeConversationId}
        onSelect={(id) => { selectConversation(id); setInput(""); }}
        onNewChat={() => { startNewConversation(); setInput(""); }}
        onRename={onRename}
        onDelete={onDelete}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, ...bounded },
  circleBtn: { width: 40, height: 40, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md, ...bounded },
  contentEmpty: { flexGrow: 1, justifyContent: "center" },
  aiRow: { alignItems: "stretch", marginVertical: spacing.sm },
  userRow: { alignItems: "flex-end", marginVertical: spacing.sm, paddingLeft: 48 },
  userBubble: { borderWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 10, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, maxWidth: "86%" },
  system: { textAlign: "center", paddingHorizontal: spacing.xl, marginVertical: spacing.md },
  empty: { alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.xl },
  center: { textAlign: "center" },
  chips: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.sm, marginTop: spacing.md },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1 },
  dockWrap: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, paddingTop: spacing.xs, ...bounded },
  dock: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, borderRadius: radius.xl, borderWidth: 1, paddingLeft: spacing.lg, paddingRight: spacing.xs, paddingVertical: spacing.xs },
  input: { flex: 1, maxHeight: 120, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  sendBtn: { width: 38, height: 38, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  sendGlyph: { fontSize: 19, lineHeight: 22, fontFamily: type.headline.fontFamily },
});
