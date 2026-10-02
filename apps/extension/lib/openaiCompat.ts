import type { LineWord, TaughtWord } from "@pna/shared"

import * as prompts from "./ai"
import type { AnswerArgs, ConvertArgs, ExplainArgs, ExtractArgs } from "./ai"

/**
 * Any OpenAI-compatible chat endpoint: OpenRouter (free models by default),
 * a local Ollama or LM Studio server, or another hosted gateway.
 */
export interface OpenAiConfig {
  baseUrl: string
  apiKey: string
  model: string
}

export const OPENROUTER_URL = "https://openrouter.ai/api/v1"
export const DEFAULT_FREE_MODEL = "qwen/qwen3.8-27b:free"

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message)
  }
}

type Msg = { role: "system" | "user" | "assistant"; content: string }

async function post(cfg: OpenAiConfig, body: object, signal?: AbortSignal) {
  let res: Response
  try {
    res = await fetch(`${cfg.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(cfg.apiKey ? { authorization: `Bearer ${cfg.apiKey}` } : {}),
        "x-title": "Pause & Ask"
      },
      body: JSON.stringify({ model: cfg.model, ...body }),
      signal
    })
  } catch (e) {
    throw new ProviderError(`Couldn't reach ${cfg.baseUrl}`, 0)
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    let msg = text
    try {
      msg = JSON.parse(text).error?.message ?? text
    } catch {}
    throw new ProviderError(msg || res.statusText, res.status)
  }
  return res
}

/** Pulls the first JSON object out of a reply, tolerating code fences or stray text. */
export function parseJsonReply<T>(text: string): T | null {
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")
  if (start < 0 || end <= start) return null
  try {
    return JSON.parse(text.slice(start, end + 1)) as T
  } catch {
    return null
  }
}

/** Asks for JSON matching `schema`; the schema also goes in the prompt for models that ignore response_format. */
async function chatJson<T>(cfg: OpenAiConfig, args: { name: string; system: string; user: string; schema: object }): Promise<T | null> {
  const res = await post(cfg, {
    messages: [
      { role: "system", content: `${args.system}\n\nReply with only a JSON object matching this JSON schema:\n${JSON.stringify(args.schema)}` },
      { role: "user", content: args.user }
    ] satisfies Msg[],
    response_format: { type: "json_schema", json_schema: { name: args.name, strict: true, schema: args.schema } },
    max_tokens: 16000
  })
  const data = await res.json()
  if (data.error) throw new ProviderError(data.error.message ?? "Model error", data.error.code ?? 500)
  return parseJsonReply<T>(data.choices?.[0]?.message?.content ?? "")
}

/** Reads an OpenAI-style server-sent event stream, yielding content deltas. */
export async function* readDeltas(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.pipeThrough(new TextDecoderStream()).getReader()
  let buf = ""
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buf += value
    let nl: number
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim()
      buf = buf.slice(nl + 1)
      if (!line.startsWith("data:")) continue
      const data = line.slice(5).trim()
      if (data === "[DONE]") return
      const ev = JSON.parse(data)
      if (ev.error) throw new ProviderError(ev.error.message ?? "Model error", ev.error.code ?? 500)
      const text = ev.choices?.[0]?.delta?.content
      if (text) yield text
    }
  }
}

export function openAiCompat(cfg: OpenAiConfig) {
  return {
    async convertLines(args: ConvertArgs) {
      const out = await chatJson<Parameters<typeof prompts.mapConverted>[0]>(cfg, {
        name: "converted",
        system: prompts.CONVERT_SYSTEM,
        user: prompts.convertUser(args),
        schema: prompts.ConvertedSchema
      })
      return prompts.mapConverted(out, args)
    },

    async explainLine(args: ExplainArgs): Promise<LineWord[]> {
      const out = await chatJson<Parameters<typeof prompts.mapWords>[0]>(cfg, {
        name: "words",
        system: prompts.EXPLAIN_SYSTEM,
        user: prompts.explainUser(args),
        schema: prompts.WordsSchema
      })
      return prompts.mapWords(out)
    },

    async *streamAnswer(args: AnswerArgs): AsyncGenerator<string> {
      const res = await post(cfg, {
        messages: [{ role: "system", content: prompts.ASK_SYSTEM }, ...prompts.answerMessages(args)],
        max_tokens: 4000,
        stream: true
      })
      if (!res.body) throw new ProviderError("Empty response", 500)
      yield* readDeltas(res.body)
    },

    async extractWords(args: ExtractArgs): Promise<TaughtWord[]> {
      const out = await chatJson<{ words: TaughtWord[] }>(cfg, {
        name: "taught",
        system: prompts.EXTRACT_SYSTEM,
        user: prompts.extractUser(args),
        schema: prompts.TaughtSchema
      })
      return out?.words ?? []
    }
  }
}

/** Cheap call that fails on a bad key or model. */
export async function checkOpenAi(cfg: OpenAiConfig) {
  await post(cfg, { messages: [{ role: "user", content: "Reply with OK." }], max_tokens: 20 })
}
