// Supabase Edge Function: swappable LLM proxy for Reflow.
// Holds the provider key server-side; the app calls POST { task, input }.
//
// Deploy (once the box's self-hosted Supabase is reachable):
//   supabase functions deploy llm
//   supabase secrets set MINIMAX_API_KEY=... MINIMAX_BASE_URL=... MINIMAX_MODEL=...
//
// Provider is MiniMax by default via an OpenAI-compatible chat endpoint. VERIFY
// MINIMAX_BASE_URL + MINIMAX_MODEL against current MiniMax docs at deploy time
// (that's the one thing that can't be checked from here). Swap providers by
// pointing these envs elsewhere — the app never changes.

declare const Deno: { env: { get(k: string): string | undefined }; serve(h: (r: Request) => Promise<Response>): void };

const API_KEY = Deno.env.get("MINIMAX_API_KEY") ?? "";
const BASE_URL = Deno.env.get("MINIMAX_BASE_URL") ?? "https://api.minimaxi.chat/v1";
const MODEL = Deno.env.get("MINIMAX_MODEL") ?? "MiniMax-Text-01";

type Task =
  | "parse_block"
  | "quiz"
  | "grade_feynman"
  | "plan_deck"
  | "chat"
  | "flashcards"
  | "grade_answer"
  | "briefing";

const SYSTEM_IAL =
  "You are an expert Edexcel/Cambridge IAL examiner. When answering or grading, " +
  "prioritise official specification keywords and mark-scheme criteria over generic " +
  "textbook explanations. Always reply with STRICT JSON and nothing else.";

function promptFor(task: Task, input: unknown): { system: string; user: string } {
  const json = JSON.stringify(input);
  switch (task) {
    case "parse_block":
      return {
        system:
          "You convert a student's free-text into a study block. Given {text, weekDates, todayISO}, " +
          "reply STRICT JSON {\"date\":\"YYYY-MM-DD\",\"start\":<minutes from midnight>,\"end\":<minutes>,\"reason\":<string|null>}. " +
          "Pick date from weekDates using today/tonight/tomorrow/weekday words. No prose.",
        user: json,
      };
    case "quiz":
      return {
        system:
          SYSTEM_IAL +
          " Generate quiz questions from {subject, topic, notes, count}. Reply STRICT JSON " +
          "{\"questions\":[{\"q\":string,\"answer\":string,\"markscheme\":string}]}.",
        user: json,
      };
    case "grade_feynman":
      return {
        system:
          SYSTEM_IAL +
          " Grade the student's plain-language explanation in {topic, explanation}. Reply STRICT JSON " +
          "{\"score\":0..10,\"gaps\":[string],\"feedback\":string}.",
        user: json,
      };
    case "plan_deck":
      return {
        system:
          "You are the student's study tutor arranging their home dashboard for today. Input is " +
          "{studentModel}. Reply STRICT JSON {\"cards\":[{\"type\":string,\"reason\":string}]," +
          "\"coachNote\":{\"body\":string,\"why\":string|null}} — 1-2 warm, specific sentences in body. No prose.",
        user: json,
      };
    case "chat":
      return {
        system:
          SYSTEM_IAL +
          " You are the student's IAL tutor. Input is {messages:[{role,content}], studentModel}. Reply to the " +
          "LATEST user message, grounded in their model, light Markdown allowed. Reply STRICT JSON {\"reply\":string}.",
        user: json,
      };
    case "flashcards":
      return {
        system:
          SYSTEM_IAL +
          " Generate spaced-repetition flashcards from {subject, topic, count}. Each card tests ONE " +
          "recallable fact/definition/formula from the IAL specification — front is a question or cue, " +
          "back is the concise correct answer (mark-scheme wording). Reply STRICT JSON " +
          "{\"cards\":[{\"front\":string,\"back\":string}]}.",
        user: json,
      };
    case "grade_answer":
      return {
        system:
          SYSTEM_IAL +
          " Mark the student's written answer against the mark scheme. Given " +
          "{question, markScheme, maxMarks, answer, commandWord}, award marks point-by-point strictly " +
          "as an examiner would. Reply STRICT JSON {\"awarded\":number,\"maxMarks\":number," +
          "\"perPoint\":[{\"point\":string,\"hit\":boolean,\"evidence\":string}]," +
          "\"missed\":[string],\"examinerTip\":string}.",
        user: json,
      };
    case "briefing":
      return {
        system:
          SYSTEM_IAL +
          " Write a calm 2-sentence morning study briefing from {todayPlan, dueCards, weakestTopics, " +
          "daysToNearestExam, lastReflection}. Sentence 1: the situation. Sentence 2: the single most " +
          "important focus today. No hype, no emoji. Reply STRICT JSON {\"briefing\":string}.",
        user: json,
      };
  }
}

async function callProvider(system: string, user: string): Promise<unknown> {
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
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`provider ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? "{}";
  return JSON.parse(content);
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  try {
    const { task, input } = (await req.json()) as { task: Task; input: unknown };
    if (!API_KEY) return Response.json({ error: "MINIMAX_API_KEY not set" }, { status: 500 });
    const { system, user } = promptFor(task, input);
    const result = await callProvider(system, user);
    return Response.json(result);
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
});
