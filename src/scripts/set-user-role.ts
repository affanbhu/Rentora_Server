
import { connectDB, client } from "../config/db.js";

const email = process.argv[2]?.trim().toLowerCase();
const role = process.argv[3];

const allowedRoles = ["customer", "owner", "admin"];

async function setUserRole() {
  try {
    if (!email || !role || !allowedRoles.includes(role)) {
      console.error(
        'Usage: npx tsx src/scripts/set-user-role.ts "user@email.com" customer|owner|admin'
      );
      process.exitCode = 1;
      return;
    }

    const db = await connectDB();

    // Better Auth's default MongoDB user collection
    const users = db.collection("user");

    const result = await users.updateOne(
      { email },
      {
        $set: {
          role,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      console.error("No user found with that email address.");
      process.exitCode = 1;
      return;
    }

    console.log(`Successfully assigned the ${role} role to ${email}.`);
  } catch (error) {
    console.error("Role assignment failed:", error);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

setUserRole();
