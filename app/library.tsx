import { useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DotField } from "../src/components/DotField";
import { Pill } from "../src/components/Pill";
import { Hairline } from "../src/components/Hairline";
import { PressableScale } from "../src/components/PressableScale";
import { useTheme } from "../src/theme/theme";
import { spacing, type, radius, bounded } from "../src/theme/tokens";
import { useStore } from "../src/state/store";
import { classifySource } from "../src/state/model";

const todayISO = () => new Date().toISOString().slice(0, 10);

/**
 * Textbook library — the KB's PDF sources, as a reader index. Builds on the
 * existing `Source` model (no new silo). Tap a PDF to open the reader; add one by
 * URL. YouTube/link sources are shown too but open externally (reader is for PDFs).
 */
export default function Library() {
  const { colors } = useTheme();
  const router = useRouter();
  const sources = useStore((s) => s.state.sources);
  const subjects = useStore((s) => s.state.config.subjects);
  const addSource = useStore((s) => s.addSource);
  const removeSource = useStore((s) => s.removeSource);

  const [title, setTitle] = useState("");
  const [uri, setUri] = useState("");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");

  const pdfs = sources.filter((s) => s.type === "pdf");

  function add() {
    if (!uri.trim()) return;
    addSource({
      id: `${Date.now()}`,
      type: classifySource(uri),
      title: title.trim() || uri.trim(),
      uri: uri.trim(),
      subjectId,
      addedDate: todayISO(),
      ingested: false,
    });
    setTitle(""); setUri("");
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top"]}>
      <DotField />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.top}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Text style={[type.body, { color: colors.textDim }]}>‹ Back</Text>
          </Pressable>
          <Text style={[type.caption, { color: colors.textDim }]}>LIBRARY</Text>
        </View>

        <Text style={[type.largeTitle, { color: colors.text, marginTop: spacing.lg }]}>Textbooks</Text>

        {pdfs.length === 0 ? (
          <Text style={[type.footnote, { color: colors.textDim, marginTop: spacing.md }]}>
            No PDFs yet. Add a textbook or past paper by URL below — tap it to read and annotate.
          </Text>
        ) : (
          <View style={{ marginTop: spacing.lg }}>
            {pdfs.map((src, i) => (
              <View key={src.id}>
                {i > 0 && <Hairline />}
                <PressableScale
                  haptic="light"
                  onPress={() => router.push({ pathname: "/reader", params: { sourceId: src.id } })}
                  onLongPress={() => removeSource(src.id)}
                  style={styles.row}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[type.headline, { color: colors.text }]} numberOfLines={1}>{src.title}</Text>
                    <Text style={[type.caption, { color: colors.textDim, marginTop: 2 }]}>
                      {subjects.find((s) => s.id === src.subjectId)?.name ?? "GENERAL"}
                    </Text>
                  </View>
                  <Text style={[type.body, { color: colors.textFaint }]}>›</Text>
                </PressableScale>
              </View>
            ))}
          </View>
        )}

        <View style={{ marginTop: spacing.xxl }}>
          <Text style={[type.caption, { color: colors.textDim, marginBottom: spacing.md }]}>ADD A SOURCE</Text>
          <TextInput value={title} onChangeText={setTitle} placeholder="Title (optional)" placeholderTextColor={colors.textFaint}
            style={[type.body, styles.input, { color: colors.text, borderColor: colors.separator }]} />
          <TextInput value={uri} onChangeText={setUri} placeholder="PDF / YouTube / link URL" placeholderTextColor={colors.textFaint}
            autoCapitalize="none" style={[type.body, styles.input, { color: colors.text, borderColor: colors.separator, marginTop: spacing.sm }]} />
          <View style={styles.pickRow}>
            {subjects.map((s) => {
              const active = subjectId === s.id;
              return (
                <Pressable key={s.id} onPress={() => setSubjectId(s.id)}
                  style={[styles.pick, { borderColor: colors.line2, backgroundColor: active ? colors.display : "transparent" }]}>
                  <Text style={[type.caption, { color: active ? colors.bg : colors.text }]}>{s.name}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ marginTop: spacing.lg }}>
            <Pill label="Add to library" disabled={!uri.trim()} onPress={add} />
          </View>
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
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.lg },
  input: { borderWidth: 1, borderRadius: radius.card, padding: spacing.md, minHeight: 50 },
  pickRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.md },
  pick: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1 },
});
