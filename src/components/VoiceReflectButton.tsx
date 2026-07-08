import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useAudioRecorder, AudioModule, RecordingPresets } from "expo-audio";
import { transcribeAudio } from "../lib/whisperTranscribe";
import { useTheme } from "../theme/theme";
import { spacing, radius, type } from "../theme/tokens";
import { PressableScale } from "./PressableScale";
import { haptics } from "../lib/haptics";

/**
 * Voice reflection — "just talk." Records via expo-audio and transcribes on-device
 * with whisper.rn (audio never leaves the phone). Fully graceful: if transcription
 * isn't available (model still downloading, unsupported), it says so and the
 * student types instead. Only rendered on native (the caller gates on Platform).
 */
export function VoiceReflectButton({ onResult }: { onResult: (text: string) => void }) {
  const { colors } = useTheme();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [phase, setPhase] = useState<"idle" | "recording" | "transcribing">("idle");
  const [note, setNote] = useState<string | null>(null);

  const start = async () => {
    setNote(null);
    const perm = await AudioModule.requestRecordingPermissionsAsync();
    if (!perm.granted) { setNote("Microphone access is off — enable it in Settings."); return; }
    await recorder.prepareToRecordAsync();
    recorder.record();
    haptics.light();
    setPhase("recording");
  };

  const stop = async () => {
    await recorder.stop();
    haptics.selection();
    const uri = recorder.uri;
    setPhase("transcribing");
    const text = uri ? await transcribeAudio(uri) : null;
    setPhase("idle");
    if (text) { onResult(text); haptics.success(); }
    else setNote("Couldn't transcribe on-device yet — just type it below.");
  };

  const busy = phase === "transcribing";
  const recording = phase === "recording";

  return (
    <View style={{ gap: spacing.xs }}>
      <PressableScale
        haptic="light"
        onPress={busy ? undefined : recording ? stop : start}
        style={[styles.btn, { backgroundColor: recording ? colors.danger : colors.accentSoft }]}
      >
        {busy ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <Text style={[type.callout, { color: recording ? "#fff" : colors.accent, fontWeight: "700" }]}>
            {recording ? "◼ Stop & transcribe" : "🎙 Speak your reflection"}
          </Text>
        )}
      </PressableScale>
      {busy && <Text style={[type.caption, { color: colors.textDim }]}>Transcribing on-device…</Text>}
      {note && <Text style={[type.caption, { color: colors.textDim }]}>{note}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: { paddingVertical: spacing.md, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
});
