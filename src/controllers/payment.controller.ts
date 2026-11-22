
import { Request, Response, NextFunction } from "express";
import { ObjectId } from "mongodb";
import { connectDB } from "../config/db.js";
import { stripe } from "../config/stripe.js";
import Stripe from "stripe";

export const createCheckoutSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { bookingId } = req.body;
    const user = res.locals.user;

    if (!bookingId || !ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "A valid booking ID is required.",
      });
    }

    const db = await connectDB();

    const booking = await db.collection("bookings").findOne({
      _id: new ObjectId(bookingId),
      userId: user.id,
      status: "pending",
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Pending booking not found.",
      });
    }

    if (
      typeof booking.totalPrice !== "number" ||
      booking.totalPrice <= 0 ||
      !Number.isSafeInteger(booking.totalPrice)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking amount.",
      });
    }

    const frontendUrl = process.env.FRONTEND_URL;

    if (!frontendUrl) {
      return res.status(500).json({
        success: false,
        message: "FRONTEND_URL is not configured.",
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      client_reference_id: bookingId,
      metadata: {
        bookingId,
        userId: user.id,
      },
      line_items: [
        {
          price_data: {
            currency: "bdt",
            product_data: {
              name: booking.equipmentName,
              description: `Rental from ${booking.startDate} to ${booking.endDate}`,
            },
            unit_amount: booking.totalPrice * 100,
          },
          quantity: 1,
        },
      ],
      success_url: `${frontendUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/payment/cancel?booking_id=${bookingId}`,
    });

    return res.status(200).json({
      success: true,
      message: "Stripe Checkout session created.",
      data: {
        checkoutUrl: session.url,
        sessionId: session.id,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const handleStripeWebhook = async (
  req: Request,
  res: Response
) => {
  const signature = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return res.status(400).send("Missing Stripe webhook configuration.");
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      webhookSecret
    );
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error);
    return res.status(400).send("Invalid webhook signature.");
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.payment_status !== "paid") {
        return res.status(200).json({ received: true });
      }

      const bookingId = session.metadata?.bookingId;

      if (!bookingId || !ObjectId.isValid(bookingId)) {
        return res.status(400).send("Invalid booking reference.");
      }

      const db = await connectDB();

      const booking = await db.collection("bookings").findOne({
        _id: new ObjectId(bookingId),
      });

      if (!booking) {
        return res.status(404).send("Booking not found.");
      }

      if (
        session.currency !== "bdt" ||
        session.amount_total !== booking.totalPrice * 100
      ) {
        return res.status(400).send("Payment amount does not match booking.");
      }

      await db.collection("bookings").updateOne(
        {
          _id: new ObjectId(bookingId),
          status: "pending",
        },
        {
          $set: {
            status: "confirmed",
            paymentStatus: "paid",
            stripeSessionId: session.id,
            paidAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed:", error);
    return res.status(500).send("Webhook processing failed.");
  }
};
