
import "dotenv/config";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { client } from "./db.js";

const trustedOrigins = (
  process.env.TRUSTED_ORIGINS || "http://localhost:3000"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const auth = betterAuth({
  database: mongodbAdapter(client.db("rentora"), {
    client,
  }),

  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:5001",

  secret: process.env.BETTER_AUTH_SECRET,

  trustedOrigins,

  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "customer",
        input: false,
      },
    },
  },

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
});
