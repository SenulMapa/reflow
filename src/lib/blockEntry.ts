import { generate, isLLMConfigured } from "./llm";
import { parseBlock, type BlockParseContext, type ParsedBlock } from "./parseBlock";

export type ResolvedBlock =
  | { ok: true; block: ParsedBlock; source: "local" | "ai" }
  | { ok: false; error: string };

/**
 * Turn free-text into a block event. The deterministic parser handles the common
 * cases instantly and offline; only when it can't (and the LLM proxy is
 * configured) do we fall back to MiniMax for messy phrasings. If MiniMax isn't
 * available or fails, we surface the deterministic parser's helpful error.
 */
export async function resolveBlock(
  text: string,
  ctx: BlockParseContext
): Promise<ResolvedBlock> {
  const local = parseBlock(text, ctx);
  if (local.ok) return { ok: true, block: local.block, source: "local" };
  if (!isLLMConfigured()) return { ok: false, error: local.error };

  try {
    const block = await generate<ParsedBlock>("parse_block", {
      text,
      weekDates: ctx.weekDates,
      todayISO: ctx.todayISO,
    });
    if (block && typeof block.start === "number" && typeof block.end === "number" && block.date) {
      return { ok: true, block, source: "ai" };
    }
    return { ok: false, error: local.error };
  } catch {
    return { ok: false, error: local.error };
  }
}
