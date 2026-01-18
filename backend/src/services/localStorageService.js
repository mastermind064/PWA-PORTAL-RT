const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const allowedMime = ["image/jpeg", "image/png", "application/pdf"];

const storageBase =
  process.env.LOCAL_STORAGE_PATH ||
  path.join(__dirname, "..", "..", "storage");

const ensureDir = (dirPath) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

const sanitizeName = (filename) => {
  const base = path.basename(filename || "file");
  return base.replace(/[^a-zA-Z0-9._-]/g, "-");
};

const buildRelativePath = (rtId, residentId, type, filename) => {
  const token = crypto.randomBytes(6).toString("hex");
  const safeName = sanitizeName(filename);
  return path.join(
    "rt",
    rtId,
    "resident",
    residentId,
    `${type}-${Date.now()}-${token}-${safeName}`
  );
};

const uploadResidentDocument = async ({ rtId, residentId, type, file }) => {
  if (!file) {
    const error = new Error("File wajib diupload");
    error.status = 400;
    throw error;
  }
  if (!allowedMime.includes(file.mimetype)) {
    const error = new Error("Tipe file tidak didukung");
    error.status = 400;
    throw error;
  }

  const relativePath = buildRelativePath(
    rtId,
    residentId,
    type,
    file.originalname
  );
  const absolutePath = path.join(storageBase, relativePath);
  ensureDir(path.dirname(absolutePath));
  fs.writeFileSync(absolutePath, file.buffer);

  return {
    storagePath: relativePath,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size
  };
};

const resolveStoragePath = (relativePath) => {
  const resolved = path.resolve(storageBase, relativePath);
  const baseResolved = path.resolve(storageBase);
  if (!resolved.startsWith(baseResolved)) {
    const error = new Error("Path tidak valid");
    error.status = 400;
    throw error;
  }
  return resolved;
};

const uploadTopupProof = async ({ rtId, residentId, file }) => {
  if (!file) {
    const error = new Error("File wajib diupload");
    error.status = 400;
    throw error;
  }
  if (!allowedMime.includes(file.mimetype)) {
    const error = new Error("Tipe file tidak didukung");
    error.status = 400;
    throw error;
  }

  const relativePath = buildRelativePath(
    rtId,
    residentId,
    "TOPUP",
    file.originalname
  );
  const absolutePath = path.join(storageBase, relativePath);
  ensureDir(path.dirname(absolutePath));
  fs.writeFileSync(absolutePath, file.buffer);

  return {
    storagePath: relativePath,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size
  };
};

module.exports = {
  uploadResidentDocument,
  uploadTopupProof,
  resolveStoragePath,
  storageBase
};
