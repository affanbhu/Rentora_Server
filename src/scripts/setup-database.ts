
import { connectDB, client } from "../config/db.js";

async function setupDatabase() {
  try {
    const db = await connectDB();

    // Equipment indexes
    await db.collection("equipment").createIndex({ slug: 1 });
    await db.collection("equipment").createIndex({ category: 1 });
    await db.collection("equipment").createIndex({ availability: 1 });
    await db.collection("equipment").createIndex({ createdAt: -1 });

    // Booking indexes
    await db.collection("bookings").createIndex({
      userId: 1,
      createdAt: -1,
    });

    await db.collection("bookings").createIndex({
      equipmentSlug: 1,
      status: 1,
      startDate: 1,
    });

    await db.collection("bookings").createIndex({ status: 1 });

    // Favorites indexes
    await db.collection("favorites").createIndex(
      { userId: 1, equipmentId: 1 },
      { unique: true, name: "unique_user_equipment_favorite" }
    );

    await db.collection("favorites").createIndex(
      { userId: 1, createdAt: -1 },
      { name: "favorites_by_user_created_at" }
    );

    console.log("Database indexes created successfully!");
  } catch (error) {
    console.error("Database setup failed:", error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

setupDatabase();
