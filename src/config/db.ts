
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

// Load environment variables before reading MONGODB_URI
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is missing from .env file");
}

const client = new MongoClient(MONGODB_URI);

let isConnected = false;

const connectDB = async () => {
  try {
    if (!isConnected) {
      await client.connect();
      await client.db("admin").command({ ping: 1 });

      isConnected = true;
      console.log("MongoDB Atlas connected successfully!");
    }

    return client.db("rentora");
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    throw error;
  }
};

export { connectDB, client };
