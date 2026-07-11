import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DotField } from "../src/components/DotField";
import { Pill } from "../src/components/Pill";
import { Hairline } from "../src/components/Hairline";
import { PressableScale } from "../src/components/PressableScale";
import { useTheme } from "../src/theme/theme";
import { spacing, type, radius, bounded } from "../src/theme/tokens";
import { useStore } from "../src/state/store";
import { dueCards, type Card } from "../src/state/model";
import { newCardState } from "../src/engine/sm2";
import { generate, isLLMConfigured } from "../src/lib/llm";

const todayISO = () => {
  const d = new Date();
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// Four-button grading maps onto SM-2 quality: Again=1 (lapse), Hard=3, Good=4, Easy=5.
const GRADES: { label: string; q: number; tone: "outline" | "invert" }[] = [
  { label: "Again", q: 1, tone: "outline" },
  { label: "Hard", q: 3, tone: "outline" },
  { label: "Good", q: 4, tone: "outline" },
  { label: "Easy", q: 5, tone: "invert" },
];

interface GenResp { cards: { front: string; back: string }[] }

export default function Cards() {
  const { colors } = useTheme();
  const router = useRouter();
  const state = useStore((s) => s.state);
  const reviewCard = useStore((s) => s.reviewCard);
  const addCard = useStore((s) => s.addCard);

  const today = todayISO();
  const queue = useMemo(() => dueCards(state, today), [state, today]);
  const [revealed, setRevealed] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [genSubject, setGenSubject] = useState(state.config.subjects[0]?.id ?? "");

  const current: Card | undefined = queue[0];
  const totalCards = state.cards.length;

  const grade = (q: number) => {
    if (!current) return;
    reviewCard(current.id, q, today);
    setRevealed(false);
  };

  async function generateCards() {
    const subject = state.config.subjects.find((s) => s.id === genSubject);
    if (!subject) return;
    setGenLoading(true);
    try {
      const topic = subject.topics?.[0]?.name;
      const r = await generate<GenResp>("flashcards", { subject: subject.name, topic, count: 6 });
      const now = today;
      (r?.cards ?? []).forEach((c, i) => {
        if (!c.front || !c.back) return;
        addCard({
          id: `${Date.now()}-${i}`,
          subjectId: subject.id,
          topicId: subject.topics?.[0]?.id,
          type: "basic",
          front: c.front,
          back: c.back,
          createdAt: now,
          sm2: newCardState(now),
        });
      });
    } catch {
      /* offline / no LLM — silent, the deck just doesn't grow */
    } finally {
      setGenLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top"]}>
      <DotField />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Text style={[type.body, { color: colors.textDim }]}>‹ Back</Text>
          </Pressable>
          <Text style={[type.caption, { color: colors.textDim }]}>FLASHCARDS</Text>
        </View>

        {current ? (
          <>
            {/* due-count hero numeral — the one DotGothic16 moment */}
            <View style={{ marginTop: spacing.xl, alignItems: "center" }}>
              <Text style={[type.numeralHero, { color: colors.display }]}>{queue.length}</Text>
              <Text style={[type.caption, { color: colors.textDim, marginTop: spacing.xs }]}>DUE NOW</Text>
            </View>

            <View style={[styles.card, { borderColor: colors.line2 }]}>
              <Text style={[type.caption, { color: colors.textFaint, marginBottom: spacing.md }]}>
                {state.config.subjects.find((s) => s.id === current.subjectId)?.name ?? ""}
              </Text>
              <Text style={[type.title, { color: colors.text }]}>{current.front}</Text>
              {revealed && (
                <>
                  <View style={{ marginVertical: spacing.lg }}><Hairline /></View>
                  <Text style={[type.body, { color: colors.textDim }]}>{current.back}</Text>
                </>
              )}
            </View>

            {revealed ? (
              <View style={styles.grades}>
                {GRADES.map((g) => (
                  <Pill key={g.label} label={g.label} tone={g.tone} haptic="selection" onPress={() => grade(g.q)} style={{ flexGrow: 1, paddingHorizontal: spacing.md }} />
                ))}
              </View>
            ) : (
              <View style={{ marginTop: spacing.xl }}>
                <Pill label="Reveal answer" onPress={() => setRevealed(true)} />
              </View>
            )}
          </>
        ) : (
          <View style={{ marginTop: spacing.xxxl, alignItems: "center" }}>
            <Text style={[type.numeralHero, { color: colors.display }]}>0</Text>
            <Text style={[type.headline, { color: colors.text, marginTop: spacing.md }]}>All caught up</Text>
            <Text style={[type.footnote, { color: colors.textDim, marginTop: spacing.xs, textAlign: "center" }]}>
              {totalCards === 0
                ? "No cards yet — generate a deck from a subject below."
                : `${totalCards} card${totalCards === 1 ? "" : "s"} in rotation. Nothing due today.`}
            </Text>
          </View>
        )}

        {/* Generate more (AI) */}
        <View style={{ marginTop: spacing.xxxl }}>
          <Text style={[type.caption, { color: colors.textDim, marginBottom: spacing.md }]}>GENERATE A DECK</Text>
          <View style={styles.pickRow}>
            {state.config.subjects.map((s) => {
              const active = genSubject === s.id;
              return (
                <PressableScale key={s.id} haptic="selection" onPress={() => setGenSubject(s.id)}
                  style={[styles.pick, { borderColor: colors.line2, backgroundColor: active ? colors.display : "transparent" }]}>
                  <Text style={[type.caption, { color: active ? colors.bg : colors.text }]}>{s.name}</Text>
                </PressableScale>
              );
            })}
          </View>
          <PressableScale
            haptic="light"
            onPress={genLoading || !isLLMConfigured() ? undefined : generateCards}
            style={[styles.gen, { borderColor: colors.line2, opacity: isLLMConfigured() ? 1 : 0.5 }]}
          >
            {genLoading
              ? <ActivityIndicator color={colors.text} />
              : <Text style={[type.mono, { color: colors.text }]}>{isLLMConfigured() ? "＋ AI FLASHCARDS" : "CONNECT SERVER TO GENERATE"}</Text>}
          </PressableScale>
        </View>

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.lg, ...bounded },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  card: { marginTop: spacing.xl, padding: spacing.xl, borderRadius: radius.card, borderWidth: 1, minHeight: 160, justifyContent: "center" },
  grades: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xl },
  pickRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  pick: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1 },
  gen: { marginTop: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.card, borderWidth: 1, alignItems: "center", minHeight: 50, justifyContent: "center" },
});
