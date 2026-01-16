const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../db");
const { requireRole, requireRtAccess } = require("../middleware");
const {
  listResidents,
  approveResident,
  rejectResident
} = require("../services/residentService");

const router = express.Router();

router.use(requireRole(["ADMIN_RT", "BENDAHARA", "SEKRETARIS", "WARGA"]));
router.use(requireRtAccess);

/**
 * @openapi
 * /rt/me:
 *   get:
 *     summary: Profil RT milik user yang login
 *     tags:
 *       - RT
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil RT
 */
router.get("/me", async (req, res, next) => {
  try {
    const [rows] = await db.query("SELECT * FROM rt WHERE id = :id", {
      id: req.auth.rtId
    });
    if (rows.length === 0) {
      return res.status(404).json({ error: "RT tidak ditemukan" });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /rt/me:
 *   put:
 *     summary: Update profil RT (khusus Admin RT)
 *     tags:
 *       - RT
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               rw:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profil RT diperbarui
 */
router.put("/me", async (req, res, next) => {
  try {
    if (req.auth.role !== "ADMIN_RT") {
      return res.status(403).json({ error: "Akses ditolak" });
    }
    const { name, rw, address } = req.body;
    await db.query(
      `UPDATE rt
       SET name = COALESCE(:name, name),
           rw = COALESCE(:rw, rw),
           address = COALESCE(:address, address),
           updated_at = :updated_at
       WHERE id = :id`,
      {
        id: req.auth.rtId,
        name: name || null,
        rw: rw || null,
        address: address || null,
        updated_at: new Date()
      }
    );
    const [rows] = await db.query("SELECT * FROM rt WHERE id = :id", {
      id: req.auth.rtId
    });
    if (rows.length === 0) {
      return res.status(404).json({ error: "RT tidak ditemukan" });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /rt/invite-code:
 *   post:
 *     summary: Generate invite code RT (khusus Admin RT)
 *     tags:
 *       - RT
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Invite code dibuat
 */
router.post("/invite-code", async (req, res, next) => {
  try {
    if (req.auth.role !== "ADMIN_RT") {
      return res.status(403).json({ error: "Akses ditolak" });
    }
    const inviteCode = uuidv4().slice(0, 8).toUpperCase();
    await db.query(
      "UPDATE rt SET invite_code = :invite_code, updated_at = :updated_at WHERE id = :id",
      {
        id: req.auth.rtId,
        invite_code: inviteCode,
        updated_at: new Date()
      }
    );
    res.json({ inviteCode });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /rt/members:
 *   get:
 *     summary: Daftar warga berdasarkan status
 *     tags:
 *       - RT
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Daftar warga
 */
router.get("/members", async (req, res, next) => {
  if (!["ADMIN_RT", "SEKRETARIS"].includes(req.auth.role)) {
    return res.status(403).json({ error: "Akses ditolak" });
  }
  try {
    const residents = await listResidents(req.auth.rtId, req.query.status);
    res.json(residents);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /rt/members/{id}/approve:
 *   post:
 *     summary: Approve pendaftaran warga
 *     tags:
 *       - RT
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Warga disetujui
 */
router.post("/members/:id/approve", async (req, res, next) => {
  if (!["ADMIN_RT", "SEKRETARIS"].includes(req.auth.role)) {
    return res.status(403).json({ error: "Akses ditolak" });
  }
  try {
    const result = await approveResident(
      req.auth.rtId,
      req.params.id,
      req.auth.userId
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /rt/members/{id}/reject:
 *   post:
 *     summary: Reject pendaftaran warga
 *     tags:
 *       - RT
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Warga ditolak
 */
router.post("/members/:id/reject", async (req, res, next) => {
  if (!["ADMIN_RT", "SEKRETARIS"].includes(req.auth.role)) {
    return res.status(403).json({ error: "Akses ditolak" });
  }
  try {
    const result = await rejectResident(
      req.auth.rtId,
      req.params.id,
      req.auth.userId,
      req.body.reason
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
