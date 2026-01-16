const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const ACCESS_TTL = process.env.ACCESS_TTL || "15m";
const REFRESH_TTL_DAYS = parseInt(process.env.REFRESH_TTL_DAYS || "30", 10);

const hashPassword = (password) => bcrypt.hashSync(password, 10);
const verifyPassword = (password, hash) => bcrypt.compareSync(password, hash);

const signAccessToken = (payload) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TTL });

const verifyToken = (token) => jwt.verify(token, JWT_SECRET);

const refreshExpiry = () => {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + REFRESH_TTL_DAYS);
  return expiry;
};

module.exports = {
  hashPassword,
  verifyPassword,
  signAccessToken,
  verifyToken,
  refreshExpiry
};
