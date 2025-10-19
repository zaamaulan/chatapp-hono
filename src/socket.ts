import { instrument } from "@socket.io/admin-ui"
import { createServer } from "http"
import { Server } from "socket.io"
import { auth } from "./lib/auth"
import { db } from "./db"
import * as schema from "./db/schema"
import { eq } from "drizzle-orm"

const httpServer = createServer()

const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3000", "https://admin.socket.io"],
    credentials: true,
  },
})

io.use(async (socket, next) => {
  try {
    const headers = socket.request.headers as Record<string, string>
    const session = await auth.api.getSession({ headers })

    if (!session) return next(new Error("Unauthorized"))
    socket.data.session = session

    next()
  } catch (err) {
    next(new Error("Internal Server Error"))
  }
})

io.on("connection", (socket) => {
  const userId = socket.data.session.user.id
  const userName = socket.data.session.user.name

  socket.join(`user_${userId}`)
  console.log(`User ${userId} with name ${userName} connected`)

  socket.on("message:send", async (data) => {
    const [message] = await db
      .insert(schema.message)
      .values({
        ...data.message,
        senderId: userId,
      })
      .returning()
    const [conversation] = await db
      .update(schema.conversation)
      .set({
        lastMessageAt: message.createdAt,
        lastMessageContent: message.content,
        lastMessageSenderId: message.senderId,
      })
      .where(eq(schema.conversation.id, data.message.conversationId))
      .returning()

    io
      .to(`user_${userId}`)
      .to(`user_${data.recipientId}`)
      .emit("message:new", {
        ...message,
        lastMessageContent: message.content,
        lastMessageCreatedAt: message.createdAt,
        lastMessageSenderId: message.senderId,
      })

    // io.to(`user_${userId}`).to(`user_${data.recipientId}`).emit("last_message_update", {
    //   conversationId: conversation.id,
    //   lastMessageContent: message.content,
    //   lastMessageCreatedAt: message.createdAt,
    //   lastMessageSenderId: message.senderId,
    // })

    console.log({ message })
    console.log({ conversation })
  })

  // socket.on("send_message", ({ message, recipientId }) => {
  //   const data = {
  //     ...message,
  //     senderId: userId,
  //     createdAt: new Date().toISOString(),
  //     updatedAt: new Date().toISOString(),
  //     id: crypto.randomUUID(),
  //   }

  //   socket.to(recipientId).emit("receive_message", data)
  //   console.log(`Message sent to ${recipientId}`, data)
  // })

  socket.on("disconnect", () => {
    console.log(`User ${userId} with name ${userName} disconnected`)
    socket.leave(userId)
  })
})

instrument(io, {
  auth: false,
  mode: "development",
})

httpServer.listen(4000, () => console.log("Socket.IO on :4000"))
