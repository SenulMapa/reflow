import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../src/theme/theme";
import { radius, spacing, type, bounded } from "../src/theme/tokens";
import { useStore } from "../src/state/store";
import { computePlan, sessionKeyOf } from "../src/state/model";
import { PressableScale } from "../src/components/PressableScale";
import { DotField } from "../src/components/DotField";
import { VoiceReflectButton } from "../src/components/VoiceReflectButton";
import { haptics } from "../src/lib/haptics";
import { fmtTime } from "../src/lib/format";

const todayISO = () => {
  const d = new Date();
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** Pick the session you just studied and tell the tutor how it went. The tutor
 *  reads these reflections (via studentModel) to learn what you covered and where
 *  you struggle. Text for now; on-device voice arrives with the AltStore build. */
export default function Reflect() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ subjectId?: string; minutes?: string; sessionKey?: string }>();
  const state = useStore((s) => s.state);
  const addReflection = useStore((s) => s.addReflection);

  const today = todayISO();
  const subjects = state.config.subjects;
  const nameById = useMemo(() => Object.fromEntries(subjects.map((s) => [s.id, s.name])), [subjects]);
  const plan = useMemo(() => computePlan(state), [state]);
  const todaySessions = useMemo(
    () => plan.sessions.filter((s) => s.date === today).sort((a, b) => a.interval.start - b.interval.start),
    [plan, today]
  );

  // Seed from the timer handoff: if a scheduled session was just finished, pre-pick it.
  const [pickedKey, setPickedKey] = useState<string | null>(params.sessionKey || null);
  const [pickedSubject, setPickedSubject] = useState<string | undefined>(params.subjectId || undefined);
  const [text, setText] = useState("");

  const minutes = params.minutes ? parseInt(params.minutes, 10) : undefined;
  const canSave = text.trim().length > 0;

  function save() {
    if (!canSave) return;
    haptics.success();
    addReflection({
      id: `${Date.now()}`,
      sessionId: pickedKey ?? undefined,
      subjectId: pickedSubject,
      minutes: minutes && minutes > 0 ? minutes : undefined,
      date: today,
      raw: text.trim(),
    });
    router.push("/");
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={["top"]}>
      <DotField />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <PressableScale haptic="selection" onPress={() => router.push("/")} hitSlop={10}>
            <Text style={[type.caption, { color: colors.text }]}>‹ home</Text>
          </PressableScale>

          <Text style={[type.title, { color: colors.text, marginTop: spacing.sm }]}>Reflect.</Text>
          <Text style={[type.serif, { color: colors.textDim, marginTop: spacing.xs }]}>
            Just say what happened — what you covered, what tripped you up. I'll keep track.
          </Text>

          {/* Session picker */}
          <Text style={[type.caption, { color: colors.textDim, marginTop: spacing.xl, marginBottom: spacing.sm }]}>Which session?</Text>
          <View style={styles.chips}>
            <Chip label="General" active={pickedKey === null && !pickedSubject}
              onPress={() => { setPickedKey(null); setPickedSubject(undefined); }} colors={colors} />
            {todaySessions.map((s) => {
              const key = sessionKeyOf(s);
              const name = nameById[s.subjectId] ?? "Session";
              return (
                <Chip
                  key={key}
                  label={`${name} · ${fmtTime(s.interval.start)}`}
                  active={pickedKey === key}
                  onPress={() => { setPickedKey(key); setPickedSubject(s.subjectId); }}
                  colors={colors}
                />
              );
            })}
          </View>

          {/* Voice reflection — on-device transcription (native only). */}
          {Platform.OS !== "web" && (
            <View style={{ marginTop: spacing.lg }}>
              <VoiceReflectButton onResult={(t) => setText((prev) => (prev ? `${prev} ${t}` : t))} />
            </View>
          )}

          {/* Reflection text */}
          <View style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.separator }]}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="e.g. Did double-angle identities. The R-formula still trips me up — dropped 2 marks on the last past-paper question."
              placeholderTextColor={colors.textFaint}
              style={[type.body, { color: colors.text, minHeight: 120 }]}
              multiline
              textAlignVertical="top"
              autoFocus
            />
          </View>
          <Text style={[type.caption, { color: colors.textFaint, marginTop: spacing.sm }]}>
            Voice reflections arrive with the installable build — on-device, no typing.
          </Text>

          <PressableScale haptic="light" onPress={save} disabled={!canSave}
            style={[styles.save, { backgroundColor: canSave ? colors.display : colors.raised }]}>
            <Text style={[type.caption, { color: canSave ? colors.bg : colors.textFaint }]}>save reflection</Text>
          </PressableScale>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Chip({ label, active, onPress, colors }: {
  label: string; active: boolean; onPress: () => void; colors: { display: string; bg: string; line2: string; textDim: string };
}) {
  return (
    <PressableScale haptic="selection" onPress={onPress}
      style={[styles.chip, active
        ? { backgroundColor: colors.display, borderColor: colors.display }
        : { backgroundColor: "transparent", borderColor: colors.line2 }]}>
      <Text style={[type.mono, { color: active ? colors.bg : colors.textDim }]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl, ...bounded },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.sm, borderWidth: 1 },
  field: { marginTop: spacing.lg, borderRadius: radius.md, borderWidth: 1, padding: spacing.lg },
  save: { marginTop: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.sm, alignItems: "center" },
});
