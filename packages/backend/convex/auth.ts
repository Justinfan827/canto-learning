import { createClient, type GenericCtx } from "@convex-dev/better-auth"
import { convex, crossDomain } from "@convex-dev/better-auth/plugins"
import { betterAuth } from "better-auth/minimal"

import { components } from "./_generated/api"
import type { DataModel } from "./_generated/dataModel"
import { query } from "./_generated/server"
import authConfig from "./auth.config"

// Sign-in for the extension and the phone, run by Better Auth inside this deployment.
//
// Deployment settings (`npx convex env set`):
//   BETTER_AUTH_SECRET    random secret for signing sessions
//   EXTENSION_ID          the extension's pinned ID (`key` in apps/extension/package.json)
//   GOOGLE_CLIENT_ID      Google sign-in; off until both are set
//   GOOGLE_CLIENT_SECRET
//   DEV_LOGIN=1           dev deployments only: allows email and password, for the dev
//                         build's "Sign in as dev user" and for tests. Never set it in production.

export const authComponent = createClient<DataModel>(components.betterAuth)

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  const extensionId = process.env.EXTENSION_ID!
  const google = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  return betterAuth({
    baseURL: process.env.CONVEX_SITE_URL,
    // Extension pages, and the address Chrome's sign-in window returns to.
    trustedOrigins: [`chrome-extension://${extensionId}`, `https://${extensionId}.chromiumapp.org`],
    database: authComponent.adapter(ctx),
    emailAndPassword: { enabled: process.env.DEV_LOGIN === "1", requireEmailVerification: false },
    socialProviders: google ? { google: { clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! } } : {},
    plugins: [crossDomain({ siteUrl: `chrome-extension://${extensionId}` }), convex({ authConfig })]
  })
}

/** The signed-in user, or null. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx)
    return user ? { id: user._id, name: user.name, email: user.email } : null
  }
})
