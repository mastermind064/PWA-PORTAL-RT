const createRateLimiter = ({ windowMs, max, message }) => {
  const hits = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = `${req.ip}:${req.originalUrl}`;
    const record = hits.get(key) || { count: 0, start: now };

    if (now - record.start > windowMs) {
      record.count = 0;
      record.start = now;
    }

    record.count += 1;
    hits.set(key, record);

    if (record.count > max) {
      return res.status(429).json({
        error: message || "Terlalu banyak permintaan, coba lagi nanti."
      });
    }

    next();
  };
};

const loginRateLimiter = createRateLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW_MS || "60000", 10),
  max: parseInt(process.env.RATE_LIMIT_LOGIN_MAX || "10", 10),
  message: "Terlalu banyak percobaan login."
});

const uploadRateLimiter = createRateLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_UPLOAD_WINDOW_MS || "60000", 10),
  max: parseInt(process.env.RATE_LIMIT_UPLOAD_MAX || "20", 10),
  message: "Terlalu banyak upload dokumen."
});

module.exports = {
  loginRateLimiter,
  uploadRateLimiter
};
