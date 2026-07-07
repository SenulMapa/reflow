/**
 * Client for the swappable LLM proxy (`/llm` Supabase Edge Function). The proxy
 * holds the MiniMax key server-side; the app only knows the endpoint URL. When
 * the URL isn't configured (no box yet), `isLLMConfigured()` is false and callers
 * fall back to deterministic logic — the app stays fully functional offline.
 *
 * Set EXPO_PUBLIC_LLM_URL (e.g. https://<box>/functions/v1/llm) to enable.
 */

const LLM_URL = process.env.EXPO_PUBLIC_LLM_URL;
// NOTE: EXPO_PUBLIC_* is embedded in the client bundle, so this token is
// EXTRACTABLE — it's a rotatable, low-privilege deterrent for the proxy, NOT a
// secret. The actual MiniMax key stays server-side and is never shipped. Real
// per-user protection comes with the multi-user phase (Supabase Auth).
const LLM_TOKEN = process.env.EXPO_PUBLIC_LLM_TOKEN;

export type LLMTask = "parse_block" | "quiz" | "grade_feynman";

export function isLLMConfigured(): boolean {
  return typeof LLM_URL === "string" && LLM_URL.length > 0;
}

export async function generate<T = unknown>(task: LLMTask, input: unknown): Promise<T> {
  if (!LLM_URL) throw new Error("LLM not configured");
  const res = await fetch(LLM_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(LLM_TOKEN ? { authorization: `Bearer ${LLM_TOKEN}` } : {}),
    },
    body: JSON.stringify({ task, input }),
  });
  if (!res.ok) throw new Error(`LLM request failed: ${res.status}`);
  return (await res.json()) as T;
}
