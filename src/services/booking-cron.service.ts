import { connectDB } from "../config/db.js";
import { sendCompletionEmail } from "./email.service.js";

const getBangladeshDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

export const completeExpiredBookings = async () => {
  const db = await connectDB();
  const bookingsCollection = db.collection("bookings");
  const today = getBangladeshDate();

  const bookings = await bookingsCollection.find({
    $or: [
      { status: "confirmed", endDate: { $lt: today } },
      {
        status: "completed",
        $or: [
          { renterCompletionEmailSentAt: { $exists: false } },
          { ownerCompletionEmailSentAt: { $exists: false } },
        ],
      },
    ],
  }).toArray();

  let completed = 0;
  let emailsSent = 0;

  for (const booking of bookings) {
    if (booking.status === "confirmed") {
      const update = await bookingsCollection.updateOne(
        { _id: booking._id, status: "confirmed", endDate: { $lt: today } },
        {
          $set: {
            status: "completed",
            completedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );

      if (update.modifiedCount === 0) continue;

      booking.status = "completed";
      completed++;
    }

    let ownerEmail = booking.ownerEmail;

    if (!ownerEmail && booking.equipmentSlug) {
      const equipment = await db.collection("equipment").findOne({
        slug: booking.equipmentSlug,
      });
      ownerEmail = equipment?.ownerEmail || "";
    }

    const equipmentName = booking.equipmentName || "rental equipment";
    const bookingId = booking._id.toString();

    if (
      booking.userEmail &&
      !booking.renterCompletionEmailSentAt
    ) {
      try {
        await sendCompletionEmail(
          booking.userEmail,
          "Rentora: Your rental is completed",
          `Hello ${booking.userName || "Customer"},\n\nYour rental for ${equipmentName} has been marked as completed.\nBooking ID: ${bookingId}\n\nThank you for using Rentora!`
        );

        await bookingsCollection.updateOne(
          { _id: booking._id },
          { $set: { renterCompletionEmailSentAt: new Date() } }
        );
        emailsSent++;
      } catch (error) {
        console.error("Renter completion email failed:", error);
      }
    }

    if (ownerEmail && !booking.ownerCompletionEmailSentAt) {
      try {
        await sendCompletionEmail(
          ownerEmail,
          "Rentora: Rental booking completed",
          `Hello ${booking.ownerName || "Equipment Owner"},\n\nThe rental for ${equipmentName} has been marked as completed.\nBooking ID: ${bookingId}\nCustomer: ${booking.userName || "Customer"}\n\nThank you for using Rentora!`
        );

        await bookingsCollection.updateOne(
          { _id: booking._id },
          { $set: { ownerCompletionEmailSentAt: new Date() } }
        );
        emailsSent++;
      } catch (error) {
        console.error("Owner completion email failed:", error);
      }
    }
  }

  return { completed, emailsSent, checked: bookings.length, date: today };
};
