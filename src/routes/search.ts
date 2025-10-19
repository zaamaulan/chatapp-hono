import { Hono } from "hono"

export const searchRouter = new Hono()

searchRouter.get("/", (c) => {
  return c.json({ message: "search get" })
})

searchRouter.post("/", (c) => {
  return c.json({ message: "search post" })
})
