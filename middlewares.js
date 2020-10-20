const pg = require("pg");
const jwt = require("jsonwebtoken");
const config = require("./config");

const pool = new pg.Pool(config.dbConfig);

function checkToken(req, res, next) {
  jwt.verify(req.token, config.secret, (err, data) => {
    pool.connect((err, client, done) => {
      if (err) throw new Error(err);
      client.query(
        `SELECT token FROM tokens WHERE user_id = '${data.id}'`,
        (err, result) => {
          done();
          if (err) throw new Error(err);
          result.rows.forEach((item) => {
            if (item.token === req.token) {
              req.err = "invalid token";
              next();
            }
          });
        }
      );
      client.query(
        `INSERT INTO tokens (user_id, token) VALUES ('${data.id}', '${req.token}')`,
        (err, result) => {
          done();
          console.log("here");
          if (err) throw new Error(err);
          jwt.sign(
            { id: data.id, type: data.type },
            config.secret,
            { expiresIn: "10m" },
            (err, token) => {
              if (err) throw new Error(err);
              req.token = token;
              req.id = data.id;
              req.type = data.type;
              next();
            }
          );
        }
      );
    });
  });
}

function verifyToken(req, res, next) {
  const bearerHeader = req.headers["authorization"];

  if (bearerHeader) {
    const bearer = bearerHeader.split(" ");
    const bearerToken = bearer[1];
    req.token = bearerToken;
    next();
  } else {
    return res.sendStatus(403);
  }
}

module.exports = {
  checkToken,
  verifyToken,
};
