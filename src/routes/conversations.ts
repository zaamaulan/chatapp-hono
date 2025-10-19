import { and, asc, eq, ne, sql } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { Hono } from "hono"
import { db } from "../db"
import * as schema from "../db/schema"
import { auth } from "../lib/auth"
import { Variables } from ".."

export const conversationsRouter = new Hono<{ Variables: Variables }>()

// === Subquery for last message ===
const lastMessageSubquery = db
  .select({
    conversationId: schema.message.conversationId,
    content: schema.message.content,
    createdAt: schema.message.createdAt,
    senderId: schema.message.senderId,
  })
  .from(schema.message)
  .where(
    sql`(${schema.message.conversationId}, ${schema.message.createdAt}) IN (
      SELECT ${schema.message.conversationId}, MAX(${schema.message.createdAt})
      FROM ${schema.message}
      GROUP BY ${schema.message.conversationId}
    )`
  )
  .as("last_message")

// === Routes ===
conversationsRouter.get("/", async (c) => {
  const user = c.get("user")
  const otherMember = alias(schema.conversationMember, "otherMember")
  const otherUser = alias(schema.user, "otherUser")

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const conversations = await db
    .select({
      id: schema.conversation.id,
      type: schema.conversation.type,
      name: sql`
        CASE
          WHEN ${schema.conversation.type} = 'private'
          THEN ${otherUser.name}
          ELSE ${schema.conversation.name}
        END
      `.as("name"),
      image: sql`
        CASE
          WHEN ${schema.conversation.type} = 'private'
          THEN ${otherUser.image}
          ELSE ${schema.conversation.image}
        END
      `.as("image"),
      userId: sql`
        CASE
          WHEN ${schema.conversation.type} = 'private'
          THEN ${otherUser.id}
          ELSE ${schema.conversationMember.userId}
        END
      `.as("userId"),
      lastMessageContent: lastMessageSubquery.content,
      lastMessageCreatedAt: lastMessageSubquery.createdAt,
      lastMessageSenderId: lastMessageSubquery.senderId,
    })
    .from(schema.conversation)
    .innerJoin(schema.conversationMember, eq(schema.conversation.id, schema.conversationMember.conversationId))
    .leftJoin(
      otherMember,
      and(eq(otherMember.conversationId, schema.conversation.id), ne(otherMember.userId, user?.id))
    )
    .leftJoin(otherUser, eq(otherUser.id, otherMember.userId))
    .leftJoin(lastMessageSubquery, eq(lastMessageSubquery.conversationId, schema.conversation.id))
    .where(eq(schema.conversationMember.userId, user?.id))

  return c.json(conversations)
})

conversationsRouter.get("/:id", async (c) => {
  const user = c.get("user")
  const conversationId = c.req.param("id")

  const otherMember = alias(schema.conversationMember, "otherMember")
  const otherUser = alias(schema.user, "otherUser")

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const [conv] = await db
    .select({
      id: schema.conversation.id,
      type: schema.conversation.type,
      name: sql`
        CASE
          WHEN ${schema.conversation.type} = 'private'
          THEN ${otherUser.name}
          ELSE ${schema.conversation.name}
        END
      `.as("name"),
      image: sql`
        CASE
          WHEN ${schema.conversation.type} = 'private'
          THEN ${otherUser.image}
          ELSE ${schema.conversation.image}
        END
      `.as("image"),
      userId: sql`
        CASE
          WHEN ${schema.conversation.type} = 'private'
          THEN ${otherUser.id}
        END
      `.as("userId"),
    })
    .from(schema.conversation)
    .innerJoin(schema.conversationMember, eq(schema.conversation.id, schema.conversationMember.conversationId))
    .leftJoin(
      otherMember,
      and(eq(otherMember.conversationId, schema.conversation.id), ne(otherMember.userId, user?.id))
    )
    .leftJoin(otherUser, eq(otherUser.id, otherMember.userId))
    .where(and(eq(schema.conversation.id, conversationId), eq(schema.conversationMember.userId, user?.id)))

  return c.json(conv ?? { error: "Conversation not found" })
})

conversationsRouter.delete("/:id", async (c) => {
  const conversationId = c.req.param("id")

  await db.delete(schema.conversation).where(eq(schema.conversation.id, conversationId))
  return c.json({ message: "Conversation deleted" })
})

conversationsRouter.get("/:id/messages", async (c) => {
  const conversationId = c.req.param("id")

  const messages = await db
    .select({
      id: schema.message.id,
      content: schema.message.content,
      senderId: schema.message.senderId,
    })
    .from(schema.message)
    .where(eq(schema.message.conversationId, conversationId))
    .orderBy(asc(schema.message.createdAt))

  return c.json(messages)
})
