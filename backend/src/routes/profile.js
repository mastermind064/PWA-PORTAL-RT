const express = require("express");
const { requireRole, requireRtAccess } = require("../middleware");
const multer = require("multer");
const { uploadResidentDocument } = require("../services/localStorageService");
const {
  getResidentByUser,
  getResidentProfileByUser,
  updateResidentProfile,
  saveResidentDocument
} = require("../services/residentService");
const { uploadRateLimiter } = require("../middleware/rateLimit");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: (parseInt(process.env.UPLOAD_MAX_MB || "5", 10) || 5) * 1024 * 1024
  }
});

router.use(requireRole(["WARGA"]));
router.use(requireRtAccess);

/**
 * @openapi
 * /me/profile:
 *   get:
 *     summary: Ambil profil warga login (KK, keluarga, dokumen)
 *     tags:
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil warga
 */
router.get("/profile", async (req, res, next) => {
  try {
    const data = await getResidentProfileByUser(
      req.auth.rtId,
      req.auth.userId
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /me/profile:
 *   put:
 *     summary: Lengkapi profil warga (KK, keluarga, dokumen)
 *     tags:
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - familyCard
 *               - familyMembers
 *             properties:
 *               familyCard:
 *                 type: object
 *                 properties:
 *                   kkNumber:
 *                     type: string
 *                   address:
 *                     type: string
 *                   notes:
 *                     type: string
 *               familyMembers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     fullName:
 *                       type: string
 *                     relationship:
 *                       type: string
 *                     birthDate:
 *                       type: string
 *                     isLivingHere:
 *                       type: boolean
 *     responses:
 *       200:
 *         description: Profil warga diperbarui
 */
router.put("/profile", async (req, res, next) => {
  try {
    const result = await updateResidentProfile(
      req.auth.rtId,
      req.auth.userId,
      req.body
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /me/documents:
 *   post:
 *     summary: Upload dokumen warga (KTP/KK)
 *     tags:
 *       - Profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - file
 *             properties:
 *               type:
 *                 type: string
 *                 example: KTP
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Dokumen tersimpan
 */
router.post(
  "/documents",
  uploadRateLimiter,
  upload.single("file"),
  async (req, res, next) => {
    try {
      const type = (req.body.type || "").toUpperCase();
      if (!["KTP", "KK"].includes(type)) {
        return res.status(400).json({ error: "Tipe dokumen tidak valid" });
      }
      const resident = await getResidentByUser(req.auth.rtId, req.auth.userId);
      const uploadResult = await uploadResidentDocument({
        rtId: req.auth.rtId,
        residentId: resident.id,
        type,
        file: req.file
      });
      const result = await saveResidentDocument(
        req.auth.rtId,
        resident.id,
        type,
        uploadResult.storagePath,
        uploadResult.originalName,
        uploadResult.mimeType,
        uploadResult.size
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
