import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { auth } from "./lib/auth"
import { conversationsRouter } from "./routes/conversations"
import { searchRouter } from "./routes/search"
import { usersRouter } from "./routes/users"

export type Variables = {
  user: typeof auth.$Infer.Session.user | null
  session: typeof auth.$Infer.Session.session | null
}

const app = new Hono<{ Variables: Variables }>()

app.use(
  "*", // or replace with "*" to enable cors for all routes
  cors({
    origin: "http://localhost:3000", // replace with your origin
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  })
)

app.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) {
    c.set("user", null)
    c.set("session", null)
    return next()
  }
  c.set("user", session.user)
  c.set("session", session.session)
  return next()
})

app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw)
})

app.route("/api/conversations", conversationsRouter)
app.route("/api/users", usersRouter)
app.route("/api/search", searchRouter)

const port = 3001
serve(
  {
    port: port,
    fetch: app.fetch,
  },
  () => console.log(`Listening on http://localhost:${port}`)
)
