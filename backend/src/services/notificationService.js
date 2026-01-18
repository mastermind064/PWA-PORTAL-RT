const { v4: uuidv4 } = require("uuid");
const db = require("../db");
const { normalizePhone } = require("./whatsappService");

const enqueueNotification = async ({ rtId, toPhone, templateKey, payload }) => {
  const normalized = normalizePhone(toPhone);
  if (!normalized) return;
  const id = uuidv4();
  await db.query(
    `INSERT INTO notification_outbox
     (id, rt_id, channel, to_phone, template_key, payload, status, retry_count, created_at)
     VALUES (:id, :rt_id, :channel, :to_phone, :template_key, :payload, :status, :retry_count, :created_at)`,
    {
      id,
      rt_id: rtId,
      channel: "WHATSAPP",
      to_phone: normalized,
      template_key: templateKey,
      payload: JSON.stringify(payload || {}),
      status: "PENDING",
      retry_count: 0,
      created_at: new Date()
    }
  );
  return id;
};

const notifyTopupSubmitted = async (rtId, residentId, amount) => {
  const [residentRows] = await db.query(
    `SELECT r.full_name, r.phone, rt.name AS rt_name
     FROM resident r JOIN rt ON rt.id = r.rt_id
     WHERE r.id = :resident_id AND r.rt_id = :rt_id`,
    { resident_id: residentId, rt_id: rtId }
  );
  if (residentRows.length === 0) return;
  const resident = residentRows[0];

  await enqueueNotification({
    rtId,
    toPhone: resident.phone,
    templateKey: "WalletTopupSubmitted",
    payload: { amount, rtName: resident.rt_name }
  });

  const [admins] = await db.query(
    `SELECT u.phone FROM user_rt ur
     JOIN users u ON u.id = ur.user_id
     WHERE ur.rt_id = :rt_id
       AND ur.status = 'ACTIVE'
       AND ur.role IN ('ADMIN_RT','BENDAHARA')`,
    { rt_id: rtId }
  );
  for (const admin of admins) {
    await enqueueNotification({
      rtId,
      toPhone: admin.phone,
      templateKey: "WalletTopupNeedsApproval",
      payload: { amount, residentName: resident.full_name }
    });
  }
};

const notifyTopupResult = async (rtId, residentId, status) => {
  const [residentRows] = await db.query(
    "SELECT phone FROM resident WHERE id = :resident_id AND rt_id = :rt_id",
    { resident_id: residentId, rt_id: rtId }
  );
  if (residentRows.length === 0) return;
  const templateKey =
    status === "APPROVED" ? "WalletTopupApproved" : "WalletTopupRejected";
  await enqueueNotification({
    rtId,
    toPhone: residentRows[0].phone,
    templateKey,
    payload: { status }
  });
};

const notifyKasDebit = async (rtId, residentId, status, amount) => {
  const [residentRows] = await db.query(
    "SELECT phone FROM resident WHERE id = :resident_id AND rt_id = :rt_id",
    { resident_id: residentId, rt_id: rtId }
  );
  if (residentRows.length === 0) return;
  const templateKey =
    status === "PAID" ? "KasRtDebitSuccess" : "KasRtDebitInsufficient";
  await enqueueNotification({
    rtId,
    toPhone: residentRows[0].phone,
    templateKey,
    payload: { amount, status }
  });
};

module.exports = {
  enqueueNotification,
  notifyTopupSubmitted,
  notifyTopupResult,
  notifyKasDebit
};
