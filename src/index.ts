import express from "express";
import { stripeController } from "./Controllers/stripe_controller";
import path from "path";

const app = express();
app.use(express.json()); // for parsing application/json

app.use(
  (req, res, next) => {
    console.log("Request URL:", req.originalUrl);
    next();
  },
  (req, res, next) => {
    console.log("Request Type:", req.method);
    next();
  },
  (req, res, next) => {
    console.log("Request Params:", req.params);
    next();
  },
  (req, res, next) => {
    console.log("Request Body:", req.body);
    next();
  },
  stripeController
);

app.get("/", function (req, res) {
  res.redirect("checkout.html");
});

app.get("/confirm3ds", function (req, res) {
  // ?setup_intent=${req.params.setup_intent}
  res.redirect(`confirm3ds.html`);
});

app.use("/", express.static(path.join(__dirname, "web")));

app.listen(3300, () => {
  console.log("Running on port 3300, http://localhost:3300/checkout.html");
});
