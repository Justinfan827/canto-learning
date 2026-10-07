// Build-time feature flags, set per build in .env.dev / .env.prod.

/**
 * Local transcription through the helper (apps/transcriber), for videos without captions.
 * On in dev builds; off in release builds, which use YouTube's captions only.
 */
export const TRANSCRIPTION = process.env.PLASMO_PUBLIC_TRANSCRIPTION === "1"
