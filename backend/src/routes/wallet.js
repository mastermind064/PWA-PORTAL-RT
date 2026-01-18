const express = require("express");
const multer = require("multer");
const { requireRole, requireRtAccess } = require("../middleware");
const { uploadTopupProof } = require("../services/localStorageService");
const {
  getOrCreateWallet,
  listWalletTransactions,
  createTopupRequest,
  listTopupRequests,
  approveTopupRequest,
  rejectTopupRequest
} = require("../services/walletService");
const db = require("../db");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: (parseInt(process.env.UPLOAD_MAX_MB || "5", 10) || 5) * 1024 * 1024
  }
});

router.use(requireRtAccess);

/**
 * @openapi
 * /wallet/me:
 *   get:
 *     summary: Informasi wallet warga
 *     tags:
 *       - Wallet
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wallet warga
 */
router.get("/me", requireRole(["WARGA"]), async (req, res, next) => {
  try {
    const [residentRows] = await db.query(
      "SELECT id FROM resident WHERE user_id = :user_id AND rt_id = :rt_id LIMIT 1",
      { user_id: req.auth.userId, rt_id: req.auth.rtId }
    );
    if (residentRows.length === 0) {
      return res.status(404).json({ error: "Profil warga tidak ditemukan" });
    }
    const wallet = await getOrCreateWallet(req.auth.rtId, residentRows[0].id);
    res.json(wallet);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /wallet/transactions:
 *   get:
 *     summary: Riwayat transaksi wallet
 *     tags:
 *       - Wallet
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Daftar transaksi
 */
router.get("/transactions", requireRole(["WARGA"]), async (req, res, next) => {
  try {
    const [residentRows] = await db.query(
      "SELECT id FROM resident WHERE user_id = :user_id AND rt_id = :rt_id LIMIT 1",
      { user_id: req.auth.userId, rt_id: req.auth.rtId }
    );
    if (residentRows.length === 0) {
      return res.status(404).json({ error: "Profil warga tidak ditemukan" });
    }
    const wallet = await getOrCreateWallet(req.auth.rtId, residentRows[0].id);
    const transactions = await listWalletTransactions(req.auth.rtId, wallet.id);
    res.json(transactions);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /wallet/topups:
 *   get:
 *     summary: Daftar topup (admin/bendahara)
 *     tags:
 *       - Wallet
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Daftar topup
 */
router.get(
  "/topups",
  requireRole(["ADMIN_RT", "BENDAHARA"]),
  async (req, res, next) => {
    try {
      const data = await listTopupRequests(req.auth.rtId, req.query.status);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @openapi
 * /wallet/topup:
 *   post:
 *     summary: Ajukan topup deposit
 *     tags:
 *       - Wallet
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - file
 *             properties:
 *               amount:
 *                 type: number
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Topup diajukan
 */
router.post(
  "/topup",
  requireRole(["WARGA"]),
  upload.single("file"),
  async (req, res, next) => {
    try {
      const amount = parseFloat(req.body.amount || "0");
      const [residentRows] = await db.query(
        "SELECT id FROM resident WHERE user_id = :user_id AND rt_id = :rt_id LIMIT 1",
        { user_id: req.auth.userId, rt_id: req.auth.rtId }
      );
      if (residentRows.length === 0) {
        return res.status(404).json({ error: "Profil warga tidak ditemukan" });
      }
      const proof = await uploadTopupProof({
        rtId: req.auth.rtId,
        residentId: residentRows[0].id,
        file: req.file
      });
      const result = await createTopupRequest({
        rtId: req.auth.rtId,
        residentId: residentRows[0].id,
        amount,
        proof
      });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @openapi
 * /wallet/topup/{id}/approve:
 *   post:
 *     summary: Approve topup
 *     tags:
 *       - Wallet
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
 *         description: Topup disetujui
 */
router.post(
  "/topup/:id/approve",
  requireRole(["ADMIN_RT", "BENDAHARA"]),
  async (req, res, next) => {
    try {
      const result = await approveTopupRequest(
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
 * /wallet/topup/{id}/reject:
 *   post:
 *     summary: Reject topup
 *     tags:
 *       - Wallet
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
 *         description: Topup ditolak
 */
router.post(
  "/topup/:id/reject",
  requireRole(["ADMIN_RT", "BENDAHARA"]),
  async (req, res, next) => {
    try {
      const result = await rejectTopupRequest(
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
