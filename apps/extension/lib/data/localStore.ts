import {
  schedule,
  type CaptionKind,
  type CaptionLine,
  cleanNewWord,
  lineJyutping,
  type Encounter,
  type NewWord,
  type QuestionRecord,
  type Store,
  type StoredLine,
  type StudySnapshot,
  type StudySource,
  type TaughtWord,
  type VideoInfo,
  type Word,
  videoUrl
} from "@pna/shared"
import { openDB, type DBSchema, type IDBPDatabase } from "idb"

const DAY = 86_400_000

interface VideoRow extends VideoInfo {
  createdAt: number
}
interface LineRow extends StoredLine {
  videoId: string
}
interface WordRow extends Omit<Word, "id"> {
  id?: number
  createdAt: number
  updatedAt: number
}
interface EncounterRow {
  id?: number
  wordId: number
  videoId: string
  lineIdx: number
  kind: "asked" | "seen"
  createdAt: number
}

interface Schema extends DBSchema {
  videos: { key: string; value: VideoRow }
  lines: { key: [string, number]; value: LineRow; indexes: { video: string } }
  words: { key: number; value: WordRow; indexes: { colloquial: string; status: string } }
  encounters: { key: number; value: EncounterRow; indexes: { word: number } }
  questions: { key: number; value: QuestionRecord & { id?: number; createdAt: number } }
  reviews: { key: number; value: { id?: number; wordId: number; quizType: string; correct: boolean; createdAt: number } }
}

function open(name: string) {
  return openDB<Schema>(name, 1, {
    upgrade(db) {
      db.createObjectStore("videos", { keyPath: "id" })
      db.createObjectStore("lines", { keyPath: ["videoId", "idx"] }).createIndex("video", "videoId")
      const words = db.createObjectStore("words", { keyPath: "id", autoIncrement: true })
      words.createIndex("colloquial", "colloquial", { unique: true })
      words.createIndex("status", "status")
      db.createObjectStore("encounters", { keyPath: "id", autoIncrement: true }).createIndex("word", "wordId")
      db.createObjectStore("questions", { keyPath: "id", autoIncrement: true })
      db.createObjectStore("reviews", { keyPath: "id", autoIncrement: true })
    }
  })
}

const toWord = ({ updatedAt: _u, ...w }: WordRow): Word => w as Word
const toLine = ({ videoId: _v, ...l }: LineRow): StoredLine => l

/** IndexedDB-backed store, private to this browser profile. */
export function createLocalStore(name = "pause-and-ask"): Store {
  let dbp: Promise<IDBPDatabase<Schema>> | null = null
  const db = () => (dbp ??= open(name))

  return {
    async putVideo(video: VideoInfo, lines: CaptionLine[], captionKind: CaptionKind) {
      const d = await db()
      const tx = d.transaction(["videos", "lines"], "readwrite")
      const prev = await tx.objectStore("videos").get(video.id)
      await tx.objectStore("videos").put({ ...video, captionKind, createdAt: prev?.createdAt ?? Date.now() })
      const store = tx.objectStore("lines")
      const needsConversion: number[] = []
      for (const l of lines) {
        const old = await store.get([video.id, l.idx])
        // A changed caption text drops its cached conversion and word split.
        const keep = old && old.text === l.text
        const row: LineRow = keep
          ? { ...old, startMs: l.startMs, endMs: l.endMs }
          : { ...l, videoId: video.id, sourceRegister: null, textFormal: null, textColloquial: null, colloquialInferred: false, words: null }
        await store.put(row)
        if (!row.textColloquial) needsConversion.push(l.idx)
      }
      await tx.done
      return { needsConversion }
    },

    async getVideo(videoId) {
      const d = await db()
      const video = await d.get("videos", videoId)
      if (!video) return null
      const lines = await d.getAllFromIndex("lines", "video", videoId)
      const { createdAt: _c, ...info } = video
      return { video: info, lines: lines.sort((a, b) => a.idx - b.idx).map(toLine) }
    },

    async getLines(videoId, idxs) {
      const d = await db()
      const rows = await Promise.all(idxs.map((i) => d.get("lines", [videoId, i])))
      return rows.filter((r): r is LineRow => !!r).map(toLine)
    },

    async saveConversions(videoId, lines) {
      const tx = (await db()).transaction("lines", "readwrite")
      for (const l of lines) {
        const row = await tx.store.get([videoId, l.idx])
        if (row) await tx.store.put({ ...row, ...l })
      }
      await tx.done
    },

    async saveLineWords(videoId, idx, words) {
      const tx = (await db()).transaction("lines", "readwrite")
      const row = await tx.store.get([videoId, idx])
      if (row) await tx.store.put({ ...row, words })
      await tx.done
    },

    async saveQuestion(q: QuestionRecord) {
      await (await db()).add("questions", { ...q, createdAt: Date.now() })
    },

    async logTaughtWord(w: TaughtWord, at) {
      const now = Date.now()
      const tx = (await db()).transaction(["words", "encounters"], "readwrite")
      const words = tx.objectStore("words")
      const existing = await words.index("colloquial").get(w.colloquial)
      let row: WordRow
      if (existing) {
        // Asking about a word again counts as a miss.
        const next = schedule(existing, false, now)
        row = {
          ...existing,
          ...next,
          status: "learning",
          timesAsked: existing.timesAsked + 1,
          formal: existing.formal ?? w.formal,
          jyutping: existing.jyutping ?? w.jyutping,
          meaning: existing.meaning ?? w.meaning,
          notes: existing.notes ?? w.notes,
          updatedAt: now
        }
      } else {
        row = {
          colloquial: w.colloquial,
          formal: w.formal,
          jyutping: w.jyutping,
          meaning: w.meaning,
          notes: w.notes,
          status: "learning",
          timesAsked: 1,
          timesMissed: 0,
          intervalDays: 1,
          ease: 2.5,
          dueAt: now + DAY,
          createdAt: now,
          updatedAt: now
        }
      }
      row.id = await words.put(row)
      if (at.lineIdx != null)
        await tx.objectStore("encounters").add({ wordId: row.id, videoId: at.videoId, lineIdx: at.lineIdx, kind: "asked", createdAt: now })
      await tx.done
      return toWord(row)
    },

    async addWord(input: NewWord) {
      const w = cleanNewWord(input)
      if (!w) throw new Error("Enter the word in Cantonese")
      const now = Date.now()
      const tx = (await db()).transaction("words", "readwrite")
      const existing = await tx.store.index("colloquial").get(w.colloquial)
      let row: WordRow
      if (existing) {
        row = {
          ...existing,
          formal: existing.formal ?? w.formal ?? null,
          jyutping: existing.jyutping || w.jyutping,
          meaning: existing.meaning || w.meaning,
          notes: existing.notes ?? w.notes ?? null,
          updatedAt: now
        }
      } else {
        row = {
          colloquial: w.colloquial,
          formal: w.formal ?? null,
          jyutping: w.jyutping,
          meaning: w.meaning,
          notes: w.notes ?? null,
          status: "learning",
          timesAsked: 0,
          timesMissed: 0,
          intervalDays: 1,
          ease: 2.5,
          dueAt: now + DAY,
          source: "manual",
          createdAt: now,
          updatedAt: now
        }
      }
      row.id = await tx.store.put(row)
      await tx.done
      return { word: toWord(row), created: !existing }
    },

    async listWords(opts = {}) {
      const d = await db()
      const rows = opts.status ? await d.getAllFromIndex("words", "status", opts.status) : await d.getAll("words")
      rows.sort(
        opts.sort === "due"
          ? (a, b) => a.dueAt - b.dueAt
          : (a, b) => b.timesMissed - a.timesMissed || b.timesAsked - a.timesAsked || b.updatedAt - a.updatedAt
      )
      return rows.map(toWord)
    },

    async getWord(id) {
      const d = await db()
      const row = await d.get("words", id)
      if (!row) return null
      const encs = (await d.getAllFromIndex("encounters", "word", id)).sort((a, b) => b.createdAt - a.createdAt || b.id! - a.id!)
      const encounters: Encounter[] = []
      for (const e of encs) {
        const [video, line] = await Promise.all([d.get("videos", e.videoId), d.get("lines", [e.videoId, e.lineIdx])])
        encounters.push({
          id: e.id!,
          videoId: e.videoId,
          videoTitle: video?.title ?? "",
          lineIdx: e.lineIdx,
          startMs: line?.startMs ?? 0,
          endMs: line?.endMs ?? 0,
          kind: e.kind,
          createdAt: e.createdAt
        })
      }
      return { word: toWord(row), encounters }
    },

    async setStatus(id, status) {
      const tx = (await db()).transaction("words", "readwrite")
      const row = await tx.store.get(id)
      if (!row) throw new Error(`No word ${id}`)
      const next = { ...row, status, updatedAt: Date.now() }
      await tx.store.put(next)
      await tx.done
      return toWord(next)
    },

    async knownWords() {
      const rows = await (await db()).getAllFromIndex("words", "status", "known")
      return rows.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 300).map((w) => w.colloquial)
    },

    async recordReview(wordId, quizType, correct) {
      const now = Date.now()
      const tx = (await db()).transaction(["words", "reviews"], "readwrite")
      const row = await tx.objectStore("words").get(wordId)
      if (!row) throw new Error(`No word ${wordId}`)
      const next = { ...row, ...schedule(row, correct, now), updatedAt: now }
      await tx.objectStore("words").put(next)
      await tx.objectStore("reviews").add({ wordId, quizType, correct, createdAt: now })
      await tx.done
      return toWord(next)
    },

    async exportStudy(): Promise<StudySnapshot> {
      const d = await db()
      const tx = d.transaction(["words", "encounters", "videos", "lines"])
      const [rows, encs, vids] = await Promise.all([
        tx.objectStore("words").getAll(),
        tx.objectStore("encounters").getAll(),
        tx.objectStore("videos").getAll()
      ])
      const lines = tx.objectStore("lines")
      const byWord = new Map<number, StudySource[]>()
      const used = new Set<string>()
      for (const e of encs.sort((a, b) => b.createdAt - a.createdAt)) {
        const line = await lines.get([e.videoId, e.lineIdx])
        if (!line) continue
        used.add(e.videoId)
        const list = byWord.get(e.wordId) ?? []
        list.push({
          videoId: e.videoId,
          lineIdx: e.lineIdx,
          startMs: line.startMs,
          endMs: line.endMs,
          text: line.text,
          textColloquial: line.textColloquial,
          textFormal: line.textFormal,
          textEnglish: line.textEnglish ?? null,
          jyutping: lineJyutping(line.words),
          createdAt: e.createdAt
        })
        byWord.set(e.wordId, list)
      }
      await tx.done
      return {
        version: 1,
        exportedAt: Date.now(),
        videos: vids
          .filter((v) => used.has(v.id))
          .map((v) => ({ id: v.id, title: v.title, channel: v.channel ?? null, url: videoUrl(v.id), firstSeenAt: v.createdAt })),
        words: rows.map((r) => ({ ...toWord(r), createdAt: r.createdAt, updatedAt: r.updatedAt, sources: byWord.get(r.id!) ?? [] }))
      }
    }
  }
}

/** Every row in the local database, for copying it to another backend. */
export async function dumpLocalStore(name = "pause-and-ask") {
  const d = await open(name)
  const [videos, lines, words, encounters, questions, reviews] = await Promise.all([
    d.getAll("videos"),
    d.getAll("lines"),
    d.getAll("words"),
    d.getAll("encounters"),
    d.getAll("questions"),
    d.getAll("reviews")
  ])
  d.close()
  return { videos, lines, words, encounters, questions, reviews }
}

export type LocalDump = Awaited<ReturnType<typeof dumpLocalStore>>

/**
 * Merges a dump of another copy of the database into this one, e.g. after the extension
 * moved folders and Chrome gave it a new ID and an empty database. Nothing here is overwritten:
 * a word already saved keeps its row and gains the backup's encounters, and videos already
 * here keep their lines. Running it twice adds nothing the second time.
 */
export async function restoreLocalStore(dump: Partial<LocalDump>, name = "pause-and-ask") {
  const d = await open(name)
  const tx = d.transaction(["videos", "lines", "words", "encounters", "questions", "reviews"], "readwrite")
  const added = { videos: 0, lines: 0, words: 0, encounters: 0 }

  const newVideos = new Set<string>()
  for (const v of dump.videos ?? []) {
    if (await tx.objectStore("videos").get(v.id)) continue
    await tx.objectStore("videos").put(v)
    newVideos.add(v.id)
    added.videos++
  }
  for (const l of dump.lines ?? []) {
    if (!newVideos.has(l.videoId)) continue
    await tx.objectStore("lines").put(l)
    added.lines++
  }

  // Word ids are auto-numbered, so the backup's ids clash with this database's; map them.
  const wordIds = new Map<number, number>()
  for (const { id, ...w } of dump.words ?? []) {
    const have = await tx.objectStore("words").index("colloquial").get(w.colloquial)
    if (have) wordIds.set(id!, have.id!)
    else {
      wordIds.set(id!, await tx.objectStore("words").add(w))
      added.words++
    }
  }

  for (const { id: _id, ...e } of dump.encounters ?? []) {
    const wordId = wordIds.get(e.wordId)
    if (wordId == null) continue
    const existing = await tx.objectStore("encounters").index("word").getAll(wordId)
    if (existing.some((o) => o.videoId === e.videoId && o.lineIdx === e.lineIdx && o.createdAt === e.createdAt)) continue
    await tx.objectStore("encounters").add({ ...e, wordId })
    added.encounters++
  }
  // Questions were the AI tutor's log, which the extension no longer has, so they're left out.
  const reviews = await tx.objectStore("reviews").getAll()
  for (const { id: _id, ...r } of dump.reviews ?? []) {
    const wordId = wordIds.get(r.wordId)
    if (wordId == null || reviews.some((o) => o.wordId === wordId && o.createdAt === r.createdAt)) continue
    await tx.objectStore("reviews").add({ ...r, wordId })
  }

  await tx.done
  d.close()
  return added
}
