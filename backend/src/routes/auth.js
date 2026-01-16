const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../db");
const {
  hashPassword,
  verifyPassword,
  signAccessToken,
  refreshExpiry
} = require("../utils");
const { registerResident } = require("../services/residentService");
const { verifyRecaptcha } = require("../services/recaptchaService");
const { loginRateLimiter } = require("../middleware/rateLimit");

const router = express.Router();

/**
 * @openapi
 * /auth/register-admin-rt:
 *   post:
 *     summary: Registrasi admin RT baru (menunggu approval super admin)
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rtName
 *               - adminEmail
 *               - password
 *             properties:
 *               rtName:
 *                 type: string
 *               rw:
 *                 type: string
 *               address:
 *                 type: string
 *               adminEmail:
 *                 type: string
 *               adminPhone:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Registrasi berhasil dan menunggu approval
 *       409:
 *         description: Email sudah terdaftar
 */
router.post("/register-admin-rt", async (req, res, next) => {
  const { rtName, rw, address, adminEmail, adminPhone, password } = req.body;
  if (!rtName || !adminEmail || !password) {
    return res.status(400).json({ error: "Field wajib belum lengkap" });
  }
  try {
    const [emailRows] = await db.query(
      "SELECT id FROM users WHERE email = :email LIMIT 1",
      { email: adminEmail }
    );
    if (emailRows.length > 0) {
      return res.status(409).json({ error: "Email sudah terdaftar" });
    }
    const rtId = uuidv4();
    const userId = uuidv4();
    const now = new Date();

    await db.transaction(async (conn) => {
      await conn.query(
        `INSERT INTO rt (id, name, rw, address, status, invite_code, created_at)
         VALUES (:id, :name, :rw, :address, :status, :invite_code, :created_at)`,
        {
          id: rtId,
          name: rtName,
          rw: rw || null,
          address: address || null,
          status: "PENDING_APPROVAL",
          invite_code: null,
          created_at: now
        }
      );

      await conn.query(
        `INSERT INTO users (id, email, phone, password_hash, role, status, created_at)
         VALUES (:id, :email, :phone, :password_hash, :role, :status, :created_at)`,
        {
          id: userId,
          email: adminEmail,
          phone: adminPhone || null,
          password_hash: hashPassword(password),
          role: "ADMIN_RT",
          status: "PENDING",
          created_at: now
        }
      );

      await conn.query(
        `INSERT INTO user_rt (id, user_id, rt_id, role, status, created_at)
         VALUES (:id, :user_id, :rt_id, :role, :status, :created_at)`,
        {
          id: uuidv4(),
          user_id: userId,
          rt_id: rtId,
          role: "ADMIN_RT",
          status: "PENDING",
          created_at: now
        }
      );
    });

    return res.status(201).json({ rtId, userId, status: "PENDING_APPROVAL" });
  } catch (err) {
    return next(err);
  }
});

/**
 * @openapi
 * /auth/register-warga:
 *   post:
 *     summary: Registrasi warga baru (menunggu approval Admin RT)
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - inviteCode
 *               - fullName
 *               - email
 *               - password
 *             properties:
 *               inviteCode:
 *                 type: string
 *               fullName:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               recaptchaToken:
 *                 type: string
 *     responses:
 *       201:
 *         description: Registrasi warga berhasil
 */
router.post("/register-warga", async (req, res, next) => {
  try {
    await verifyRecaptcha(req.body.recaptchaToken);
    const payload = {
      ...req.body,
      passwordHash: hashPassword(req.body.password || "")
    };
    const result = await registerResident(payload);
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
});

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Login dan mendapatkan access/refresh token
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               recaptchaToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token berhasil dibuat
 *       401:
 *         description: Kredensial tidak valid
 */
router.post("/login", loginRateLimiter, async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Kredensial belum lengkap" });
  }
  try {
    await verifyRecaptcha(req.body.recaptchaToken);
    const [rows] = await db.query(
      "SELECT * FROM users WHERE email = :email LIMIT 1",
      { email }
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: "Kredensial tidak valid" });
    }
    const user = rows[0];
    if (!verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: "Kredensial tidak valid" });
    }
    if (user.status !== "ACTIVE") {
      return res.status(403).json({ error: "User belum aktif" });
    }
    let rtId = null;
    if (user.role !== "SUPER_ADMIN") {
      const [memberships] = await db.query(
        `SELECT rt_id FROM user_rt
         WHERE user_id = :user_id AND status = 'ACTIVE'
         LIMIT 1`,
        { user_id: user.id }
      );
      if (memberships.length === 0) {
        return res.status(403).json({ error: "Tidak ada membership aktif" });
      }
      rtId = memberships[0].rt_id;
    }
    const accessToken = signAccessToken({
      userId: user.id,
      role: user.role,
      rtId
    });
    const refreshToken = uuidv4();
    await db.query(
      `INSERT INTO refresh_token (id, user_id, expires_at, created_at)
       VALUES (:id, :user_id, :expires_at, :created_at)`,
      {
        id: refreshToken,
        user_id: user.id,
        expires_at: refreshExpiry(),
        created_at: new Date()
      }
    );
    return res.json({ accessToken, refreshToken });
  } catch (err) {
    return next(err);
  }
});

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Access token baru berhasil dibuat
 */
router.post("/refresh", async (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token wajib" });
  }
  try {
    const [tokens] = await db.query(
      "SELECT * FROM refresh_token WHERE id = :id LIMIT 1",
      { id: refreshToken }
    );
    if (tokens.length === 0) {
      return res.status(401).json({ error: "Refresh token tidak valid" });
    }
    const token = tokens[0];
    if (new Date(token.expires_at) < new Date()) {
      return res.status(401).json({ error: "Refresh token kadaluarsa" });
    }
    const [users] = await db.query(
      "SELECT * FROM users WHERE id = :id LIMIT 1",
      { id: token.user_id }
    );
    if (users.length === 0) {
      return res.status(401).json({ error: "Refresh token tidak valid" });
    }
    const user = users[0];
    let rtId = null;
    if (user.role !== "SUPER_ADMIN") {
      const [memberships] = await db.query(
        `SELECT rt_id FROM user_rt
         WHERE user_id = :user_id AND status = 'ACTIVE'
         LIMIT 1`,
        { user_id: user.id }
      );
      if (memberships.length === 0) {
        return res.status(403).json({ error: "Tidak ada membership aktif" });
      }
      rtId = memberships[0].rt_id;
    }
    const accessToken = signAccessToken({
      userId: user.id,
      role: user.role,
      rtId
    });
    return res.json({ accessToken });
  } catch (err) {
    return next(err);
  }
});

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Logout dan invalidasi refresh token
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logout berhasil
 */
router.post("/logout", async (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token wajib" });
  }
  try {
    await db.query("DELETE FROM refresh_token WHERE id = :id", {
      id: refreshToken
    });
    return res.json({ status: "ok" });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
