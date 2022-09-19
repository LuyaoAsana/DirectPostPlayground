import dotenv from "dotenv";
import express from "express";
import Stripe from "stripe";

dotenv.config();
const stripe = new Stripe(
  process.env.STRIPE_TEST_SECRET_KEY as string,
  {} as Stripe.StripeConfig
);

export const stripeController = express.Router();

stripeController.post("/stripe/setupPaymentMethod", async function (req, res) {
  const paymentMethod = await stripe.paymentMethods.create(req.body);
  res.send(paymentMethod);
});

stripeController.post("/stripe/setupIntends", async function (req, res) {
  const setupIntent = await stripe.setupIntents.create(req.body);
  res.send(setupIntent);
});

stripeController.post("/stripe/retrieveSetupIntent", async function (req, res) {
  const setupIntent = await stripe.setupIntents.retrieve(
    req.body.setupIntentsId,
    {
      expand: ["latest_attempt"],
    }
  );
  res.send(setupIntent);
});
