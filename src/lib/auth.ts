import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db } from "../db"
import bcrypt from "bcrypt"
import { customSession } from "better-auth/plugins"
import { user as userSchema } from "../db/schema"
import { eq } from "drizzle-orm"

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    password: {
      hash: async (password) => await bcrypt.hash(password, 10),
      verify: async ({ password, hash }) => await bcrypt.compare(password, hash),
    },
  },
  advanced: {
    database: {
      generateId: false,
    },
    crossSubDomainCookies: {
      enabled: true,
    },
  },
  plugins: [
    customSession(async ({ user, session }) => {
      const username = await db.query.user.findFirst({
        where: eq(userSchema.id, user.id),
        columns: {
          username: true,
        },
      })
      return {
        user: {
          ...user,
          ...username,
        },
        session,
      }
    }),
  ],
})

export type Session = typeof auth.$Infer.Session