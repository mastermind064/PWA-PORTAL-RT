const { v4: uuidv4 } = require("uuid");
const db = require("../db");
const { sendMessage, getWaStatus, isRegisteredUser } = require("./whatsappService");

const formatCurrency = (value) => {
  const numberValue = Number(value || 0);
  return `Rp ${numberValue.toLocaleString("id-ID")}`;
};

const renderTemplate = (templateKey, payload = {}) => {
  switch (templateKey) {
    case "WalletTopupSubmitted":
      return `Topup deposit ${formatCurrency(payload.amount)} sudah kami terima. RT: ${
        payload.rtName || "-"
      }. Menunggu verifikasi.`;
    case "WalletTopupNeedsApproval":
      return `Topup baru dari ${payload.residentName || "warga"} sebesar ${formatCurrency(
        payload.amount
      )}. Mohon approval.`;
    case "WalletTopupApproved":
      return "Topup Anda telah disetujui. Terima kasih.";
    case "WalletTopupRejected":
      return "Topup Anda ditolak. Silakan hubungi pengurus RT.";
    case "KasRtDebitSuccess":
      return `Kas RT berhasil didebit sebesar ${formatCurrency(payload.amount)}.`;
    case "KasRtDebitInsufficient":
      return `Saldo tidak cukup untuk kas RT sebesar ${formatCurrency(
        payload.amount
      )}. Mohon topup.`;
    case "FeePaymentSubmitted":
      return `Bukti iuran ${payload.campaignName || "iuran"} sebesar ${formatCurrency(
        payload.amount
      )} sudah diterima. Menunggu verifikasi.`;
    case "FeePaymentNeedsApproval":
      return `Pembayaran iuran ${payload.campaignName || "iuran"} dari ${
        payload.residentName || "warga"
      } sebesar ${formatCurrency(payload.amount)} menunggu approval.`;
    case "FeePaymentApproved":
      return `Pembayaran iuran ${payload.campaignName || "iuran"} sebesar ${formatCurrency(
        payload.amount
      )} sudah disetujui. Terima kasih.`;
    case "FeePaymentRejected":
      return `Pembayaran iuran ${payload.campaignName || "iuran"} ditolak. Silakan hubungi pengurus RT.`;
    case "FeeBillingReminder":
      return `Reminder iuran ${payload.campaignName || "iuran"} ${
        payload.period ? `periode ${payload.period}` : ""
      } sebesar ${formatCurrency(payload.amount)} belum dibayar.`;
    case "PhoneOtpCode":
      return `Kode OTP Portal RT: ${payload.code}. Berlaku ${payload.ttlMinutes || 10} menit.`;
    case "RESIDENT_REGISTERED":
      return `Terima kasih, pendaftaran Anda sudah diterima. Status akun menunggu approval RT.`;
    default:
      return "Notifikasi dari Portal RT.";
  }
};

const parsePayload = (payloadValue) => {
  if (!payloadValue) return {};
  if (typeof payloadValue === "object") return payloadValue;
  if (typeof payloadValue === "string") {
    try {
      return JSON.parse(payloadValue);
    } catch (err) {
      return {};
    }
  }
  return {};
};

const processOutboxItem = async (item) => {
  const payload = parsePayload(item.payload);
  const message = renderTemplate(item.template_key, payload);
  try {
    const registered = await isRegisteredUser(item.to_phone);
    if (!registered) {
      throw new Error("Nomor WA tidak terdaftar");
    }
    const response = await sendMessage(item.to_phone, message, { sendSeen: false });
    await db.transaction(async (conn) => {
      await conn.query(
        `UPDATE notification_outbox
         SET status = 'SENT', updated_at = :updated_at
         WHERE id = :id`,
        { id: item.id, updated_at: new Date() }
      );
      await conn.query(
        `INSERT INTO notification_log
         (id, outbox_id, sent_at, status, response_text, created_at)
         VALUES (:id, :outbox_id, :sent_at, :status, :response_text, :created_at)`,
        {
          id: uuidv4(),
          outbox_id: item.id,
          sent_at: new Date(),
          status: "SENT",
          response_text: JSON.stringify({
            messageId: response?.id?._serialized || null,
            message
          }),
          created_at: new Date()
        }
      );
    });
  } catch (err) {
    await db.transaction(async (conn) => {
      await conn.query(
        `UPDATE notification_outbox
         SET status = 'FAILED', retry_count = retry_count + 1, updated_at = :updated_at
         WHERE id = :id`,
        { id: item.id, updated_at: new Date() }
      );
      await conn.query(
        `INSERT INTO notification_log
         (id, outbox_id, sent_at, status, response_text, created_at)
         VALUES (:id, :outbox_id, :sent_at, :status, :response_text, :created_at)`,
        {
          id: uuidv4(),
          outbox_id: item.id,
          sent_at: new Date(),
          status: "FAILED",
          response_text: err.message || "Send failed",
          created_at: new Date()
        }
      );
    });
  }
};

const runNotificationWorker = async () => {
  const waStatus = await getWaStatus();
  if (waStatus.state !== "READY") {
    return;
  }
  const [rows] = await db.query(
    `SELECT *
     FROM notification_outbox
     WHERE status = 'PENDING' AND channel = 'WHATSAPP'
     ORDER BY created_at ASC
     LIMIT 10`
  );
  for (const item of rows) {
    await processOutboxItem(item);
  }
};

module.exports = {
  runNotificationWorker
};
