import { useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DotField } from "../src/components/DotField";
import { Pill } from "../src/components/Pill";
import { Hairline } from "../src/components/Hairline";
import { PressableScale } from "../src/components/PressableScale";
import { useTheme } from "../src/theme/theme";
import { spacing, type, radius, bounded } from "../src/theme/tokens";
import { useStore } from "../src/state/store";
import { canInk, canRenderPdf } from "../src/lib/pdfCapability";

type Tool = "note" | "pen" | "highlight" | "eraser";
const TOOLS: { id: Tool; label: string; native: boolean }[] = [
  { id: "note", label: "NOTE", native: false },
  { id: "pen", label: "PEN", native: true },
  { id: "highlight", label: "HILITE", native: true },
  { id: "eraser", label: "ERASE", native: true },
];

/**
 * Textbook reader + annotation surface. The native layer (inline PDF render + Skia
 * ink) is capability-gated (see src/lib/pdfCapability) — in the Expo-Go-safe build
 * it degrades to a functional JS "notes" mode: page navigation + text notes anchored
 * per page, persisted like everything else. Ink/highlight tools show but explain they
 * light up in the dev build, so the UI + data model are complete and forward-ready.
 */
export default function Reader() {
  const { colors } = useTheme();
  const router = useRouter();
  const { sourceId } = useLocalSearchParams<{ sourceId: string }>();
  const source = useStore((s) => s.state.sources.find((x) => x.id === sourceId));
  const annotations = useStore((s) => s.state.annotations);
  const addAnnotation = useStore((s) => s.addAnnotation);
  const removeAnnotation = useStore((s) => s.removeAnnotation);

  const [page, setPage] = useState(1);
  const [tool, setTool] = useState<Tool>("note");
  const [noteText, setNoteText] = useState("");

  const inkReady = canInk();
  const pdfReady = canRenderPdf();

  const pageNotes = useMemo(
    () => annotations.filter((a) => a.sourceId === source?.id && a.page === page && a.kind === "note"),
    [annotations, source, page],
  );

  if (!source) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }]}>
        <Text style={[type.body, { color: colors.textDim }]}>Source not found.</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: spacing.md }}>
          <Text style={[type.mono, { color: colors.text }]}>‹ BACK</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  function addNote() {
    if (!noteText.trim() || !source) return;
    addAnnotation({
      id: `${Date.now()}`, sourceId: source.id, page, kind: "note",
      data: noteText.trim(), color: colors.accent, createdAt: new Date().toISOString(),
    });
    setNoteText("");
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top"]}>
      <DotField />
      <View style={styles.top}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={[type.body, { color: colors.textDim }]}>‹ Library</Text>
        </Pressable>
        <Text style={[type.caption, { color: colors.textDim }]} numberOfLines={1}>{source.title.toUpperCase()}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Page canvas — native PDF render when available, else a framed placeholder */}
        <View style={[styles.canvas, { borderColor: colors.line2 }]}>
          {pdfReady ? (
            <Text style={[type.footnote, { color: colors.textDim }]}>[ native PDF page {page} ]</Text>
          ) : (
            <>
              <Text style={[type.numeral, { color: colors.textFaint }]}>{page}</Text>
              <Text style={[type.caption, { color: colors.textFaint, marginTop: spacing.sm, textAlign: "center" }]}>
                PAGE VIEW OPENS IN THE DEV BUILD{"\n"}NOTES BELOW WORK NOW
              </Text>
            </>
          )}
        </View>

        {/* Page nav */}
        <View style={styles.nav}>
          <PressableScale haptic="selection" onPress={() => setPage((p) => Math.max(1, p - 1))} style={[styles.navBtn, { borderColor: colors.line2 }]}>
            <Text style={[type.mono, { color: colors.text }]}>‹ PREV</Text>
          </PressableScale>
          <Text style={[type.data, { color: colors.text }]}>PAGE {page}</Text>
          <PressableScale haptic="selection" onPress={() => setPage((p) => p + 1)} style={[styles.navBtn, { borderColor: colors.line2 }]}>
            <Text style={[type.mono, { color: colors.text }]}>NEXT ›</Text>
          </PressableScale>
        </View>

        {/* Pen toolbar */}
        <View style={styles.toolbar}>
          {TOOLS.map((t) => {
            const active = tool === t.id;
            const gated = t.native && !inkReady;
            return (
              <PressableScale
                key={t.id}
                haptic="selection"
                onPress={() => setTool(t.id)}
                style={[styles.tool, { borderColor: colors.line2, backgroundColor: active ? colors.display : "transparent", opacity: gated ? 0.4 : 1 }]}
              >
                <Text style={[type.caption, { color: active ? colors.bg : colors.text }]}>{t.label}</Text>
              </PressableScale>
            );
          })}
        </View>
        {tool !== "note" && !inkReady && (
          <Text style={[type.footnote, { color: colors.textDim, marginTop: spacing.sm }]}>
            Apple Pencil ink + highlighter light up in the dev build. Text notes work here now.
          </Text>
        )}

        {/* Notes (work in JS) */}
        {tool === "note" && (
          <View style={{ marginTop: spacing.lg }}>
            <TextInput
              value={noteText} onChangeText={setNoteText} placeholder={`Note on page ${page}…`}
              placeholderTextColor={colors.textFaint} multiline
              style={[type.body, styles.input, { color: colors.text, borderColor: colors.separator }]}
            />
            <View style={{ marginTop: spacing.md }}>
              <Pill label="Add note" disabled={!noteText.trim()} onPress={addNote} />
            </View>
          </View>
        )}

        {pageNotes.length > 0 && (
          <View style={{ marginTop: spacing.xl }}>
            <Text style={[type.caption, { color: colors.textDim, marginBottom: spacing.md }]}>NOTES · PAGE {page}</Text>
            {pageNotes.map((n) => (
              <Pressable key={n.id} onLongPress={() => removeAnnotation(n.id)} style={[styles.note, { borderColor: colors.separator }]}>
                <Text style={[type.footnote, { color: colors.text }]}>{n.data}</Text>
              </Pressable>
            ))}
          </View>
        )}
        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.lg, ...bounded },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.md },
  canvas: { height: 300, borderWidth: 1, borderRadius: radius.card, alignItems: "center", justifyContent: "center", marginTop: spacing.md },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.lg },
  navBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1 },
  toolbar: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xl },
  tool: { flex: 1, alignItems: "center", paddingVertical: spacing.md, borderRadius: radius.chip, borderWidth: 1 },
  input: { borderWidth: 1, borderRadius: radius.card, padding: spacing.md, minHeight: 70, textAlignVertical: "top" },
  note: { padding: spacing.md, borderRadius: radius.card, borderWidth: 1, marginBottom: spacing.sm },
});
