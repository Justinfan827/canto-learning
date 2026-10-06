/** One example sentence: [Cantonese, Jyutping, English, source id]. */
export type ExampleRow = [yue: string, jyutping: string, english: string, source: number]

/**
 * Bundled example sentences: the sentences, the sources they came from (for attribution), and for
 * each Traditional headword the indexes of sentences that use it, best first.
 */
export interface Examples {
  sources: { name: string; license: string; url: string }[]
  sentences: ExampleRow[]
  words: Record<string, number[]>
}

export interface Example {
  yue: string
  jyutping: string
  english: string
  source: string
}

/**
 * Example sentences that use `word`, best first. A word the index doesn't list (the sentence split
 * it differently, or it's a phrase someone grouped by hand) falls back to sentences that contain it.
 */
export function examplesFor(word: string, examples: Examples, max = 3): Example[] {
  let ids = examples.words[word] ?? []
  if (!ids.length && [...word].length > 1) {
    ids = []
    for (let i = 0; i < examples.sentences.length && ids.length < max; i++) if (examples.sentences[i][0].includes(word)) ids.push(i)
  }
  return ids.slice(0, max).map((i) => {
    const [yue, jyutping, english, source] = examples.sentences[i]
    return { yue, jyutping, english, source: examples.sources[source]?.name ?? "" }
  })
}
