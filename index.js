const express = require("express");
const bodyParser = require("body-parser");
const ping = require("ping");
const api = require("./Router");
const config = require("./config");
const { checkToken, verifyToken } = require("./middlewares");
const jwt = require("jsonwebtoken");

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
  app.options("*", (req, res) => {
    res.header(
      "Access-Control-Allow-Methods",
      "GET, PATCH, PUT, POST, DELETE, OPTIONS"
    );
    res.send();
  });
});
app.use((req, res, next) => {
  console.log("/" + req.method + " " + req.headers.host + req.url);
  next();
});

app.get("/latency", verifyToken, checkToken, (req, res) => {
  if (req.err) res.sendStatus(403);
  else
    ping.promise.probe("google.com").then((msg) => {
      res.status(200).json({ responseTime: msg.time, token: req.token });
    });
});

app.get("/info", verifyToken, checkToken, (req, res) => {
  const { id, type } = jwt.verify(req.token, config.secret);
  console.log(req.token);
  if (req.err) res.sendStatus(403);
  else res.status(200).json({ token: req.token, id, type });
});

app.use("/api", api);

app.listen(config.port, "localhost", () => {
  console.log("server is running, port " + config.port);
});
