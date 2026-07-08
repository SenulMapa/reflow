/**
 * On-device speech-to-text for voice reflections (SP3). whisper.rn runs the
 * ggml tiny.en model entirely on the phone — no audio ever leaves the device.
 *
 * Everything is lazy + guarded: the whisper model (~75MB) downloads once to the
 * document dir on first use; ANY failure (web, no model, no native module)
 * returns null so the caller falls back to typing. Nothing here is imported on web.
 */
const MODEL_URL = "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin";
const MODEL_NAME = "ggml-tiny.en.bin";

/** Ensure the whisper model exists locally; returns its file uri, or null. */
async function ensureModelPath(): Promise<string | null> {
  try {
    const { File, Paths } = await import("expo-file-system");
    const dest = new File(Paths.document, MODEL_NAME);
    if (!dest.exists) await File.downloadFileAsync(MODEL_URL, dest);
    return dest.uri;
  } catch {
    return null;
  }
}

/** Transcribe a recorded audio file to text on-device, or null if unavailable. */
export async function transcribeAudio(uri: string): Promise<string | null> {
  try {
    const { Platform } = await import("react-native");
    if (Platform.OS === "web") return null;
    const path = await ensureModelPath();
    if (!path) return null;
    const { initWhisper } = await import("whisper.rn");
    const ctx = await initWhisper({ filePath: path });
    try {
      const { promise } = ctx.transcribe(uri, { language: "en" });
      const res = await promise;
      return res.result?.trim() || null;
    } finally {
      await ctx.release();
    }
  } catch {
    return null;
  }
}
