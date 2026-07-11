import { Link } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Surface } from "../src/components/Surface";
import { DotField } from "../src/components/DotField";
import { PressableScale } from "../src/components/PressableScale";
import { useTheme } from "../src/theme/theme";
import { radius, spacing, type, bounded } from "../src/theme/tokens";
import { useStore } from "../src/state/store";
import { classifySource, type Source } from "../src/state/model";

/** Nothing kills emoji-as-UI: source kind reads as a mono label badge. */
const TYPE_LABEL: Record<Source["type"], string> = { pdf: "PDF", youtube: "YT", link: "URL" };
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
      <DotField />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Link href="/setup" asChild>
          <Pressable hitSlop={10}>
            <Text style={[type.caption, { color: colors.textDim }]}>‹ SETUP</Text>
          </Pressable>
        </Link>
        <Text style={[type.largeTitle, { color: colors.text }]}>Knowledge Base</Text>
        <Text style={[type.callout, { color: colors.textDim, marginBottom: spacing.lg }]}>
          Add your notes, past papers, and videos. They’re ingested for AI quizzes & grading when your server’s connected.
        </Text>

        {/* Tag subject */}
        <Text style={[type.caption, { color: colors.textDim, marginBottom: spacing.sm }]}>TAG SUBJECT</Text>
        <View style={styles.pickRow}>
          <PressableScale
            onPress={() => setSubjectId(undefined)}
            style={[styles.pick, subjectId === undefined ? { backgroundColor: colors.display, borderColor: colors.display } : { borderColor: colors.line2 }]}
          >
            <Text style={[type.caption, { color: subjectId === undefined ? colors.bg : colors.text }]}>GENERAL</Text>
          </PressableScale>
          {subjects.map((s) => (
            <PressableScale
              key={s.id}
              onPress={() => setSubjectId(s.id)}
              style={[styles.pick, subjectId === s.id ? { backgroundColor: colors.display, borderColor: colors.display } : { borderColor: colors.line2 }]}
            >
              <Text style={[type.caption, { color: subjectId === s.id ? colors.bg : colors.text }]}>{s.name.toUpperCase()}</Text>
            </PressableScale>
          ))}
        </View>

        {/* Add controls */}
        <Surface style={{ gap: spacing.md, marginTop: spacing.md }}>
          <Text style={[type.caption, { color: colors.textDim }]}>ADD A LINK</Text>
          <View style={styles.row}>
            <TextInput
              value={url}
              onChangeText={setUrl}
              placeholder="Paste a YouTube or web link"
              placeholderTextColor={colors.textFaint}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={addLink}
              style={[type.mono, styles.input, { color: colors.text, borderColor: colors.line2 }]}
            />
            <PressableScale onPress={addLink} hitSlop={8}>
              <Text style={[type.caption, { color: colors.text }]}>ADD</Text>
            </PressableScale>
          </View>
          <PressableScale onPress={pickPdf} style={[styles.pdfBtn, { backgroundColor: colors.display }]}>
            <Text style={[type.headline, { color: colors.bg }]}>ADD A PDF</Text>
          </PressableScale>
          <PressableScale onPress={() => Linking.openURL(NOTEBOOKLM)} style={[styles.ghost, { borderColor: colors.line2 }]}>
            <Text style={[type.caption, { color: colors.text }]}>OPEN IN NOTEBOOKLM ↗</Text>
          </PressableScale>
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
              <View style={[styles.badge, { borderColor: colors.line2 }]}>
                <Text style={[type.caption, { color: colors.text }]}>{TYPE_LABEL[s.type]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[type.body, { color: colors.text }]} numberOfLines={1}>{s.title}</Text>
                <Text style={[type.caption, { color: colors.textFaint }]}>
                  {s.subjectId ? `${nameById[s.subjectId]} · ` : ""}{s.ingested ? "INGESTED" : "PENDING INGEST"}
                </Text>
              </View>
              <Pressable onPress={() => removeSource(s.id)} hitSlop={8}>
                <Text style={[type.mono, { color: colors.textFaint }]}>✕</Text>
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
  scroll: { padding: spacing.lg, ...bounded },
  pickRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  pick: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.sm, borderWidth: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  input: { flex: 1, paddingVertical: spacing.sm, borderBottomWidth: 1 },
  pdfBtn: { paddingVertical: spacing.md, borderRadius: radius.sm, alignItems: "center" },
  ghost: { paddingVertical: spacing.sm, borderRadius: radius.sm, borderWidth: 1, alignItems: "center" },
  sourceRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  badge: { minWidth: 34, paddingHorizontal: spacing.xs, paddingVertical: 3, borderRadius: radius.sm, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
