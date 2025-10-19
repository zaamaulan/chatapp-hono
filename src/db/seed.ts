import { faker } from "@faker-js/faker"
import { db } from "./" // sesuaikan dengan path instance drizzle kamu
import { user, conversation, conversationMember, message } from "./schema"
import { eq } from "drizzle-orm"

async function main() {
  // Seed users
  const usersData = Array.from({ length: 10 }).map(() => ({
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    username: faker.internet.username(),
    email: faker.internet.email(),
    emailVerified: faker.datatype.boolean(),
    image: faker.image.avatar(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }))

  await db.insert(user).values(usersData)
  console.log("✅ Users seeded")

  // Seed conversations
  const conversationsData = Array.from({ length: 5 }).map(() => ({
    id: faker.string.uuid(),
    type: "private",
    name: null,
    image: null,
    createdAt: new Date(),
  }))

  await db.insert(conversation).values(conversationsData)
  console.log("✅ Conversations seeded")

  // Ambil userId dan conversationId
  const users = await db.select().from(user)
  const conversations = await db.select().from(conversation)

  // Seed conversation members
  const conversationMembers = conversations.flatMap((conv) => {
    const selectedUsers = faker.helpers.arrayElements(users, 2)
    return selectedUsers.map((u) => ({
      id: faker.string.uuid(),
      conversationId: conv.id,
      userId: u.id,
      joinedAt: new Date(),
    }))
  })

  await db.insert(conversationMember).values(conversationMembers)
  console.log("✅ Conversation members seeded")

  // Seed messages
  const messagesData = Array.from({ length: 50 }).map(() => ({
    senderId: faker.helpers.arrayElement(users).id,
    content: faker.lorem.sentence(),
    sentAt: new Date(),
    readAt: faker.datatype.boolean() ? new Date() : null,
  }))

  await db.insert(message).values(messagesData)
  console.log("✅ Messages seeded")
}

main()
  .then(() => {
    console.log("🌱 Seeding complete")
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
