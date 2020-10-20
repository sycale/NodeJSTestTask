const express = require("express");
const config = require("./config");
const pg = require("pg");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { verifyToken, checkToken } = require("./middlewares");

const apiRouter = express.Router();
const pool = new pg.Pool(config.dbConfig);

apiRouter.post("/signin", (req, res) => {
  pool.connect((err, client, done) => {
    if (err) {
      console.log(err);
    }
    client.query(
      `SELECT id, password, type FROM users where id = '${req.body.id}';`,
      (err, result) => {
        done();
        if (err) {
          console.log(err);
          res.sendStatus(404);
          return;
        }
        if (result.rowCount) {
          if (bcrypt.compareSync(req.body.password, result.rows[0].password)) {
            const user = {
              id: req.body.id,
              password: req.body.password,
              type: result.rows[0].type,
            };
            jwt.sign(
              { id: user.id, type: user.type },
              config.secret,
              { expiresIn: "10m" },
              (err, token) => {
                res.json({ token });
              }
            );
          } else {
            res.sendStatus(403);
          }
        } else res.sendStatus(404);
      }
    );
  });
});

apiRouter.post("/signup", (req, res) => {
  pool.connect((err, client, done) => {
    if (err) {
      console.log(err);
    }
    let id = req.body.id;
    const newUser = {
      id: id,
      password: bcrypt.hashSync(req.body.password, config.salt),
      type: determineType(id),
    };
    client.query(
      `INSERT INTO users (id, password, type) VALUES ('${newUser.id}', '${newUser.password}', '${newUser.type}' );`,
      (err, result) => {
        done();
        if (err) {
          console.log(err);
          res.sendStatus(409);
          return;
        }
        jwt.sign(
          { id: newUser.id, type: newUser.type },
          config.secret,
          { expiresIn: "10m" },
          (err, token) => {
            if (err) throw new Error(err);
            res.json({ token });
          }
        );
      }
    );
  });
});

apiRouter.get("/logout", verifyToken, checkToken, (req, res) => {
  if (req.err) {
    res.sendStatus(403);
  } else {
    const deleteAll = req.query.all;
    const { id } = jwt.verify(req.token, config.secret);
    pool.connect((err, client, done) => {
      if (err) {
        console.log(err);
      }
      if (deleteAll)
        client.query(
          `DELETE FROM tokens WHERE user_id = '${id}'`,
          (err, data) => {
            done();
            if (err) res.sendStatus(409);
            else res.status(200).json({ token: "", msg: "OK" });
          }
        );
      else
        client.query(
          `DELETE FROM tokens WHERE token = '${req.token}'`,
          (err, data) => {
            done();
            if (err) throw new Error(err);
            else res.status(200).json({ token: "", msg: "OK" });
          }
        );
    });
  }
});

const determineType = (login) => {
  return login.match(/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/g)
    ? "phone"
    : "email";
};

module.exports = apiRouter;
