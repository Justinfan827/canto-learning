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

/** Example sentences that use `word`, best first. */
export function examplesFor(word: string, examples: Examples, max = 3): Example[] {
  return (examples.words[word] ?? []).slice(0, max).map((i) => {
    const [yue, jyutping, english, source] = examples.sentences[i]
    return { yue, jyutping, english, source: examples.sources[source]?.name ?? "" }
  })
}
