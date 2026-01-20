const express = require("express");
const { requireRole, requireRtAccess } = require("../middleware");
const {
  getKasConfig,
  upsertKasConfig,
  listBillingReminders,
  retryKasDebit,
  getKasDashboard,
  listKasCharges
} = require("../services/kasRtService");

const router = express.Router();

router.use(requireRtAccess);

/**
 * @openapi
 * /kas-rt/config:
 *   get:
 *     summary: Ambil konfigurasi kas RT
 *     tags:
 *       - KasRT
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Konfigurasi kas RT
 */
router.get("/config", requireRole(["ADMIN_RT", "BENDAHARA"]), async (req, res, next) => {
  try {
    const data = await getKasConfig(req.auth.rtId);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /kas-rt/config:
 *   put:
 *     summary: Update konfigurasi kas RT
 *     tags:
 *       - KasRT
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *               - monthlyAmount
 *               - debitDayOfMonth
 *             properties:
 *               isActive:
 *                 type: boolean
 *               monthlyAmount:
 *                 type: number
 *               debitDayOfMonth:
 *                 type: number
 *     responses:
 *       200:
 *         description: Konfigurasi tersimpan
 */
router.put(
  "/config",
  requireRole(["ADMIN_RT", "BENDAHARA"]),
  async (req, res, next) => {
    try {
      const result = await upsertKasConfig(
        req.auth.rtId,
        req.body,
        req.auth.userId
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @openapi
 * /kas-rt/reminders:
 *   get:
 *     summary: Daftar billing reminder kas RT (saldo kurang)
 *     tags:
 *       - KasRT
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           example: 2026-01
 *     responses:
 *       200:
 *         description: Daftar reminder
 */
router.get(
  "/reminders",
  requireRole(["ADMIN_RT", "BENDAHARA"]),
  async (req, res, next) => {
    try {
      const data = await listBillingReminders(req.auth.rtId, req.query.period);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @openapi
 * /kas-rt/reminders/{id}/retry:
 *   post:
 *     summary: Retry debit kas RT untuk tagihan UNPAID
 *     tags:
 *       - KasRT
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
 *         description: Tagihan berhasil didebit ulang
 */
router.post(
  "/reminders/:id/retry",
  requireRole(["ADMIN_RT", "BENDAHARA"]),
  async (req, res, next) => {
    try {
      const result = await retryKasDebit(
        req.auth.rtId,
        req.params.id,
        req.auth.userId
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @openapi
 * /kas-rt/dashboard:
 *   get:
 *     summary: Ringkasan dashboard kas RT
 *     tags:
 *       - KasRT
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Ringkasan kas RT
 */
router.get(
  "/dashboard",
  requireRole(["ADMIN_RT", "BENDAHARA"]),
  async (req, res, next) => {
    try {
      const data = await getKasDashboard(req.auth.rtId);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @openapi
 * /kas-rt/charges:
 *   get:
 *     summary: Riwayat auto-debit kas RT
 *     tags:
 *       - KasRT
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Riwayat auto-debit
 */
router.get(
  "/charges",
  requireRole(["ADMIN_RT", "BENDAHARA"]),
  async (req, res, next) => {
    try {
      const data = await listKasCharges(
        req.auth.rtId,
        req.query.period,
        req.query.page,
        req.query.limit
      );
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/charges/export",
  requireRole(["ADMIN_RT", "BENDAHARA"]),
  async (req, res, next) => {
    try {
      const data = await listKasCharges(req.auth.rtId, req.query.period, 1, 1000);
      const header = "period,full_name,amount,status,created_at";
      const lines = data.items.map(
        (row) =>
          `${row.period},${row.fullName},${row.amount},${row.status},${row.createdAt.toISOString?.() || row.createdAt}`
      );
      const csv = [header, ...lines].join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=\"kas-rt-report.csv\""
      );
      res.send(csv);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
