const express = require("express");
const fs = require("fs");
const path = require("path");
const db = require("../db");
const { resolveStoragePath } = require("../services/localStorageService");

const router = express.Router();

/**
 * @openapi
 * /documents/{id}:
 *   get:
 *     summary: Download dokumen warga (akses terkontrol)
 *     tags:
 *       - Documents
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
 *         description: File dokumen
 */
router.get("/:id", async (req, res, next) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM resident_document WHERE id = :id LIMIT 1",
      { id: req.params.id }
    );
    if (rows.length === 0 || rows[0].rt_id !== req.auth.rtId) {
      return res.status(404).json({ error: "Dokumen tidak ditemukan" });
    }
    const doc = rows[0];

    const role = req.auth.role;
    if (role === "WARGA") {
      const [resRows] = await db.query(
        "SELECT id FROM resident WHERE user_id = :user_id AND rt_id = :rt_id LIMIT 1",
        { user_id: req.auth.userId, rt_id: req.auth.rtId }
      );
      if (resRows.length === 0 || resRows[0].id !== doc.resident_id) {
        return res.status(403).json({ error: "Akses ditolak" });
      }
    } else if (
      !["ADMIN_RT", "SEKRETARIS", "BENDAHARA", "SUPER_ADMIN"].includes(role)
    ) {
      return res.status(403).json({ error: "Akses ditolak" });
    }

    if (!doc.storage_path) {
      return res.status(404).json({ error: "Dokumen tidak tersedia" });
    }

    const filePath = resolveStoragePath(doc.storage_path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File tidak ditemukan" });
    }

    res.setHeader(
      "Content-Type",
      doc.mime_type || "application/octet-stream"
    );
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${path.basename(doc.original_name || doc.storage_path)}"`
    );

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
