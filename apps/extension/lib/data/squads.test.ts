import { describe, expect, it } from "vitest"

import { createConvexSquads, squadError } from "./squads"

// Runs against a real deployment, like convexStore.test.ts:
// CONVEX_TEST_URL=http://127.0.0.1:3210 pnpm --filter extension test
const url = process.env.CONVEX_TEST_URL

describe.skipIf(!url)("convex squads", () => {
  const api = () => createConvexSquads(url!)

  it("signs up two people, shares a squad by code, ranks by words learned", async () => {
    const ana = await api().signUp("Ana")
    const ben = await api().signUp("Ben")
    await api().report(ana, { learned: 3, saved: 10 })
    await api().report(ben, { learned: 7, saved: 9 })

    const made = await api().create(ana, "Tuesday crew")
    expect(made.code).toMatch(/^[2-9A-HJKMNP-Z]{6}$/)
    expect(made.members.map((m) => m.name)).toEqual(["Ana"])

    const joined = await api().join(ben, made.code.toLowerCase().replace(/(...)/, "$1-"))
    expect(joined.members.map((m) => [m.name, m.learned, m.saved, m.isMe])).toEqual([
      ["Ben", 7, 9, true],
      ["Ana", 3, 10, false]
    ])
    // Joining twice is a no-op.
    expect((await api().join(ben, made.code)).members).toHaveLength(2)

    await api().leave(ben, made.id)
    expect(await api().mySquads(ben)).toEqual([])
    expect((await api().mySquads(ana))[0].members.map((m) => m.name)).toEqual(["Ana"])
  })

  it("links a second device to the same user with a one-time code", async () => {
    const chrome = await api().signUp("Cai")
    const { code } = await api().linkCode(chrome)
    const phone = await api().redeemLinkCode(code)
    expect(phone).toMatchObject({ userId: chrome.userId, name: "Cai" })
    expect(phone.secret).not.toBe(chrome.secret)
    await api().rename(phone, "Cai Yan")
    expect(await api().me(chrome)).toEqual({ name: "Cai Yan" })
    await expect(api().redeemLinkCode(code)).rejects.toThrow(/didn't work/)
  })

  it("rejects unknown sessions and codes with readable messages", async () => {
    const me = await api().signUp("Dee")
    await expect(api().mySquads({ ...me, secret: "nope" })).rejects.toThrow(/isn't signed in/)
    const err = await api()
      .join(me, "ZZZZZZ")
      .catch((e) => e)
    expect(squadError(err)).toBe("No squad has the code ZZZZZZ")
    await expect(api().signUp("  ")).rejects.toThrow(/Pick a name/)
  })
})
