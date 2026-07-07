import { Link } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Surface } from "../src/components/Surface";
import { useTheme } from "../src/theme/theme";
import { radius, spacing, subjectColors, type } from "../src/theme/tokens";
import { useStore } from "../src/state/store";
import { classifySource, type Source } from "../src/state/model";

const ICON: Record<Source["type"], string> = { pdf: "📄", youtube: "▶️", link: "🔗" };
const NOTEBOOKLM = "https://notebooklm.google.com/";

export default function Sources() {
  const { colors } = useTheme();
  const state = useStore((s) => s.state);
  const addSource = useStore((s) => s.addSource);
  const removeSource = useStore((s) => s.removeSource);

  const subjects = state.config.subjects;
  const [subjectId, setSubjectId] = useState<string | undefined>(undefined);
  const [url, setUrl] = useState("");
  const nameById = Object.fromEntries(subjects.map((s) => [s.id, s.name]));

  const now = () => {
    const d = new Date();
    const p = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };

  async function pickPdf() {
    const res = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    addSource({
      id: `${Date.now()}`,
      type: "pdf",
      title: a.name ?? "Document.pdf",
      uri: a.uri,
      subjectId,
      addedDate: now(),
      ingested: false,
    });
  }

  function addLink() {
    const u = url.trim();
    if (!u) return;
    const type = classifySource(u);
    addSource({
      id: `${Date.now()}`,
      type,
      title: u.replace(/^https?:\/\//, "").slice(0, 60),
      uri: u,
      subjectId,
      addedDate: now(),
      ingested: false,
    });
    setUrl("");
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Link href="/setup" asChild>
          <Pressable hitSlop={10}>
            <Text style={[type.headline, { color: colors.accent }]}>‹ Setup</Text>
          </Pressable>
        </Link>
        <Text style={[type.largeTitle, { color: colors.text }]}>Knowledge Base</Text>
        <Text style={[type.callout, { color: colors.textDim, marginBottom: spacing.lg }]}>
          Add your notes, past papers, and videos. They’re ingested for AI quizzes & grading when your server’s connected.
        </Text>

        {/* Tag subject */}
        <View style={styles.pickRow}>
          <Pressable onPress={() => setSubjectId(undefined)} style={[styles.pick, { backgroundColor: subjectId === undefined ? colors.accent : colors.accentSoft }]}>
            <Text style={[type.footnote, { color: subjectId === undefined ? "#fff" : colors.accent, fontWeight: "600" }]}>General</Text>
          </Pressable>
          {subjects.map((s) => (
            <Pressable key={s.id} onPress={() => setSubjectId(s.id)} style={[styles.pick, { backgroundColor: subjectId === s.id ? (subjectColors[s.name] ?? colors.accent) : colors.accentSoft }]}>
              <Text style={[type.footnote, { color: subjectId === s.id ? "#fff" : colors.accent, fontWeight: "600" }]}>{s.name}</Text>
            </Pressable>
          ))}
        </View>

        {/* Add controls */}
        <Surface style={{ gap: spacing.md, marginTop: spacing.md }}>
          <View style={styles.row}>
            <TextInput
              value={url}
              onChangeText={setUrl}
              placeholder="Paste a YouTube or web link"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={addLink}
              style={[type.body, styles.input, { color: colors.text }]}
            />
            <Pressable onPress={addLink} hitSlop={8}>
              <Text style={[type.headline, { color: colors.accent }]}>Add</Text>
            </Pressable>
          </View>
          <Pressable onPress={pickPdf} style={[styles.pdfBtn, { backgroundColor: colors.accent }]}>
            <Text style={[type.headline, { color: "#fff" }]}>📄 Add a PDF</Text>
          </Pressable>
          <Pressable onPress={() => Linking.openURL(NOTEBOOKLM)} style={[styles.ghost, { backgroundColor: colors.accentSoft }]}>
            <Text style={[type.footnote, { color: colors.accent, fontWeight: "600" }]}>Open in NotebookLM ↗</Text>
          </Pressable>
        </Surface>

        {/* List */}
        <View style={{ gap: spacing.sm, marginTop: spacing.xl }}>
          {state.sources.length === 0 && (
            <Text style={[type.callout, { color: colors.textFaint, textAlign: "center", marginTop: spacing.lg }]}>
              No sources yet. Add your first PDF or link above.
            </Text>
          )}
          {state.sources.map((s) => (
            <Surface key={s.id} style={styles.sourceRow}>
              <Text style={{ fontSize: 20 }}>{ICON[s.type]}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[type.body, { color: colors.text }]} numberOfLines={1}>{s.title}</Text>
                <Text style={[type.caption, { color: colors.textFaint }]}>
                  {s.subjectId ? `${nameById[s.subjectId]} · ` : ""}{s.ingested ? "ingested" : "pending ingest"}
                </Text>
              </View>
              <Pressable onPress={() => removeSource(s.id)} hitSlop={8}>
                <Text style={[type.footnote, { color: colors.textFaint }]}>✕</Text>
              </Pressable>
            </Surface>
          ))}
        </View>
        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.lg },
  pickRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  pick: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  input: { flex: 1, padding: 0 },
  pdfBtn: { paddingVertical: spacing.md, borderRadius: radius.md, alignItems: "center" },
  ghost: { paddingVertical: spacing.sm, borderRadius: radius.md, alignItems: "center" },
  sourceRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
});
