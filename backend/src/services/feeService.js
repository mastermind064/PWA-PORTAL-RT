const { v4: uuidv4 } = require("uuid");
const db = require("../db");
const {
  notifyFeePaymentSubmitted,
  notifyFeePaymentResult,
  notifyFeeBillingReminder
} = require("./notificationService");

const listCampaigns = async (rtId) => {
  const [rows] = await db.query(
    "SELECT * FROM fee_campaign WHERE rt_id = :rt_id ORDER BY created_at DESC",
    { rt_id: rtId }
  );
  return rows;
};

const createCampaign = async (rtId, payload, actorUserId) => {
  const { name, type, amountType, fixedAmount } = payload || {};
  if (!name || !type || !amountType) {
    const error = new Error("Data campaign belum lengkap");
    error.status = 400;
    throw error;
  }
  if (amountType === "FIXED" && (!fixedAmount || Number(fixedAmount) <= 0)) {
    const error = new Error("Nominal iuran tidak valid");
    error.status = 400;
    throw error;
  }
  if (amountType === "FLEXIBLE" && fixedAmount) {
    const error = new Error("Nominal tetap hanya untuk FIXED");
    error.status = 400;
    throw error;
  }

  const campaignId = uuidv4();
  await db.query(
    `INSERT INTO fee_campaign
     (id, rt_id, name, type, amount_type, fixed_amount, status, created_at)
     VALUES (:id, :rt_id, :name, :type, :amount_type, :fixed_amount, :status, :created_at)`,
    {
      id: campaignId,
      rt_id: rtId,
      name,
      type,
      amount_type: amountType,
      fixed_amount: fixedAmount || null,
      status: "ACTIVE",
      created_at: new Date()
    }
  );

  await db.query(
    `INSERT INTO audit_log (id, rt_id, actor_user_id, action, metadata_json, created_at)
     VALUES (:id, :rt_id, :actor_user_id, :action, :metadata_json, :created_at)`,
    {
      id: uuidv4(),
      rt_id: rtId,
      actor_user_id: actorUserId,
      action: "FEE_CAMPAIGN_CREATED",
      metadata_json: JSON.stringify({ campaignId, name, type, amountType }),
      created_at: new Date()
    }
  );

  return { id: campaignId };
};

const updateCampaign = async (rtId, campaignId, payload, actorUserId) => {
  const { name, type, amountType, fixedAmount, status } = payload || {};
  const [rows] = await db.query(
    "SELECT * FROM fee_campaign WHERE id = :id AND rt_id = :rt_id LIMIT 1",
    { id: campaignId, rt_id: rtId }
  );
  if (rows.length === 0) {
    const error = new Error("Campaign tidak ditemukan");
    error.status = 404;
    throw error;
  }
  if (amountType === "FIXED" && (!fixedAmount || Number(fixedAmount) <= 0)) {
    const error = new Error("Nominal iuran tidak valid");
    error.status = 400;
    throw error;
  }
  if (amountType === "FLEXIBLE" && fixedAmount) {
    const error = new Error("Nominal tetap hanya untuk FIXED");
    error.status = 400;
    throw error;
  }

  await db.query(
    `UPDATE fee_campaign
     SET name = :name,
         type = :type,
         amount_type = :amount_type,
         fixed_amount = :fixed_amount,
         status = :status,
         updated_at = :updated_at
     WHERE id = :id AND rt_id = :rt_id`,
    {
      id: campaignId,
      rt_id: rtId,
      name,
      type,
      amount_type: amountType,
      fixed_amount: amountType === "FIXED" ? fixedAmount : null,
      status: status || rows[0].status,
      updated_at: new Date()
    }
  );

  await db.query(
    `INSERT INTO audit_log (id, rt_id, actor_user_id, action, metadata_json, created_at)
     VALUES (:id, :rt_id, :actor_user_id, :action, :metadata_json, :created_at)`,
    {
      id: uuidv4(),
      rt_id: rtId,
      actor_user_id: actorUserId,
      action: "FEE_CAMPAIGN_UPDATED",
      metadata_json: JSON.stringify({ campaignId }),
      created_at: new Date()
    }
  );

  return { status: "UPDATED" };
};

const setCampaignStatus = async (rtId, campaignId, status, actorUserId) => {
  await db.query(
    `UPDATE fee_campaign SET status = :status, updated_at = :updated_at
     WHERE id = :id AND rt_id = :rt_id`,
    {
      id: campaignId,
      rt_id: rtId,
      status,
      updated_at: new Date()
    }
  );
  await db.query(
    `INSERT INTO audit_log (id, rt_id, actor_user_id, action, metadata_json, created_at)
     VALUES (:id, :rt_id, :actor_user_id, :action, :metadata_json, :created_at)`,
    {
      id: uuidv4(),
      rt_id: rtId,
      actor_user_id: actorUserId,
      action: "FEE_CAMPAIGN_STATUS",
      metadata_json: JSON.stringify({ campaignId, status }),
      created_at: new Date()
    }
  );
  return { status };
};

const generateBillings = async (rtId, campaignId, period) => {
  const [rows] = await db.query(
    "SELECT * FROM fee_campaign WHERE id = :id AND rt_id = :rt_id LIMIT 1",
    { id: campaignId, rt_id: rtId }
  );
  if (rows.length === 0) {
    const error = new Error("Campaign tidak ditemukan");
    error.status = 404;
    throw error;
  }
  const campaign = rows[0];
  if (campaign.amount_type === "FIXED" && (!campaign.fixed_amount || Number(campaign.fixed_amount) <= 0)) {
    const error = new Error("Nominal campaign tidak valid");
    error.status = 400;
    throw error;
  }
  if (campaign.type === "RECURRING" && !period) {
    const error = new Error("Period wajib untuk recurring billing");
    error.status = 400;
    throw error;
  }

  const [residents] = await db.query(
    "SELECT id FROM resident WHERE rt_id = :rt_id AND approval_status = 'APPROVED'",
    { rt_id: rtId }
  );
  if (residents.length === 0) {
    return { created: 0 };
  }

  let created = 0;
  for (const resident of residents) {
    const [existing] = await db.query(
      `SELECT id FROM fee_billing
       WHERE rt_id = :rt_id AND campaign_id = :campaign_id AND resident_id = :resident_id
       ${campaign.type === "RECURRING" ? "AND period = :period" : ""}
       LIMIT 1`,
      {
        rt_id: rtId,
        campaign_id: campaignId,
        resident_id: resident.id,
        period: campaign.type === "RECURRING" ? period : null
      }
    );
    if (existing.length > 0) {
      continue;
    }
    await db.query(
      `INSERT INTO fee_billing
       (id, rt_id, campaign_id, resident_id, period, amount, status, created_at)
       VALUES (:id, :rt_id, :campaign_id, :resident_id, :period, :amount, :status, :created_at)`,
      {
        id: uuidv4(),
        rt_id: rtId,
        campaign_id: campaignId,
        resident_id: resident.id,
        period: campaign.type === "RECURRING" ? period : null,
        amount: campaign.amount_type === "FIXED" ? campaign.fixed_amount : 0,
        status: "UNPAID",
        created_at: new Date()
      }
    );
    created += 1;
  }

  return { created };
};

const runRecurringBillings = async () => {
  const period = `${new Date().getFullYear()}-${String(
    new Date().getMonth() + 1
  ).padStart(2, "0")}`;
  const [campaigns] = await db.query(
    `SELECT id, rt_id
     FROM fee_campaign
     WHERE type = 'RECURRING' AND status = 'ACTIVE'`
  );
  for (const campaign of campaigns) {
    await generateBillings(campaign.rt_id, campaign.id, period);
  }
};

const runFeeBillingReminder = async () => {
  const period = `${new Date().getFullYear()}-${String(
    new Date().getMonth() + 1
  ).padStart(2, "0")}`;
  const minDays = Math.max(Number(process.env.FEE_REMINDER_MIN_DAYS || 0), 0);
  const [rows] = await db.query(
    `SELECT b.id, b.amount, b.period, r.phone, c.name AS campaign_name, b.created_at, b.rt_id
     FROM fee_billing b
     JOIN resident r ON r.id = b.resident_id
     JOIN fee_campaign c ON c.id = b.campaign_id
     WHERE b.status = 'UNPAID'
       AND (b.period = :period OR b.period IS NULL)
       AND DATEDIFF(NOW(), b.created_at) >= :min_days`,
    { period, min_days: minDays }
  );

  for (const billing of rows) {
    await notifyFeeBillingReminder(billing);
  }
};

const listBillingsAdmin = async (rtId, status) => {
  const [rows] = status
    ? await db.query(
        `SELECT b.*, r.full_name, c.name AS campaign_name, c.amount_type, c.fixed_amount
         FROM fee_billing b
         JOIN resident r ON r.id = b.resident_id
         JOIN fee_campaign c ON c.id = b.campaign_id
         WHERE b.rt_id = :rt_id AND b.status = :status
         ORDER BY b.created_at DESC`,
        { rt_id: rtId, status }
      )
    : await db.query(
        `SELECT b.*, r.full_name, c.name AS campaign_name, c.amount_type, c.fixed_amount
         FROM fee_billing b
         JOIN resident r ON r.id = b.resident_id
         JOIN fee_campaign c ON c.id = b.campaign_id
         WHERE b.rt_id = :rt_id
         ORDER BY b.created_at DESC`,
        { rt_id: rtId }
      );
  return rows;
};

const listBillingsForResident = async (rtId, residentId, status) => {
  const [rows] = status
    ? await db.query(
        `SELECT b.*, c.name AS campaign_name, c.amount_type, c.fixed_amount
         FROM fee_billing b
         JOIN fee_campaign c ON c.id = b.campaign_id
         WHERE b.rt_id = :rt_id AND b.resident_id = :resident_id AND b.status = :status
         ORDER BY b.created_at DESC`,
        { rt_id: rtId, resident_id: residentId, status }
      )
    : await db.query(
        `SELECT b.*, c.name AS campaign_name, c.amount_type, c.fixed_amount
         FROM fee_billing b
         JOIN fee_campaign c ON c.id = b.campaign_id
         WHERE b.rt_id = :rt_id AND b.resident_id = :resident_id
         ORDER BY b.created_at DESC`,
        { rt_id: rtId, resident_id: residentId }
      );
  return rows;
};

const submitPayment = async (rtId, billingId, residentId, proof, amount) => {
  const [rows] = await db.query(
    `SELECT b.*, c.amount_type, c.fixed_amount
     FROM fee_billing b
     JOIN fee_campaign c ON c.id = b.campaign_id
     WHERE b.id = :id AND b.rt_id = :rt_id LIMIT 1`,
    { id: billingId, rt_id: rtId }
  );
  if (rows.length === 0) {
    const error = new Error("Billing tidak ditemukan");
    error.status = 404;
    throw error;
  }
  const billing = rows[0];
  if (billing.resident_id !== residentId) {
    const error = new Error("Akses billing tidak valid");
    error.status = 403;
    throw error;
  }
  if (billing.status === "PAID") {
    const error = new Error("Billing sudah dibayar");
    error.status = 409;
    throw error;
  }
  const paymentAmount =
    billing.amount_type === "FLEXIBLE"
      ? Number(amount || 0)
      : Number(billing.amount || 0);
  if (!paymentAmount || paymentAmount <= 0) {
    const error = new Error("Nominal pembayaran tidak valid");
    error.status = 400;
    throw error;
  }

  const submissionId = uuidv4();
  await db.query(
    `INSERT INTO fee_payment_submission
     (id, rt_id, billing_id, resident_id, amount, proof_url, status, created_at)
     VALUES (:id, :rt_id, :billing_id, :resident_id, :amount, :proof_url, :status, :created_at)`,
    {
      id: submissionId,
      rt_id: rtId,
      billing_id: billingId,
      resident_id: residentId,
      amount: paymentAmount,
      proof_url: proof.storagePath,
      status: "PENDING",
      created_at: new Date()
    }
  );
  await notifyFeePaymentSubmitted(rtId, submissionId);
  return { id: submissionId, status: "PENDING" };
};

const listPaymentSubmissions = async (rtId, status) => {
  const [rows] = status
    ? await db.query(
        `SELECT p.*, r.full_name, c.name AS campaign_name
         FROM fee_payment_submission p
         JOIN fee_billing b ON b.id = p.billing_id
         JOIN resident r ON r.id = p.resident_id
         JOIN fee_campaign c ON c.id = b.campaign_id
         WHERE p.rt_id = :rt_id AND p.status = :status
         ORDER BY p.created_at DESC`,
        { rt_id: rtId, status }
      )
    : await db.query(
        `SELECT p.*, r.full_name, c.name AS campaign_name
         FROM fee_payment_submission p
         JOIN fee_billing b ON b.id = p.billing_id
         JOIN resident r ON r.id = p.resident_id
         JOIN fee_campaign c ON c.id = b.campaign_id
         WHERE p.rt_id = :rt_id
         ORDER BY p.created_at DESC`,
        { rt_id: rtId }
      );
  return rows;
};

const listPaymentSubmissionsForResident = async (
  rtId,
  residentId,
  status,
  page,
  limit
) => {
  const pageNumber = Math.max(Number(page) || 1, 1);
  const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 50);
  const offset = (pageNumber - 1) * limitNumber;

  const whereStatus = status ? "AND p.status = :status" : "";
  const countQuery = `
    SELECT COUNT(*) AS total
    FROM fee_payment_submission p
    WHERE p.rt_id = :rt_id AND p.resident_id = :resident_id ${whereStatus}
  `;
  const [countRows] = await db.query(countQuery, {
    rt_id: rtId,
    resident_id: residentId,
    status
  });
  const total = Number(countRows[0]?.total || 0);

  const dataQuery = `
    SELECT p.*, c.name AS campaign_name
    FROM fee_payment_submission p
    JOIN fee_billing b ON b.id = p.billing_id
    JOIN fee_campaign c ON c.id = b.campaign_id
    WHERE p.rt_id = :rt_id AND p.resident_id = :resident_id ${whereStatus}
    ORDER BY p.created_at DESC
    LIMIT :limit OFFSET :offset
  `;
  const [rows] = await db.query(dataQuery, {
    rt_id: rtId,
    resident_id: residentId,
    status,
    limit: limitNumber,
    offset
  });

  return {
    items: rows,
    total,
    page: pageNumber,
    limit: limitNumber
  };
};

const approvePayment = async (rtId, paymentId, actorUserId) => {
  const [rows] = await db.query(
    "SELECT * FROM fee_payment_submission WHERE id = :id AND rt_id = :rt_id LIMIT 1",
    { id: paymentId, rt_id: rtId }
  );
  if (rows.length === 0) {
    const error = new Error("Pembayaran tidak ditemukan");
    error.status = 404;
    throw error;
  }
  const payment = rows[0];
  if (payment.status === "APPROVED") {
    const error = new Error("Pembayaran sudah disetujui");
    error.status = 409;
    throw error;
  }
  if (payment.status === "REJECTED") {
    const error = new Error("Pembayaran sudah ditolak");
    error.status = 409;
    throw error;
  }

  await db.transaction(async (conn) => {
    await conn.query(
      `UPDATE fee_payment_submission
       SET status = 'APPROVED', verified_by_user_id = :user_id, updated_at = :updated_at
       WHERE id = :id`,
      { id: paymentId, user_id: actorUserId, updated_at: new Date() }
    );
    await conn.query(
      `UPDATE fee_billing
       SET status = 'PAID', amount = :amount, updated_at = :updated_at
       WHERE id = :billing_id`,
      { billing_id: payment.billing_id, amount: payment.amount, updated_at: new Date() }
    );
    await conn.query(
      `INSERT INTO cash_ledger
       (id, rt_id, type, amount, category, description, created_at)
       VALUES (:id, :rt_id, :type, :amount, :category, :description, :created_at)`,
      {
        id: uuidv4(),
        rt_id: rtId,
        type: "IN",
        amount: payment.amount,
        category: "FEE",
        description: "Pembayaran iuran",
        created_at: new Date()
      }
    );
    await conn.query(
      `INSERT INTO audit_log (id, rt_id, actor_user_id, action, metadata_json, created_at)
       VALUES (:id, :rt_id, :actor_user_id, :action, :metadata_json, :created_at)`,
      {
        id: uuidv4(),
        rt_id: rtId,
        actor_user_id: actorUserId,
        action: "FEE_PAYMENT_APPROVED",
        metadata_json: JSON.stringify({ paymentId }),
        created_at: new Date()
      }
    );
  });

  await notifyFeePaymentResult(rtId, paymentId, "APPROVED");
  return { status: "APPROVED" };
};

const rejectPayment = async (rtId, paymentId, actorUserId) => {
  const [rows] = await db.query(
    "SELECT * FROM fee_payment_submission WHERE id = :id AND rt_id = :rt_id LIMIT 1",
    { id: paymentId, rt_id: rtId }
  );
  if (rows.length === 0) {
    const error = new Error("Pembayaran tidak ditemukan");
    error.status = 404;
    throw error;
  }
  const payment = rows[0];
  if (payment.status === "REJECTED") {
    const error = new Error("Pembayaran sudah ditolak");
    error.status = 409;
    throw error;
  }
  if (payment.status === "APPROVED") {
    const error = new Error("Pembayaran sudah disetujui");
    error.status = 409;
    throw error;
  }

  await db.query(
    `UPDATE fee_payment_submission
     SET status = 'REJECTED', verified_by_user_id = :user_id, updated_at = :updated_at
     WHERE id = :id`,
    { id: paymentId, user_id: actorUserId, updated_at: new Date() }
  );
  await db.query(
    `INSERT INTO audit_log (id, rt_id, actor_user_id, action, metadata_json, created_at)
     VALUES (:id, :rt_id, :actor_user_id, :action, :metadata_json, :created_at)`,
    {
      id: uuidv4(),
      rt_id: rtId,
      actor_user_id: actorUserId,
      action: "FEE_PAYMENT_REJECTED",
      metadata_json: JSON.stringify({ paymentId }),
      created_at: new Date()
    }
  );
  await notifyFeePaymentResult(rtId, paymentId, "REJECTED");
  return { status: "REJECTED" };
};

module.exports = {
  listCampaigns,
  createCampaign,
  updateCampaign,
  setCampaignStatus,
  generateBillings,
  runRecurringBillings,
  runFeeBillingReminder,
  listBillingsAdmin,
  listBillingsForResident,
  submitPayment,
  listPaymentSubmissions,
  listPaymentSubmissionsForResident,
  approvePayment,
  rejectPayment
};
