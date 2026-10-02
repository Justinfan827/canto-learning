const DAY = 24 * 60 * 60 * 1000

export interface Schedulable {
  intervalDays: number
  ease: number
  timesMissed: number
}

/**
 * Simplified SM-2. A correct answer multiplies the interval by ease; a miss
 * (wrong answer, or asking about the word again) resets it to 1 day and
 * lowers ease by 0.2, never below 1.3.
 */
export function schedule<T extends Schedulable>(word: T, correct: boolean, now = Date.now()): T & { dueAt: number } {
  let { intervalDays, ease, timesMissed } = word
  if (correct) {
    intervalDays = Math.max(1, intervalDays * ease)
  } else {
    intervalDays = 1
    ease = Math.max(1.3, Math.round((ease - 0.2) * 100) / 100)
    timesMissed += 1
  }
  return { ...word, intervalDays, ease, timesMissed, dueAt: now + intervalDays * DAY }
}
