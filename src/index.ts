import express from "express";
import { stripeController } from "./Controllers/stripe_controller";
import path from "path";
import { zuoraController } from "./Controllers/zuora_controller";
import { start } from "repl";

const app = express();
app.use(express.json()); // for parsing application/json

let start_time: number;
let end_time: number;

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
    if (req.query) {
      console.log("Request Query:", req.query);
    }
    next();
  },
  (req, res, next) => {
    console.log("Request Body:", req.body);
    next();
  },
  (req, res, next) => {
    console.log(Date.now());
    if (req.originalUrl === "/stripe/setupPaymentMethod") {
      start_time = Date.now();
    }
    if (req.originalUrl.startsWith("/callback?success=true")) {
      end_time = Date.now();
      console.log("summary");
      console.log((end_time - start_time) / 1000);
    }
    next();
  },
  stripeController,
  zuoraController
);

app.get("/", function (req, res) {
  res.redirect("checkout.html");
});

app.get("/confirm3ds", function (req, res) {
  res.redirect(`confirm3ds.html?setup_intent=${req.query.setup_intent}`);
});

app.get("/callback", function (req, res) {
  res.redirect(
    `result.html?success=${req.query.success}&errorMessage=${req.query.errorMessage}`
  );
});

app.use("/", express.static(path.join(__dirname, "web")));

app.listen(3200, () => {
  console.log("Running on port 3200, http://localhost:3200/checkout.html");
});
