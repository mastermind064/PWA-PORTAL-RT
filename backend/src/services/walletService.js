const { v4: uuidv4 } = require("uuid");
const db = require("../db");
const {
  notifyTopupSubmitted,
  notifyTopupResult
} = require("./notificationService");

const getOrCreateWallet = async (rtId, residentId) => {
  const [rows] = await db.query(
    "SELECT * FROM wallet WHERE rt_id = :rt_id AND resident_id = :resident_id LIMIT 1",
    { rt_id: rtId, resident_id: residentId }
  );
  if (rows.length > 0) {
    return rows[0];
  }
  const walletId = uuidv4();
  await db.query(
    `INSERT INTO wallet (id, rt_id, resident_id, balance, created_at)
     VALUES (:id, :rt_id, :resident_id, :balance, :created_at)`,
    {
      id: walletId,
      rt_id: rtId,
      resident_id: residentId,
      balance: 0,
      created_at: new Date()
    }
  );
  const [created] = await db.query("SELECT * FROM wallet WHERE id = :id", {
    id: walletId
  });
  return created[0];
};

const listWalletTransactions = async (rtId, walletId) => {
  const [rows] = await db.query(
    `SELECT * FROM wallet_transaction
     WHERE rt_id = :rt_id AND wallet_id = :wallet_id
     ORDER BY created_at DESC`,
    { rt_id: rtId, wallet_id: walletId }
  );
  return rows;
};

const listTopupRequests = async (rtId, status) => {
  const [rows] = status
    ? await db.query(
        `SELECT t.*, r.full_name, r.phone
         FROM wallet_topup_request t
         JOIN resident r ON r.id = t.resident_id
         WHERE t.rt_id = :rt_id AND t.status = :status
         ORDER BY t.created_at DESC`,
        { rt_id: rtId, status }
      )
    : await db.query(
        `SELECT t.*, r.full_name, r.phone
         FROM wallet_topup_request t
         JOIN resident r ON r.id = t.resident_id
         WHERE t.rt_id = :rt_id
         ORDER BY t.created_at DESC`,
        { rt_id: rtId }
      );
  return rows;
};

const createTopupRequest = async ({
  rtId,
  residentId,
  amount,
  proof
}) => {
  if (!amount || amount <= 0) {
    const error = new Error("Nominal topup tidak valid");
    error.status = 400;
    throw error;
  }
  const topupId = uuidv4();
  await db.query(
    `INSERT INTO wallet_topup_request
     (id, rt_id, resident_id, amount, storage_path, original_name, mime_type, size, status, created_at)
     VALUES (:id, :rt_id, :resident_id, :amount, :storage_path, :original_name, :mime_type, :size, :status, :created_at)`,
    {
      id: topupId,
      rt_id: rtId,
      resident_id: residentId,
      amount,
      storage_path: proof.storagePath,
      original_name: proof.originalName,
      mime_type: proof.mimeType,
      size: proof.size,
      status: "PENDING",
      created_at: new Date()
    }
  );
  await notifyTopupSubmitted(rtId, residentId, amount);
  return { id: topupId, status: "PENDING" };
};

const approveTopupRequest = async (rtId, topupId, actorUserId) => {
  const [rows] = await db.query(
    `SELECT * FROM wallet_topup_request
     WHERE id = :id AND rt_id = :rt_id LIMIT 1`,
    { id: topupId, rt_id: rtId }
  );
  if (rows.length === 0) {
    const error = new Error("Topup tidak ditemukan");
    error.status = 404;
    throw error;
  }
  const topup = rows[0];
  if (topup.status === "APPROVED") {
    const error = new Error("Topup sudah disetujui");
    error.status = 409;
    throw error;
  }
  if (topup.status === "REJECTED") {
    const error = new Error("Topup sudah ditolak");
    error.status = 409;
    throw error;
  }

  const wallet = await getOrCreateWallet(rtId, topup.resident_id);
  const transactionId = uuidv4();

  await db.transaction(async (conn) => {
    await conn.query(
      `UPDATE wallet_topup_request
       SET status = 'APPROVED', updated_at = :updated_at
       WHERE id = :id`,
      { id: topupId, updated_at: new Date() }
    );

    await conn.query(
      `INSERT INTO wallet_transaction
       (id, rt_id, wallet_id, type, direction, amount, ref_type, ref_id, created_at)
       VALUES (:id, :rt_id, :wallet_id, :type, :direction, :amount, :ref_type, :ref_id, :created_at)`,
      {
        id: transactionId,
        rt_id: rtId,
        wallet_id: wallet.id,
        type: "TOPUP",
        direction: "CREDIT",
        amount: topup.amount,
        ref_type: "WALLET_TOPUP",
        ref_id: topupId,
        created_at: new Date()
      }
    );

    await conn.query(
      `UPDATE wallet SET balance = balance + :amount WHERE id = :id`,
      { amount: topup.amount, id: wallet.id }
    );

    await conn.query(
      `INSERT INTO audit_log (id, rt_id, actor_user_id, action, metadata_json, created_at)
       VALUES (:id, :rt_id, :actor_user_id, :action, :metadata_json, :created_at)`,
      {
        id: uuidv4(),
        rt_id: rtId,
        actor_user_id: actorUserId,
        action: "TOPUP_APPROVED",
        metadata_json: JSON.stringify({ topupId, amount: topup.amount }),
        created_at: new Date()
      }
    );
  });

  await notifyTopupResult(rtId, topup.resident_id, "APPROVED");
  return { status: "APPROVED" };
};

const rejectTopupRequest = async (rtId, topupId, actorUserId) => {
  const [rows] = await db.query(
    `SELECT * FROM wallet_topup_request
     WHERE id = :id AND rt_id = :rt_id LIMIT 1`,
    { id: topupId, rt_id: rtId }
  );
  if (rows.length === 0) {
    const error = new Error("Topup tidak ditemukan");
    error.status = 404;
    throw error;
  }
  const topup = rows[0];
  if (topup.status === "REJECTED") {
    const error = new Error("Topup sudah ditolak");
    error.status = 409;
    throw error;
  }
  if (topup.status === "APPROVED") {
    const error = new Error("Topup sudah disetujui");
    error.status = 409;
    throw error;
  }

  await db.transaction(async (conn) => {
    await conn.query(
      `UPDATE wallet_topup_request
       SET status = 'REJECTED', updated_at = :updated_at
       WHERE id = :id`,
      { id: topupId, updated_at: new Date() }
    );
    await conn.query(
      `INSERT INTO audit_log (id, rt_id, actor_user_id, action, metadata_json, created_at)
       VALUES (:id, :rt_id, :actor_user_id, :action, :metadata_json, :created_at)`,
      {
        id: uuidv4(),
        rt_id: rtId,
        actor_user_id: actorUserId,
        action: "TOPUP_REJECTED",
        metadata_json: JSON.stringify({ topupId }),
        created_at: new Date()
      }
    );
  });

  await notifyTopupResult(rtId, topup.resident_id, "REJECTED");
  return { status: "REJECTED" };
};

module.exports = {
  getOrCreateWallet,
  listWalletTransactions,
  listTopupRequests,
  createTopupRequest,
  approveTopupRequest,
  rejectTopupRequest
};
