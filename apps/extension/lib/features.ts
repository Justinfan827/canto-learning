// Build-time feature flags, set per build in .env.dev / .env.prod.

/**
 * Everything that talks to the local helper (apps/transcriber): transcribing videos without
 * captions, backups of the local database on disk, and relaying saved words to the phone.
 * On in dev builds; off in release builds, which use YouTube's captions only.
 */
export const LOCAL_HELPER = process.env.PLASMO_PUBLIC_LOCAL_HELPER === "1"
