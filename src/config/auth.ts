
import "dotenv/config";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { client } from "./db.js";

export const auth = betterAuth({
  // MongoDB Atlas database connection
  database: mongodbAdapter(client.db("rentora"), {
    client,
  }),

  // Backend server URL
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:5001",

  // Authentication secret
  secret: process.env.BETTER_AUTH_SECRET,

  // Email and password authentication
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
});
