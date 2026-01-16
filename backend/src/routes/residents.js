const express = require("express");
const { requireRole, requireRtAccess } = require("../middleware");
const {
  listResidents,
  getResidentDetail
} = require("../services/residentService");

const router = express.Router();

router.use(requireRole(["ADMIN_RT", "SEKRETARIS"]));
router.use(requireRtAccess);

/**
 * @openapi
 * /residents:
 *   get:
 *     summary: Daftar warga (filter status)
 *     tags:
 *       - Residents
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
router.get("/", async (req, res, next) => {
  try {
    const residents = await listResidents(req.auth.rtId, req.query.status);
    res.json(residents);
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /residents/{id}:
 *   get:
 *     summary: Detail warga + keluarga + dokumen
 *     tags:
 *       - Residents
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
 *         description: Detail warga
 */
router.get("/:id", async (req, res, next) => {
  try {
    const data = await getResidentDetail(req.auth.rtId, req.params.id);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
