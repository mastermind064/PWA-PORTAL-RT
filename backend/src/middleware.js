const { verifyToken } = require("./utils");
const db = require("./db");

const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }
  try {
    const payload = verifyToken(token);
    req.auth = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

const requireRole = (roles) => (req, res, next) => {
  if (!req.auth) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (!roles.includes(req.auth.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
};

const requireRtAccess = async (req, res, next) => {
  if (!req.auth || !req.auth.rtId) {
    return res.status(403).json({ error: "Missing rt context" });
  }
  try {
    const [rows] = await db.query(
      `SELECT id FROM user_rt
       WHERE user_id = :user_id AND rt_id = :rt_id AND status = 'ACTIVE'
       LIMIT 1`,
      { user_id: req.auth.userId, rt_id: req.auth.rtId }
    );
    if (rows.length === 0) {
      return res.status(403).json({ error: "No rt membership" });
    }
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  authMiddleware,
  requireRole,
  requireRtAccess
};
