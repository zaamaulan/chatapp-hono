import { Hono } from "hono"
import { db } from "../db"
import { user as userSchema } from "../db/schema"
import { eq } from "drizzle-orm"
import { auth } from "../lib/auth"

export const usersRouter = new Hono()

usersRouter.get("/:id", async (c) => {
  const { id } = c.req.param()

  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.json({ error: "Unauthorized" }, 401)

  const user = await db.query.user.findFirst({
    where: eq(userSchema.id, id),
    columns: {
      id: true,
      name: true,
      image: true,
      username: true,
      email: true,
      createdAt: true,
    },
  })

  return c.json(user)
})
