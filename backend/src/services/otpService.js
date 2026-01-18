const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const db = require("../db");
const { normalizePhone, getWaStatus, sendMessage } = require("./whatsappService");
const { enqueueNotification } = require("./notificationService");

const getOtpConfig = () => {
  const ttlMinutes = parseInt(process.env.OTP_TTL_MINUTES || "10", 10);
  const maxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS || "5", 10);
  return {
    ttlMinutes: Number.isNaN(ttlMinutes) ? 10 : ttlMinutes,
    maxAttempts: Number.isNaN(maxAttempts) ? 5 : maxAttempts
  };
};

const generateOtp = () => {
  const code = Math.floor(100000 + Math.random() * 900000);
  return String(code);
};

const requestOtp = async (phone, inviteCode) => {
  const normalized = normalizePhone(phone);
  if (!normalized) {
    const error = new Error("Nomor HP wajib diisi");
    error.status = 400;
    throw error;
  }
  if (!inviteCode) {
    const error = new Error("Kode undangan RT wajib diisi");
    error.status = 400;
    throw error;
  }
  if (normalized.length < 9 || normalized.length > 20) {
    const error = new Error("Nomor HP tidak valid");
    error.status = 400;
    throw error;
  }

  const { ttlMinutes } = getOtpConfig();
  const [rtRows] = await db.query(
    `SELECT id FROM rt WHERE invite_code = :invite_code AND status = 'ACTIVE' LIMIT 1`,
    { invite_code: inviteCode }
  );
  if (rtRows.length === 0) {
    const error = new Error("RT tidak ditemukan atau belum aktif");
    error.status = 404;
    throw error;
  }
  const rtId = rtRows[0].id;
  const code = generateOtp();
  const hash = await bcrypt.hash(code, 8);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

  await db.transaction(async (conn) => {
    await conn.query(
      `UPDATE phone_otp_request
       SET status = 'REVOKED', updated_at = :updated_at
       WHERE phone = :phone AND status = 'PENDING'`,
      { phone: normalized, updated_at: now }
    );
    await conn.query(
      `INSERT INTO phone_otp_request
       (id, phone, code_hash, status, attempts, expires_at, created_at, updated_at)
       VALUES (:id, :phone, :code_hash, :status, :attempts, :expires_at, :created_at, :updated_at)`,
      {
        id: uuidv4(),
        phone: normalized,
        code_hash: hash,
        status: "PENDING",
        attempts: 0,
        expires_at: expiresAt,
        created_at: now,
        updated_at: now
      }
    );
  });

  const outboxId = await enqueueNotification({
    rtId,
    toPhone: normalized,
    templateKey: "PhoneOtpCode",
    payload: { code, ttlMinutes }
  });

  try {
    const waStatus = await getWaStatus();
    if (waStatus.state === "READY") {
      const message = `Kode OTP Portal RT: ${code}. Berlaku ${ttlMinutes} menit.`;
      await db.query(
        `UPDATE notification_outbox
         SET status = 'SENDING', updated_at = :updated_at
         WHERE id = :id`,
        { id: outboxId, updated_at: new Date() }
      );
      await sendMessage(normalized, message);
      await db.transaction(async (conn) => {
        await conn.query(
          `UPDATE notification_outbox
           SET status = 'SENT', updated_at = :updated_at
           WHERE id = :id`,
          { id: outboxId, updated_at: new Date() }
        );
        await conn.query(
          `INSERT INTO notification_log
           (id, outbox_id, sent_at, status, response_text, created_at)
           VALUES (:id, :outbox_id, :sent_at, :status, :response_text, :created_at)`,
          {
            id: uuidv4(),
            outbox_id: outboxId,
            sent_at: new Date(),
            status: "SENT",
            response_text: "OTP sent directly",
            created_at: new Date()
          }
        );
      });
      console.log(`OTP WA sent immediately to ${normalized}`);
    } else {
      console.log(
        `WA not ready (${waStatus.state}), OTP queued for ${normalized}`
      );
    }
  } catch (err) {
    console.error(`OTP WA send failed for ${normalized}:`, err.message);
  }

  return {
    phone: normalized,
    expiresAt,
    code: process.env.OTP_DEV_ECHO === "1" ? code : undefined
  };
};

const verifyOtp = async (phone, code) => {
  const normalized = normalizePhone(phone);
  if (!normalized) {
    const error = new Error("Nomor HP wajib diisi");
    error.status = 400;
    throw error;
  }
  if (!code) {
    const error = new Error("OTP wajib diisi");
    error.status = 400;
    throw error;
  }
  const { maxAttempts } = getOtpConfig();

  const [rows] = await db.query(
    `SELECT * FROM phone_otp_request
     WHERE phone = :phone AND status = 'PENDING'
     ORDER BY created_at DESC
     LIMIT 1`,
    { phone: normalized }
  );
  if (rows.length === 0) {
    const error = new Error("OTP tidak ditemukan atau sudah kadaluarsa");
    error.status = 404;
    throw error;
  }

  const record = rows[0];
  if (new Date(record.expires_at) < new Date()) {
    await db.query(
      `UPDATE phone_otp_request
       SET status = 'EXPIRED', updated_at = :updated_at
       WHERE id = :id`,
      { id: record.id, updated_at: new Date() }
    );
    const error = new Error("OTP sudah kadaluarsa");
    error.status = 400;
    throw error;
  }

  const isValid = await bcrypt.compare(code, record.code_hash);
  if (!isValid) {
    const nextAttempts = record.attempts + 1;
    const status = nextAttempts >= maxAttempts ? "FAILED" : "PENDING";
    await db.query(
      `UPDATE phone_otp_request
       SET attempts = :attempts, status = :status, updated_at = :updated_at
       WHERE id = :id`,
      {
        id: record.id,
        attempts: nextAttempts,
        status,
        updated_at: new Date()
      }
    );
    const error = new Error("OTP tidak valid");
    error.status = 400;
    throw error;
  }

  await db.query(
    `UPDATE phone_otp_request
     SET status = 'VERIFIED', verified_at = :verified_at, updated_at = :updated_at
     WHERE id = :id`,
    {
      id: record.id,
      verified_at: new Date(),
      updated_at: new Date()
    }
  );

  return { phone: normalized, status: "VERIFIED" };
};

const consumeOtp = async (phone) => {
  const normalized = normalizePhone(phone);
  const [rows] = await db.query(
    `SELECT * FROM phone_otp_request
     WHERE phone = :phone AND status = 'VERIFIED'
     ORDER BY verified_at DESC
     LIMIT 1`,
    { phone: normalized }
  );
  if (rows.length === 0) {
    const error = new Error("OTP belum diverifikasi");
    error.status = 400;
    throw error;
  }
  const record = rows[0];
  if (new Date(record.expires_at) < new Date()) {
    await db.query(
      `UPDATE phone_otp_request
       SET status = 'EXPIRED', updated_at = :updated_at
       WHERE id = :id`,
      { id: record.id, updated_at: new Date() }
    );
    const error = new Error("OTP sudah kadaluarsa");
    error.status = 400;
    throw error;
  }
  await db.query(
    `UPDATE phone_otp_request
     SET status = 'USED', used_at = :used_at, updated_at = :updated_at
     WHERE id = :id`,
    { id: record.id, used_at: new Date(), updated_at: new Date() }
  );
  return { phone: normalized, status: "USED" };
};

module.exports = {
  requestOtp,
  verifyOtp,
  consumeOtp
};
