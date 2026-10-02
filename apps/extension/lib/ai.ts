import Anthropic from "@anthropic-ai/sdk"
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema"
import type { LineWord, TaughtWord } from "@pna/shared"

export const ANSWER_MODEL = "claude-sonnet-5-5"
export const BULK_MODEL = "claude-haiku-4-5"

/**
 * The extension calls Claude directly with the user's own key, stored only in
 * this browser profile. When a shared backend exists, these calls move behind it.
 */
export function createClient(apiKey: string) {
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
}

const HK = "Use Traditional characters as used in Hong Kong. Give Jyutping with tone numbers (e.g. gam3)."

// ---- Convert caption lines between registers ----

const ConvertedSchema = {
  type: "object",
  additionalProperties: false,
  required: ["lines"],
  properties: {
    lines: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["idx", "source_register", "formal", "colloquial", "colloquial_inferred"],
        properties: {
          idx: { type: "integer" },
          source_register: { type: "string", enum: ["formal", "colloquial"] },
          formal: { type: "string" },
          colloquial: { type: "string" },
          colloquial_inferred: { type: "boolean" }
        }
      }
    }
  }
} as const

const CONVERT_SYSTEM = `You convert Hong Kong video captions between written Chinese (書面語) and spoken Cantonese (口語).
For each target line:
- source_register: "formal" if the caption is written Chinese (他, 沒有, 這麼, 的), "colloquial" if it is already spoken Cantonese (佢, 冇, 咁, 嘅).
- formal: the line in 書面語.
- colloquial: the line as a Cantonese speaker would most likely have said it.
- colloquial_inferred: true when the source was formal, since the spoken words are then a guess.
Change only what the register requires; keep names, numbers and English as they are. If a caption has an obvious sound-alike typo, keep it in both versions; don't fix it here.
${HK}`

type Numbered = { idx: number; text: string }

export async function convertLines(ai: Anthropic, args: { title: string; targets: Numbered[]; neighbours: Numbered[] }) {
  const fmt = (ls: Numbered[]) => ls.map((l) => `${l.idx}: ${l.text}`).join("\n")
  const res = await ai.messages.parse({
    model: BULK_MODEL,
    max_tokens: 16000,
    system: CONVERT_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Video: ${args.title}\n\nSurrounding lines for context (don't convert):\n${fmt(args.neighbours) || "(none)"}\n\nConvert these lines:\n${fmt(args.targets)}`
      }
    ],
    output_config: { format: jsonSchemaOutputFormat(ConvertedSchema) }
  })
  const want = new Set(args.targets.map((t) => t.idx))
  return (res.parsed_output?.lines ?? [])
    .filter((l) => want.has(l.idx))
    .map((l) => ({
      idx: l.idx,
      sourceRegister: l.source_register,
      textFormal: l.formal,
      textColloquial: l.colloquial,
      colloquialInferred: l.source_register === "formal" || l.colloquial_inferred
    }))
}

// ---- Split a line into words ----

const WordsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["words"],
  properties: {
    words: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["text", "jyutping", "meaning", "formal", "colloquial", "likely_error"],
        properties: {
          text: { type: "string", description: "the word exactly as it appears in the line" },
          jyutping: { type: "string" },
          meaning: { type: "string", description: "short English gloss, a few words" },
          formal: { type: ["string", "null"], description: "書面語 form, or null if the same" },
          colloquial: { type: ["string", "null"], description: "口語 form, or null if the same" },
          likely_error: { type: ["string", "null"], description: "the probably intended word if this looks like a sound-alike caption error, else null" }
        }
      }
    }
  }
} as const

export async function explainLine(ai: Anthropic, args: { title: string; before: string[]; line: string }): Promise<LineWord[]> {
  const res = await ai.messages.parse({
    model: BULK_MODEL,
    max_tokens: 4000,
    system: `Split a Cantonese video caption into words for a learner. Group characters into natural words (咁古怪 → 咁 / 古怪). Cover every word in order; skip punctuation. Flag likely caption errors from sound-alike characters (荊天洞地 → 驚天動地). ${HK}`,
    messages: [
      {
        role: "user",
        content: `Video: ${args.title}\nPrevious lines:\n${args.before.join("\n") || "(none)"}\n\nLine to split:\n${args.line}`
      }
    ],
    output_config: { format: jsonSchemaOutputFormat(WordsSchema) }
  })
  return (res.parsed_output?.words ?? []).map((w) => ({
    text: w.text,
    jyutping: w.jyutping,
    meaning: w.meaning,
    formal: w.formal,
    colloquial: w.colloquial,
    likelyError: w.likely_error
  }))
}

// ---- Answer a question (streamed) ----

export const ASK_SYSTEM = `You are a Cantonese tutor for a heritage speaker who understands spoken Cantonese but was schooled in English. They have paused a YouTube video to ask about what was just said.
- Answer in English unless asked otherwise. Be brief: a few lines.
- Give every Cantonese word with Jyutping tone numbers, e.g. 咁 (gam3).
- Always say whether a word is spoken Cantonese (口語), formal written Chinese (書面語), or both, and give the other form.
- Captions are often formal Chinese, not what was said. When you infer the spoken words from a formal caption, say it's a guess.
- Point out likely caption errors (sound-alike characters).
- Use Traditional characters as used in Hong Kong.
- Skip explaining words in the user's known list unless asked.
- Light markdown only: **bold** and short bullet lists.`

export interface AskContext {
  title: string
  channel?: string | null
  lines: { text: string; colloquial?: string | null; inferred?: boolean }[]
  knownWords: string[]
}

export function askContextBlock(ctx: AskContext) {
  const lines = ctx.lines
    .map((l, i) => {
      const mark = i === ctx.lines.length - 1 ? "▶ " : "  "
      const conv = l.colloquial && l.colloquial !== l.text ? `  [口語${l.inferred ? " (inferred)" : ""}: ${l.colloquial}]` : ""
      return `${mark}${l.text}${conv}`
    })
    .join("\n")
  return `<moment>
Video: ${ctx.title}${ctx.channel ? ` (channel: ${ctx.channel})` : ""}
Caption lines up to the pause, the paused line marked ▶:
${lines || "(no captions)"}
</moment>
<known_words>${ctx.knownWords.join("、") || "none yet"}</known_words>`
}

export type ChatTurn = { role: "user" | "assistant"; content: string }

/** Streams answer text; resolves to the full answer. */
export async function* streamAnswer(ai: Anthropic, args: { ctx: AskContext; question: string; history: ChatTurn[] }): AsyncGenerator<string> {
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...args.history.slice(-10),
    { role: "user", content: `${askContextBlock(args.ctx)}\n\n${args.question}` }
  ]
  while (messages.length && messages[0].role !== "user") messages.shift()
  const stream = ai.beta.messages.stream({
    model: ANSWER_MODEL,
    max_tokens: 4000,
    system: [{ type: "text", text: ASK_SYSTEM, cache_control: { type: "ephemeral" } }],
    output_config: { effort: "low" },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    messages
  })
  let wrote = false
  for await (const ev of stream) {
    if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
      wrote = true
      yield ev.delta.text
    }
  }
  const final = await stream.finalMessage()
  if (final.stop_reason === "refusal" && !wrote) yield "Sorry, I can't answer that one."
}

// ---- Pull out the words an answer taught ----

const TaughtSchema = {
  type: "object",
  additionalProperties: false,
  required: ["words"],
  properties: {
    words: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["colloquial", "formal", "jyutping", "meaning", "notes"],
        properties: {
          colloquial: { type: "string", description: "the word in spoken Cantonese (口語) form" },
          formal: { type: ["string", "null"], description: "書面語 form, or null if the same" },
          jyutping: { type: "string" },
          meaning: { type: "string", description: "short English gloss" },
          notes: { type: ["string", "null"], description: "one line on usage, register or origin, if the answer gave one" }
        }
      }
    }
  }
} as const

export async function extractWords(ai: Anthropic, args: { question: string; answer: string; knownWords: string[] }): Promise<TaughtWord[]> {
  const res = await ai.messages.parse({
    model: BULK_MODEL,
    max_tokens: 4000,
    system: `From a tutoring exchange, list the Cantonese words or set phrases the learner asked about or was taught. Include only words the answer actually explained, not every word it mentioned in passing. Skip words in the known list. Return an empty list if nothing was taught. ${HK}`,
    messages: [
      {
        role: "user",
        content: `Known words: ${args.knownWords.join("、") || "none"}\n\nQuestion: ${args.question}\n\nAnswer:\n${args.answer}`
      }
    ],
    output_config: { format: jsonSchemaOutputFormat(TaughtSchema) }
  })
  return res.parsed_output?.words ?? []
}
