// Reflow LLM proxy — a tiny, dependency-free Node service that holds the MiniMax
// key server-side and exposes POST { task, input }. Deployed as a small container
// behind the box's Caddy (the box has no Supabase edge-runtime). Provider is
// swappable via env; MiniMax M2 is a reasoning model, so we strip <think> blocks.
const http = require("http");

const API_KEY = process.env.MINIMAX_API_KEY || "";
const BASE_URL = process.env.MINIMAX_BASE_URL || "https://api.minimax.io/v1";
const MODEL = process.env.MINIMAX_MODEL || "MiniMax-M2";
const PORT = parseInt(process.env.PORT || "8787", 10);

const SYSTEM_IAL =
  "You are an expert Edexcel/Cambridge IAL examiner. Prioritise official " +
  "specification keywords and mark-scheme criteria over generic explanations. " +
  "Reply with STRICT JSON only — no prose, no markdown.";

function promptFor(task, input) {
  const json = JSON.stringify(input);
  if (task === "parse_block")
    return {
      system:
        "Convert a student's free text into a study block. Given {text, weekDates, todayISO}, " +
        'reply STRICT JSON {"date":"YYYY-MM-DD","start":<minutes from midnight>,"end":<minutes>,"reason":<string|null>}. ' +
        "Pick date from weekDates using today/tonight/tomorrow/weekday words. JSON only.",
      user: json,
    };
  if (task === "quiz")
    return {
      system:
        SYSTEM_IAL +
        ' From {subject, topic, notes, count} produce {"questions":[{"q":string,"answer":string,"markscheme":string}]}.',
      user: json,
    };
  if (task === "grade_feynman")
    return {
      system:
        SYSTEM_IAL +
        ' Grade {topic, explanation}. Reply {"score":0..10,"gaps":[string],"feedback":string}.',
      user: json,
    };
  return { system: "Reply with strict JSON.", user: json };
}

/** M2 emits <think>…</think>; strip it, then isolate the JSON object. */
function extractJson(content) {
  let c = String(content).replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  const a = c.indexOf("{");
  const b = c.lastIndexOf("}");
  if (a >= 0 && b > a) c = c.slice(a, b + 1);
  return JSON.parse(c);
}

async function callMiniMax(system, user) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { authorization: `Bearer ${API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
      max_tokens: 2048,
    }),
  });
  if (!res.ok) throw new Error(`provider ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? "{}";
  return extractJson(content);
}

const send = (res, code, obj) => {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "POST, OPTIONS",
  });
  res.end(body);
};

http
  .createServer((req, res) => {
    if (req.method === "OPTIONS") return send(res, 204, {});
    if (req.method === "GET") return send(res, 200, { ok: true, model: MODEL });
    if (req.method !== "POST") return send(res, 405, { error: "method not allowed" });
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", async () => {
      try {
        if (!API_KEY) return send(res, 500, { error: "MINIMAX_API_KEY not set" });
        const { task, input } = JSON.parse(raw || "{}");
        const { system, user } = promptFor(task, input);
        const result = await callMiniMax(system, user);
        send(res, 200, result);
      } catch (e) {
        send(res, 500, { error: String(e && e.message ? e.message : e) });
      }
    });
  })
  .listen(PORT, () => console.log(`llm proxy on :${PORT} (${MODEL})`));
