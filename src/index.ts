import express from "express";
import { stripeController } from "./Controllers/stripe_controller";
import path from "path";
import { zuoraController } from "./Controllers/zuora_controller";

const app = express();
app.use(express.json()); // for parsing application/json

app.use(
  express.static(path.join(__dirname, "web")),
  express.static(path.join(__dirname, "css")),
  (req, res, next) => {
    console.log("Request URL:", req.originalUrl);
    next();
  },
  (req, res, next) => {
    console.log("Request Type:", req.method);
    next();
  },
  (req, res, next) => {
    if (req.query) {
      console.log("Request Query:", req.query);
    }
    next();
  },
  (req, res, next) => {
    console.log("Request Body:", req.body);
    next();
  },
  stripeController,
  zuoraController
);

app.get("/confirm3ds", function (req, res) {
  res.redirect(`confirm3ds.html?setup_intent=${req.query.setup_intent}`);
});

app.get("/callback", function (req, res) {
  res.redirect(
    `result.html?success=${req.query.success}&errorMessage=${req.query.errorMessage}`
  );
});

app.listen(3200, () => {
  console.log("Running on port 3200, http://localhost:3200/checkout.html");
});
