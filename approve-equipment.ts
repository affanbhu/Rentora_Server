import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config();

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is missing from .env");
}

const client = new MongoClient(uri);

try {
  await client.connect();

  const db = client.db("rentora");

  const result = await db.collection("equipment").updateMany(
    { availability: { $regex: "^available$", $options: "i" } },
    { $set: { approvalStatus: "approved" } }
  );

  console.log("Matched equipment:", result.matchedCount);
  console.log("Updated equipment:", result.modifiedCount);
  console.log("Approval update completed.");
} catch (error) {
  console.error("Update failed:", error);
} finally {
  await client.close();
}
