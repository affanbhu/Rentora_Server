
import { connectDB, client } from "../config/db.js";

const equipmentList = [
  {
    slug: "excavator",
    name: "Heavy Duty Excavator",
    category: "Construction",
    description: "Powerful excavator suitable for construction and digging projects.",
    dailyRate: 12000,
    location: "Dhaka, Bangladesh",
    imageUrl: "https://images.unsplash.com/photo-1580901368919-7738efb0f87e",
    availability: "Available",
  },
  {
    slug: "pickup-truck",
    name: "Commercial Pickup Truck",
    category: "Vehicles",
    description: "Reliable pickup truck for transporting goods and materials.",
    dailyRate: 5000,
    location: "Dhaka, Bangladesh",
    imageUrl: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf",
    availability: "Available",
  },
  {
    slug: "power-generator",
    name: "Industrial Power Generator",
    category: "Power Tools",
    description: "High-capacity generator for construction sites and events.",
    dailyRate: 3500,
    location: "Narsingdi, Bangladesh",
    imageUrl: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e",
    availability: "Available",
  },
  {
    slug: "concrete-mixer",
    name: "Concrete Mixer Machine",
    category: "Construction",
    description: "Efficient concrete mixer for small and large construction projects.",
    dailyRate: 2500,
    location: "Dhaka, Bangladesh",
    imageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd",
    availability: "Available",
  },
  {
    slug: "mini-excavator",
    name: "Mini Excavator",
    category: "Construction",
    description: "Compact excavator suitable for smaller construction projects.",
    dailyRate: 8000,
    location: "Gazipur, Bangladesh",
    imageUrl: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5",
    availability: "Available",
  },
];

async function seedEquipment() {
  try {
    const db = await connectDB();
    const collection = db.collection("equipment");

    for (const equipment of equipmentList) {
      await collection.updateOne(
        { slug: equipment.slug },
        {
          $set: {
            ...equipment,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );
    }

    console.log("Equipment seed completed successfully!");
    console.log(`${equipmentList.length} equipment records added or updated.`);
  } catch (error) {
    console.error("Equipment seeding failed:", error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

seedEquipment();
