import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is missing");

const client = new MongoClient(uri);

try {
  await client.connect();

  const result = await client.db("rentora").collection("equipment").updateOne(
    {
      name: "Portable Air Compressor",
      availability: { $regex: "^available$", $options: "i" }
    },
    {
      $set: { approvalStatus: "approved" }
    }
  );

  console.log("Matched:", result.matchedCount);
  console.log("Updated:", result.modifiedCount);
} finally {
  await client.close();
}
