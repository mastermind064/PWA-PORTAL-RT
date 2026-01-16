require("dotenv").config();
const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");

const { ensureSuperAdmin } = require("./services/seedService");
const { authMiddleware } = require("./middleware");
const authRoutes = require("./routes/auth");
const superAdminRoutes = require("./routes/superAdmin");
const rtRoutes = require("./routes/rt");
const residentRoutes = require("./routes/residents");
const profileRoutes = require("./routes/profile");
const documentRoutes = require("./routes/documents");
const { swaggerSpec } = require("./swagger");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/auth", authRoutes);
app.use("/super-admin", authMiddleware, superAdminRoutes);
app.use("/rt", authMiddleware, rtRoutes);
app.use("/residents", authMiddleware, residentRoutes);
app.use("/me", authMiddleware, profileRoutes);
app.use("/documents", authMiddleware, documentRoutes);

app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Server error" });
});

ensureSuperAdmin().catch((err) => {
  console.error("Gagal inisialisasi super admin:", err.message);
});

const scheduleRefreshTokenCleanup = () => {
  const intervalMs = parseInt(
    process.env.REFRESH_CLEANUP_INTERVAL_MS || "900000",
    10
  );
  if (!intervalMs || Number.isNaN(intervalMs)) {
    return;
  }
  setInterval(async () => {
    try {
      const db = require("./db");
      await db.query("DELETE FROM refresh_token WHERE expires_at < NOW()");
    } catch (err) {
      console.error("Gagal cleanup refresh token:", err.message);
    }
  }, intervalMs);
};

scheduleRefreshTokenCleanup();
app.listen(port, () => {
  console.log(`Portal RT API running on http://localhost:${port}`);
});
