const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { requireRole, requireRtAccess } = require("../middleware");
const {
  uploadFeePaymentProof,
  resolveStoragePath
} = require("../services/localStorageService");
const {
  listCampaigns,
  createCampaign,
  updateCampaign,
  setCampaignStatus,
  generateBillings,
  listBillingsAdmin,
  listBillingsForResident,
  submitPayment,
  listPaymentSubmissions,
  listPaymentSubmissionsForResident,
  approvePayment,
  rejectPayment
} = require("../services/feeService");
const db = require("../db");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: (parseInt(process.env.UPLOAD_MAX_MB || "5", 10) || 5) * 1024 * 1024
  }
});

router.use(requireRtAccess);

router.get(
  "/campaigns",
  requireRole(["ADMIN_RT", "BENDAHARA"]),
  async (req, res, next) => {
    try {
      const data = await listCampaigns(req.auth.rtId);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/campaigns",
  requireRole(["ADMIN_RT", "BENDAHARA"]),
  async (req, res, next) => {
    try {
      const result = await createCampaign(req.auth.rtId, req.body, req.auth.userId);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

router.put(
  "/campaigns/:id",
  requireRole(["ADMIN_RT", "BENDAHARA"]),
  async (req, res, next) => {
    try {
      const result = await updateCampaign(
        req.auth.rtId,
        req.params.id,
        req.body,
        req.auth.userId
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/campaigns/:id/activate",
  requireRole(["ADMIN_RT", "BENDAHARA"]),
  async (req, res, next) => {
    try {
      const result = await setCampaignStatus(
        req.auth.rtId,
        req.params.id,
        "ACTIVE",
        req.auth.userId
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/campaigns/:id/close",
  requireRole(["ADMIN_RT", "BENDAHARA"]),
  async (req, res, next) => {
    try {
      const result = await setCampaignStatus(
        req.auth.rtId,
        req.params.id,
        "CLOSED",
        req.auth.userId
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/campaigns/:id/billings",
  requireRole(["ADMIN_RT", "BENDAHARA"]),
  async (req, res, next) => {
    try {
      const result = await generateBillings(
        req.auth.rtId,
        req.params.id,
        req.body.period
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/billings",
  requireRole(["ADMIN_RT", "BENDAHARA"]),
  async (req, res, next) => {
    try {
      const data = await listBillingsAdmin(req.auth.rtId, req.query.status);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

router.get("/billings/me", requireRole(["WARGA"]), async (req, res, next) => {
  try {
    const [residentRows] = await db.query(
      "SELECT id FROM resident WHERE user_id = :user_id AND rt_id = :rt_id LIMIT 1",
      { user_id: req.auth.userId, rt_id: req.auth.rtId }
    );
    if (residentRows.length === 0) {
      return res.status(404).json({ error: "Profil warga tidak ditemukan" });
    }
    const data = await listBillingsForResident(
      req.auth.rtId,
      residentRows[0].id,
      req.query.status
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get("/payments/me", requireRole(["WARGA"]), async (req, res, next) => {
  try {
    const [residentRows] = await db.query(
      "SELECT id FROM resident WHERE user_id = :user_id AND rt_id = :rt_id LIMIT 1",
      { user_id: req.auth.userId, rt_id: req.auth.rtId }
    );
    if (residentRows.length === 0) {
      return res.status(404).json({ error: "Profil warga tidak ditemukan" });
    }
    const data = await listPaymentSubmissionsForResident(
      req.auth.rtId,
      residentRows[0].id,
      req.query.status,
      req.query.page,
      req.query.limit
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.post(
  "/billings/:id/payments",
  requireRole(["WARGA"]),
  upload.single("file"),
  async (req, res, next) => {
    try {
      const [residentRows] = await db.query(
        "SELECT id FROM resident WHERE user_id = :user_id AND rt_id = :rt_id LIMIT 1",
        { user_id: req.auth.userId, rt_id: req.auth.rtId }
      );
      if (residentRows.length === 0) {
        return res.status(404).json({ error: "Profil warga tidak ditemukan" });
      }
      const proof = await uploadFeePaymentProof({
        rtId: req.auth.rtId,
        residentId: residentRows[0].id,
        file: req.file
      });
      const amount = req.body.amount ? Number(req.body.amount) : null;
      const result = await submitPayment(
        req.auth.rtId,
        req.params.id,
        residentRows[0].id,
        proof,
        amount
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/payments",
  requireRole(["ADMIN_RT", "BENDAHARA"]),
  async (req, res, next) => {
    try {
      const data = await listPaymentSubmissions(req.auth.rtId, req.query.status);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

router.get("/payments/:id/proof", async (req, res, next) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, r.user_id
       FROM fee_payment_submission p
       JOIN resident r ON r.id = p.resident_id
       WHERE p.id = :id AND p.rt_id = :rt_id
       LIMIT 1`,
      { id: req.params.id, rt_id: req.auth.rtId }
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Bukti pembayaran tidak ditemukan" });
    }
    const payment = rows[0];
    const isAdmin = ["ADMIN_RT", "BENDAHARA"].includes(req.auth.role);
    const isOwner = req.auth.role === "WARGA" && payment.user_id === req.auth.userId;
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const filePath = resolveStoragePath(payment.proof_url);
    const ext = path.extname(filePath || "").toLowerCase();
    const contentTypes = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".pdf": "application/pdf"
    };
    const contentType = contentTypes[ext] || "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename=\"${path.basename(filePath)}\"`
    );
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    next(err);
  }
});

router.post(
  "/payments/:id/approve",
  requireRole(["ADMIN_RT", "BENDAHARA"]),
  async (req, res, next) => {
    try {
      const result = await approvePayment(
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

router.post(
  "/payments/:id/reject",
  requireRole(["ADMIN_RT", "BENDAHARA"]),
  async (req, res, next) => {
    try {
      const result = await rejectPayment(
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
