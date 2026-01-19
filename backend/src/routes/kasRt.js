const express = require("express");
const { requireRole, requireRtAccess } = require("../middleware");
const {
  getKasConfig,
  upsertKasConfig,
  listBillingReminders,
  retryKasDebit
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

module.exports = router;
