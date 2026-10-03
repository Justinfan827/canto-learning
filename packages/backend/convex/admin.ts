import { internalMutation } from "./_generated/server"

/** Empties every table. Internal, so only `npx convex run admin:clearAll` (or the dashboard) can call it; the e2e smoke test uses it on a local deployment. */
export const clearAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const table of ["videos", "lines", "words", "encounters", "questions", "reviews", "phoneReviews", "counters"] as const)
      for (const row of await ctx.db.query(table).collect()) await ctx.db.delete(row._id)
  }
})
