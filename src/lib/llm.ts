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

export type LLMTask =
  | "parse_block"
  | "quiz"
  | "grade_feynman"
  | "plan_deck"
  | "chat"
  | "flashcards"   // generate SM-2 flashcards for a subject/topic
  | "grade_answer" // mark a written answer against a mark scheme
  | "briefing";    // one-line AI daily briefing

export type ChatMsg = { role: "user" | "assistant" | "system"; content: string };

export function isLLMConfigured(): boolean {
  return typeof LLM_URL === "string" && LLM_URL.length > 0;
}

export async function generate<T = unknown>(
  task: LLMTask,
  input: unknown,
  opts?: { timeoutMs?: number }
): Promise<T> {
  if (!LLM_URL) throw new Error("LLM not configured");
  // Hard timeout: a hung/slow connection must never trap the caller — it aborts
  // and rejects, so fail-safe callers (planDeck/chatReply) fall back cleanly.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts?.timeoutMs ?? 20000);
  try {
    const res = await fetch(LLM_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(LLM_TOKEN ? { authorization: `Bearer ${LLM_TOKEN}` } : {}),
      },
      body: JSON.stringify({ task, input }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`LLM request failed: ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Ask the tutor to arrange the dashboard deck from the student model. Fail-safe:
 * returns null on any error or when the LLM isn't configured, so callers fall
 * back to the deterministic deck.
 */
export async function planDeck(studentModel: unknown): Promise<unknown | null> {
  if (!isLLMConfigured()) return null;
  try {
    return await generate("plan_deck", { studentModel }, { timeoutMs: 8000 });
  } catch {
    return null;
  }
}

/**
 * Grounded tutor chat. Returns the assistant's reply string, or null on any
 * error / when the LLM isn't configured.
 */
export async function chatReply(
  messages: ChatMsg[],
  studentModel: unknown
): Promise<string | null> {
  if (!isLLMConfigured()) return null;
  try {
    const res = await generate<{ reply?: string }>("chat", { messages, studentModel }, { timeoutMs: 30000 });
    return typeof res?.reply === "string" ? res.reply : null;
  } catch {
    return null;
  }
}
