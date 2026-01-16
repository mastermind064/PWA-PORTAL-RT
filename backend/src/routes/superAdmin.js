const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../db");
const { requireRole } = require("../middleware");

const router = express.Router();

router.use(requireRole(["SUPER_ADMIN"]));

/**
 * @openapi
 * /super-admin/rts:
 *   get:
 *     summary: Daftar RT (opsional filter status)
 *     tags:
 *       - SuperAdmin
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Daftar RT
 */
router.get("/rts", async (req, res, next) => {
  try {
    const status = req.query.status;
    const [rows] = status
      ? await db.query("SELECT * FROM rt WHERE status = :status", { status })
      : await db.query("SELECT * FROM rt");
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /super-admin/rts/{id}/approve:
 *   post:
 *     summary: Approve RT
 *     tags:
 *       - SuperAdmin
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: RT disetujui
 */
router.post("/rts/:id/approve", async (req, res, next) => {
  try {
    const [rows] = await db.query("SELECT * FROM rt WHERE id = :id", {
      id: req.params.id
    });
    if (rows.length === 0) {
      return res.status(404).json({ error: "RT tidak ditemukan" });
    }
    const rt = rows[0];
    await db.transaction(async (conn) => {
      await conn.query("UPDATE rt SET status = 'ACTIVE' WHERE id = :id", {
        id: rt.id
      });
      const [memberships] = await conn.query(
        `SELECT * FROM user_rt WHERE rt_id = :rt_id AND role = 'ADMIN_RT' LIMIT 1`,
        { rt_id: rt.id }
      );
      if (memberships.length > 0) {
        const membership = memberships[0];
        await conn.query(
          "UPDATE user_rt SET status = 'ACTIVE' WHERE id = :id",
          { id: membership.id }
        );
        await conn.query(
          "UPDATE users SET status = 'ACTIVE' WHERE id = :id",
          { id: membership.user_id }
        );
      }
      await conn.query(
        `INSERT INTO audit_log (id, rt_id, actor_user_id, action, created_at)
         VALUES (:id, :rt_id, :actor_user_id, :action, :created_at)`,
        {
          id: uuidv4(),
          rt_id: rt.id,
          actor_user_id: req.auth.userId,
          action: "RT_APPROVED",
          created_at: new Date()
        }
      );
    });
    res.json({ status: "APPROVED" });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /super-admin/rts/{id}/reject:
 *   post:
 *     summary: Reject RT
 *     tags:
 *       - SuperAdmin
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: RT ditolak
 */
router.post("/rts/:id/reject", async (req, res, next) => {
  try {
    const [rows] = await db.query("SELECT * FROM rt WHERE id = :id", {
      id: req.params.id
    });
    if (rows.length === 0) {
      return res.status(404).json({ error: "RT tidak ditemukan" });
    }
    const rt = rows[0];
    await db.transaction(async (conn) => {
      await conn.query("UPDATE rt SET status = 'REJECTED' WHERE id = :id", {
        id: rt.id
      });
      const [memberships] = await conn.query(
        `SELECT * FROM user_rt WHERE rt_id = :rt_id AND role = 'ADMIN_RT' LIMIT 1`,
        { rt_id: rt.id }
      );
      if (memberships.length > 0) {
        const membership = memberships[0];
        await conn.query(
          "UPDATE user_rt SET status = 'REJECTED' WHERE id = :id",
          { id: membership.id }
        );
        await conn.query(
          "UPDATE users SET status = 'REJECTED' WHERE id = :id",
          { id: membership.user_id }
        );
      }
      await conn.query(
        `INSERT INTO audit_log (id, rt_id, actor_user_id, action, created_at)
         VALUES (:id, :rt_id, :actor_user_id, :action, :created_at)`,
        {
          id: uuidv4(),
          rt_id: rt.id,
          actor_user_id: req.auth.userId,
          action: "RT_REJECTED",
          created_at: new Date()
        }
      );
    });
    res.json({ status: "REJECTED" });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /super-admin/audit-logs:
 *   get:
 *     summary: Audit log aksi penting
 *     tags:
 *       - SuperAdmin
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Daftar audit log
 */
router.get("/audit-logs", async (req, res, next) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM audit_log ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
