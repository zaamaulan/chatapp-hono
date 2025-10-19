import "dotenv/config"
import jwt from "jsonwebtoken"

const SECRET_KEY = process.env.SECRET_KEY || "secret"

export const generateToken = (payload: object) => {
  return jwt.sign(payload, SECRET_KEY, { expiresIn: "1h" })
}

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, SECRET_KEY)
  } catch (error) {
    return null
  }
}
