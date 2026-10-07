import { getAuthConfigProvider } from "@convex-dev/better-auth/auth-config"
import type { AuthConfig } from "convex/server"

// Convex accepts the JWTs Better Auth (convex/auth.ts) issues; ctx.auth.getUserIdentity() reads them.
export default {
  providers: [getAuthConfigProvider()]
} satisfies AuthConfig
