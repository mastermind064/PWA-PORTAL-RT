const express = require("express");
const { requireRole, requireRtAccess } = require("../middleware");
const { getKasConfig, upsertKasConfig } = require("../services/kasRtService");

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

module.exports = router;
