
import "dotenv/config";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { client } from "./db.js";

export const auth = betterAuth({
  database: mongodbAdapter(client.db("rentora"), {
    client,
  }),

  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:5001",

  secret: process.env.BETTER_AUTH_SECRET,

  trustedOrigins: [
    "http://localhost:3000",
  ],

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
});
