const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("../db");
const { requireRole } = require("../middleware");
const {
  initWhatsApp,
  getWaStatus,
  resetSession,
  normalizePhone
} = require("../services/whatsappService");

const router = express.Router();

router.use(requireRole(["SUPER_ADMIN"]));

/**
 * @openapi
 * /super-admin/dashboard:
 *   get:
 *     summary: Statistik ringkas super admin
 *     tags:
 *       - SuperAdmin
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistik total RT, warga, topup
 */
router.get("/dashboard", async (req, res, next) => {
  try {
    const [[rtTotals]] = await db.query(
      `SELECT
         COUNT(*) AS total_rt,
         SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) AS active_rt,
         SUM(CASE WHEN status = 'PENDING_APPROVAL' THEN 1 ELSE 0 END) AS pending_rt
       FROM rt`
    );
    const [[residentTotals]] = await db.query(
      "SELECT COUNT(*) AS total_warga FROM resident"
    );
    const [[topupTotals]] = await db.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_topup
       FROM wallet_topup_request
       WHERE status = 'APPROVED'
         AND YEAR(created_at) = YEAR(CURDATE())
         AND MONTH(created_at) = MONTH(CURDATE())`
    );
    res.json({
      totalRt: Number(rtTotals.total_rt || 0),
      activeRt: Number(rtTotals.active_rt || 0),
      pendingRt: Number(rtTotals.pending_rt || 0),
      totalWarga: Number(residentTotals.total_warga || 0),
      totalTopupMonth: Number(topupTotals.total_topup || 0)
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /super-admin/wa/status:
 *   get:
 *     summary: Status koneksi WhatsApp
 *     tags:
 *       - SuperAdmin
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status WA
 */
router.get("/wa/status", async (req, res, next) => {
  try {
    const status = await getWaStatus();
    res.json(status);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /super-admin/wa/register:
 *   post:
 *     summary: Mulai registrasi WA (QR)
 *     tags:
 *       - SuperAdmin
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status WA dan QR
 */
router.post("/wa/register", async (req, res, next) => {
  try {
    await initWhatsApp();
    const status = await getWaStatus();
    res.json(status);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /super-admin/wa/reset:
 *   post:
 *     summary: Reset sesi WhatsApp (logout paksa)
 *     tags:
 *       - SuperAdmin
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sesi direset
 */
router.post("/wa/reset", async (req, res, next) => {
  try {
    await resetSession();
    await initWhatsApp();
    const status = await getWaStatus();
    res.json(status);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /super-admin/wa/history:
 *   get:
 *     summary: Riwayat pengiriman WA
 *     tags:
 *       - SuperAdmin
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Riwayat notifikasi WA
 */
router.get("/wa/history", async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit || "10", 10) || 10, 1),
      50
    );
    const offset = (page - 1) * limit;
    const rawPhone = req.query.phone ? String(req.query.phone).trim() : "";
    const phone = rawPhone ? normalizePhone(rawPhone) : "";

    const whereParts = ["o.channel = 'WHATSAPP'"];
    const params = {};
    if (phone) {
      whereParts.push("o.to_phone LIKE :phone");
      params.phone = `%${phone}%`;
    }
    const whereClause = whereParts.length
      ? `WHERE ${whereParts.join(" AND ")}`
      : "";
    const wherePhoneOnly = phone ? "AND o.to_phone LIKE :phone" : "";

    const [[countRow]] = await db.query(
      `SELECT
         (SELECT COUNT(*)
          FROM notification_log l
          JOIN notification_outbox o ON o.id = l.outbox_id
          WHERE o.channel = 'WHATSAPP' ${wherePhoneOnly})
         +
         (SELECT COUNT(*)
          FROM notification_outbox o
          WHERE o.channel = 'WHATSAPP'
            AND o.status = 'PENDING'
            AND NOT EXISTS (
              SELECT 1 FROM notification_log l2 WHERE l2.outbox_id = o.id
            )
            ${wherePhoneOnly}
         ) AS total`,
      params
    );

    const [rows] = await db.query(
      `SELECT *
       FROM (
         SELECT
           COALESCE(l.id, o.id) AS id,
           o.id AS outbox_id,
           o.to_phone,
           o.template_key,
           o.status,
           o.payload,
           o.created_at,
           l.sent_at,
           l.status AS log_status,
           l.response_text
         FROM notification_log l
         JOIN notification_outbox o ON o.id = l.outbox_id
         ${whereClause}
         UNION ALL
         SELECT
           o.id AS id,
           o.id AS outbox_id,
           o.to_phone,
           o.template_key,
           o.status,
           o.payload,
           o.created_at,
           NULL AS sent_at,
           NULL AS log_status,
           NULL AS response_text
         FROM notification_outbox o
         WHERE o.channel = 'WHATSAPP'
           AND o.status = 'PENDING'
           AND NOT EXISTS (
             SELECT 1 FROM notification_log l2 WHERE l2.outbox_id = o.id
           )
           ${wherePhoneOnly}
       ) AS history
       ORDER BY history.sent_at DESC, history.created_at DESC
       LIMIT :limit OFFSET :offset`,
      { ...params, limit, offset }
    );
    res.json({
      items: rows,
      total: Number(countRow?.total || 0),
      page,
      limit
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /super-admin/wa/history/{id}/retry:
 *   post:
 *     summary: Kirim ulang notifikasi WA yang gagal
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
 *         description: Notifikasi dijadwalkan ulang
 */
router.post("/wa/history/:id/retry", async (req, res, next) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM notification_outbox WHERE id = :id LIMIT 1",
      { id: req.params.id }
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Notifikasi tidak ditemukan" });
    }
    const outbox = rows[0];
    if (outbox.status !== "FAILED") {
      return res
        .status(409)
        .json({ error: "Hanya notifikasi FAILED yang bisa dikirim ulang" });
    }
    await db.transaction(async (conn) => {
      await conn.query(
        `UPDATE notification_outbox
         SET status = 'PENDING', updated_at = :updated_at
         WHERE id = :id`,
        { id: outbox.id, updated_at: new Date() }
      );
      await conn.query(
        `INSERT INTO notification_log
         (id, outbox_id, sent_at, status, response_text, created_at)
         VALUES (:id, :outbox_id, :sent_at, :status, :response_text, :created_at)`,
        {
          id: uuidv4(),
          outbox_id: outbox.id,
          sent_at: new Date(),
          status: "RETRY",
          response_text: "Retry manual oleh super admin",
          created_at: new Date()
        }
      );
    });
    res.json({ status: "PENDING" });
  } catch (err) {
    next(err);
  }
});

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
    const baseQuery = `
      SELECT
        rt.*,
        admin.email AS admin_email,
        admin.phone AS admin_phone
      FROM rt
      LEFT JOIN user_rt ur
        ON ur.rt_id = rt.id AND ur.role = 'ADMIN_RT'
      LEFT JOIN users admin
        ON admin.id = ur.user_id
    `;
    const [rows] = status
      ? await db.query(`${baseQuery} WHERE rt.status = :status`, { status })
      : await db.query(baseQuery);
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
