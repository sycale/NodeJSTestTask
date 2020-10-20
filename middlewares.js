const pg = require("pg");
const jwt = require("jsonwebtoken");
const config = require("./config");

const pool = new pg.Pool(config.dbConfig);

function checkToken(req, res, next) {
  req.err = false;
  const { id } = jwt.verify(req.token, config.secret);
  pool.connect((err, client, done) => {
    if (err) throw new Error(err);
    client.query(
      `SELECT token FROM tokens WHERE user_id = '${id}'`,
      (err, result) => {
        done();
        if (err) throw new Error(err);
        result.rows.forEach((item) => {
          if (item.token === req.token) {
            req.err = true;
            next();
          }
        });
        if (!req.err) {
          jwt.verify(req.token, config.secret, (err, data) => {
            if (err) req.err = true;
            else {
              client.query(
                `INSERT INTO tokens (user_id, token) VALUES ('${data.id}', '${req.token}')`
              );
              jwt.sign(
                { id: data.id, type: data.type },
                config.secret,
                { expiresIn: "10m" },
                (err, newToken) => {
                  if (err) throw new Error(err);
                  req.token = newToken;
                  next();
                }
              );
            }
          });
        }
      }
    );
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
