const express = require("express");
const path = require("path");
const app = express();

const myLogger = function (req, res, next) {
  console.log("LOGGED");
  next();
};

app.use(myLogger);

app.get("/", function (req, res) {
  res.redirect("checkout.html");
});

app.use("/", express.static(path.join(__dirname, "web")));

app.listen(3300, () => {
  console.log("Running on port 3300, http://localhost:3300/");
});
