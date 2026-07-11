// Reflow LLM proxy — a tiny, dependency-free Node service that holds the MiniMax
// key server-side and exposes POST { task, input }. Deployed as a small container
// behind the box's Caddy (the box has no Supabase edge-runtime). Provider is
// swappable via env; MiniMax M2 is a reasoning model, so we strip <think> blocks.
const http = require("http");
const crypto = require("crypto");

const API_KEY = process.env.MINIMAX_API_KEY || "";
const BASE_URL = process.env.MINIMAX_BASE_URL || "https://api.minimax.io/v1";
const MODEL = process.env.MINIMAX_MODEL || "MiniMax-M3";
const PORT = parseInt(process.env.PORT || "8787", 10);
// Shared secret the app must present (Bearer). This endpoint spends the MiniMax
// key, so auth FAILS CLOSED: if REFLOW_LLM_TOKEN is unset (misconfig / unmounted
// env), every POST is rejected rather than silently served. Set it to enable.
const AUTH_TOKEN = process.env.REFLOW_LLM_TOKEN || "";

/** Constant-time check. Caller must have already ensured AUTH_TOKEN is set. */
function authorized(req) {
  const hdr = req.headers["authorization"] || "";
  const provided = hdr.startsWith("Bearer ") ? hdr.slice(7) : "";
  const a = Buffer.from(provided);
  const b = Buffer.from(AUTH_TOKEN);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

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
  if (task === "plan_deck")
    return {
      system:
        "You are the student's study tutor arranging their home dashboard for today. " +
        "Input is {studentModel} (subjects with daysToExam, planned minutes, progress, unreviewed corrections, focus minutes). " +
        "Choose and ORDER cards from this EXACT catalog to best help them right now: " +
        "coach_note, orbits, do_next, momentum_ridge, garden_peek, reflect_cta, past_paper_nudge, correction_review, weakness_spotlight, exam_taper. " +
        "Promote what matters (nearest exam, a dodged/weak subject, unreviewed corrections); keep it to 4-6 cards; always include coach_note first and reflect_cta. " +
        'Reply STRICT JSON only: {"cards":[{"type":<catalog type>,"reason":<short string>}],"coachNote":{"body":<1-2 warm, specific sentences to the student>,"why":<short string|null>}}. ' +
        "Only use catalog types. No prose outside the JSON.",
      user: json,
    };
  if (task === "chat")
    return {
      system:
        "You are the student's expert Edexcel/Cambridge IAL tutor inside their study app. " +
        "Input is {messages:[{role,content}], studentModel}. Respond to the LATEST user message as their tutor: " +
        "accurate to the IAL spec and mark schemes, concise, encouraging, and grounded in their studentModel when relevant. " +
        "You may use light Markdown (bold, lists, short math) inside your reply. " +
        'Reply with STRICT JSON only: {"reply":<your message as a single string>}. Nothing outside the JSON object.',
      user: json,
    };
  if (task === "flashcards")
    return {
      system:
        SYSTEM_IAL +
        " Generate spaced-repetition flashcards from {subject, topic, count}. Each card tests ONE recallable " +
        "fact/definition/formula from the IAL spec; front = question/cue, back = concise mark-scheme answer. " +
        'Reply STRICT JSON {"cards":[{"front":string,"back":string}]}.',
      user: json,
    };
  if (task === "grade_answer")
    return {
      system:
        SYSTEM_IAL +
        " Mark {question, markScheme, maxMarks, answer, commandWord} point-by-point as an examiner. " +
        'Reply STRICT JSON {"awarded":number,"maxMarks":number,"perPoint":[{"point":string,"hit":boolean,"evidence":string}],"missed":[string],"examinerTip":string}.',
      user: json,
    };
  if (task === "briefing")
    return {
      system:
        SYSTEM_IAL +
        " Write a calm 2-sentence morning briefing from {todayPlan, dueCards, weakestTopics, daysToNearestExam, lastReflection}. " +
        "Sentence 1: the situation. Sentence 2: the single most important focus today. No hype, no emoji. " +
        'Reply STRICT JSON {"briefing":string}.',
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
    if (req.method === "GET") return send(res, 200, { ok: true, model: MODEL, auth: !!AUTH_TOKEN });
    if (req.method !== "POST") return send(res, 405, { error: "method not allowed" });
    if (!AUTH_TOKEN) return send(res, 503, { error: "server auth not configured" });
    if (!authorized(req)) return send(res, 401, { error: "unauthorized" });
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
