const { v4: uuidv4 } = require("uuid");
const db = require("../db");
const { notifyKasDebit } = require("./notificationService");

const getKasConfig = async (rtId) => {
  const [rows] = await db.query(
    "SELECT * FROM kas_rt_config WHERE rt_id = :rt_id LIMIT 1",
    { rt_id: rtId }
  );
  return rows[0] || null;
};

const upsertKasConfig = async (rtId, payload, actorUserId) => {
  const { isActive, monthlyAmount, debitDayOfMonth } = payload;
  const existing = await getKasConfig(rtId);
  if (existing) {
    await db.query(
      `UPDATE kas_rt_config
       SET is_active = :is_active,
           monthly_amount = :monthly_amount,
           debit_day_of_month = :debit_day_of_month,
           updated_at = :updated_at
       WHERE rt_id = :rt_id`,
      {
        rt_id: rtId,
        is_active: isActive ? 1 : 0,
        monthly_amount: monthlyAmount,
        debit_day_of_month: debitDayOfMonth,
        updated_at: new Date()
      }
    );
  } else {
    await db.query(
      `INSERT INTO kas_rt_config
       (id, rt_id, is_active, monthly_amount, debit_day_of_month, created_at)
       VALUES (:id, :rt_id, :is_active, :monthly_amount, :debit_day_of_month, :created_at)`,
      {
        id: uuidv4(),
        rt_id: rtId,
        is_active: isActive ? 1 : 0,
        monthly_amount: monthlyAmount,
        debit_day_of_month: debitDayOfMonth,
        created_at: new Date()
      }
    );
  }

  await db.query(
    `INSERT INTO audit_log (id, rt_id, actor_user_id, action, metadata_json, created_at)
     VALUES (:id, :rt_id, :actor_user_id, :action, :metadata_json, :created_at)`,
    {
      id: uuidv4(),
      rt_id: rtId,
      actor_user_id: actorUserId,
      action: "KAS_RT_CONFIG_UPDATED",
      metadata_json: JSON.stringify({
        isActive: !!isActive,
        monthlyAmount,
        debitDayOfMonth
      }),
      created_at: new Date()
    }
  );

  return getKasConfig(rtId);
};

const runMonthlyDebit = async () => {
  const today = new Date();
  const day = today.getDate();
  const period = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  const [configs] = await db.query(
    "SELECT * FROM kas_rt_config WHERE is_active = 1 AND debit_day_of_month = :day",
    { day }
  );
  if (configs.length === 0) {
    return;
  }

  for (const config of configs) {
    const rtId = config.rt_id;
    const [residents] = await db.query(
      `SELECT r.id AS resident_id, w.id AS wallet_id, w.balance
       FROM resident r
       LEFT JOIN wallet w ON w.resident_id = r.id
       WHERE r.rt_id = :rt_id AND r.approval_status = 'APPROVED'`,
      { rt_id: rtId }
    );

    for (const resident of residents) {
      const [existing] = await db.query(
        `SELECT id FROM kas_rt_monthly_charge
         WHERE rt_id = :rt_id AND resident_id = :resident_id AND period = :period
         LIMIT 1`,
        {
          rt_id: rtId,
          resident_id: resident.resident_id,
          period
        }
      );
      if (existing.length > 0) {
        continue;
      }

      const walletId = resident.wallet_id;
      const balance = Number(resident.balance || 0);
      const amount = Number(config.monthly_amount || 0);
      const chargeId = uuidv4();

      if (!walletId) {
        await db.query(
          `INSERT INTO kas_rt_monthly_charge
           (id, rt_id, resident_id, period, amount, status, created_at)
           VALUES (:id, :rt_id, :resident_id, :period, :amount, :status, :created_at)`,
          {
            id: chargeId,
            rt_id: rtId,
            resident_id: resident.resident_id,
            period,
            amount,
            status: "UNPAID",
            created_at: new Date()
          }
        );
        continue;
      }

      if (balance >= amount) {
        const txId = uuidv4();
        await db.transaction(async (conn) => {
          await conn.query(
            `INSERT INTO wallet_transaction
             (id, rt_id, wallet_id, type, direction, amount, ref_type, ref_id, created_at)
             VALUES (:id, :rt_id, :wallet_id, :type, :direction, :amount, :ref_type, :ref_id, :created_at)`,
            {
              id: txId,
              rt_id: rtId,
              wallet_id: walletId,
              type: "KAS_RT_MONTHLY_DEBIT",
              direction: "DEBIT",
              amount,
              ref_type: "KAS_RT_CHARGE",
              ref_id: chargeId,
              created_at: new Date()
            }
          );
          await conn.query(
            "UPDATE wallet SET balance = balance - :amount WHERE id = :id",
            { amount, id: walletId }
          );
          await conn.query(
            `INSERT INTO kas_rt_monthly_charge
             (id, rt_id, resident_id, period, amount, status, wallet_transaction_id, created_at)
             VALUES (:id, :rt_id, :resident_id, :period, :amount, :status, :wallet_transaction_id, :created_at)`,
            {
              id: chargeId,
              rt_id: rtId,
              resident_id: resident.resident_id,
              period,
              amount,
              status: "PAID",
              wallet_transaction_id: txId,
              created_at: new Date()
            }
          );
          await conn.query(
            `INSERT INTO cash_ledger
             (id, rt_id, type, amount, category, description, created_at)
             VALUES (:id, :rt_id, :type, :amount, :category, :description, :created_at)`,
            {
              id: uuidv4(),
              rt_id: rtId,
              type: "IN",
              amount,
              category: "KAS_RT",
              description: `Kas RT ${period}`,
              created_at: new Date()
            }
          );
        });
        await notifyKasDebit(rtId, resident.resident_id, "PAID", amount);
      } else {
        await db.query(
          `INSERT INTO kas_rt_monthly_charge
           (id, rt_id, resident_id, period, amount, status, created_at)
           VALUES (:id, :rt_id, :resident_id, :period, :amount, :status, :created_at)`,
          {
            id: chargeId,
            rt_id: rtId,
            resident_id: resident.resident_id,
            period,
            amount,
            status: "UNPAID",
            created_at: new Date()
          }
        );
        await notifyKasDebit(rtId, resident.resident_id, "UNPAID", amount);
      }
    }
  }
};

const listBillingReminders = async (rtId, period) => {
  const query = `
    SELECT c.id, c.period, c.amount, c.status, c.created_at, r.full_name, r.phone
    FROM kas_rt_monthly_charge c
    JOIN resident r ON r.id = c.resident_id
    WHERE c.rt_id = :rt_id AND c.status = 'UNPAID'
    ${period ? "AND c.period = :period" : ""}
    ORDER BY c.created_at DESC
  `;
  const [rows] = await db.query(query, {
    rt_id: rtId,
    period
  });
  return rows.map((row) => ({
    id: row.id,
    period: row.period,
    amount: row.amount,
    status: row.status,
    createdAt: row.created_at,
    residentName: row.full_name,
    residentPhone: row.phone
  }));
};

const retryKasDebit = async (rtId, chargeId, actorUserId) => {
  const [chargeRows] = await db.query(
    `SELECT * FROM kas_rt_monthly_charge
     WHERE id = :id AND rt_id = :rt_id
     LIMIT 1`,
    { id: chargeId, rt_id: rtId }
  );
  if (chargeRows.length === 0) {
    const error = new Error("Tagihan kas RT tidak ditemukan");
    error.status = 404;
    throw error;
  }
  const charge = chargeRows[0];
  if (charge.status === "PAID") {
    const error = new Error("Tagihan kas RT sudah dibayar");
    error.status = 409;
    throw error;
  }

  const [walletRows] = await db.query(
    `SELECT w.id, w.balance, r.id AS resident_id
     FROM wallet w
     JOIN resident r ON r.id = w.resident_id
     WHERE w.rt_id = :rt_id AND r.id = :resident_id
     LIMIT 1`,
    { rt_id: rtId, resident_id: charge.resident_id }
  );
  if (walletRows.length === 0) {
    const error = new Error("Wallet warga tidak ditemukan");
    error.status = 404;
    throw error;
  }

  const wallet = walletRows[0];
  const balance = Number(wallet.balance || 0);
  const amount = Number(charge.amount || 0);
  if (balance < amount) {
    const error = new Error("Saldo warga tidak mencukupi");
    error.status = 409;
    throw error;
  }

  const txId = uuidv4();
  await db.transaction(async (conn) => {
    await conn.query(
      `INSERT INTO wallet_transaction
       (id, rt_id, wallet_id, type, direction, amount, ref_type, ref_id, created_at)
       VALUES (:id, :rt_id, :wallet_id, :type, :direction, :amount, :ref_type, :ref_id, :created_at)`,
      {
        id: txId,
        rt_id: rtId,
        wallet_id: wallet.id,
        type: "KAS_RT_MONTHLY_DEBIT",
        direction: "DEBIT",
        amount,
        ref_type: "KAS_RT_CHARGE",
        ref_id: charge.id,
        created_at: new Date()
      }
    );
    await conn.query(
      "UPDATE wallet SET balance = balance - :amount WHERE id = :id",
      { amount, id: wallet.id }
    );
    await conn.query(
      `UPDATE kas_rt_monthly_charge
       SET status = 'PAID', wallet_transaction_id = :wallet_transaction_id, updated_at = :updated_at
       WHERE id = :id`,
      {
        id: charge.id,
        wallet_transaction_id: txId,
        updated_at: new Date()
      }
    );
    await conn.query(
      `INSERT INTO cash_ledger
       (id, rt_id, type, amount, category, description, created_at)
       VALUES (:id, :rt_id, :type, :amount, :category, :description, :created_at)`,
      {
        id: uuidv4(),
        rt_id: rtId,
        type: "IN",
        amount,
        category: "KAS_RT",
        description: `Kas RT ${charge.period}`,
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
        action: "KAS_RT_DEBIT_RETRY",
        metadata_json: JSON.stringify({
          chargeId: charge.id,
          residentId: charge.resident_id,
          period: charge.period,
          amount
        }),
        created_at: new Date()
      }
    );
  });

  await notifyKasDebit(rtId, charge.resident_id, "PAID", amount);
  return { status: "PAID", walletTransactionId: txId };
};

const getKasDashboard = async (rtId) => {
  const [balanceRows] = await db.query(
    `SELECT COALESCE(SUM(CASE WHEN type = 'IN' THEN amount ELSE -amount END), 0) AS balance
     FROM cash_ledger
     WHERE rt_id = :rt_id`,
    { rt_id: rtId }
  );
  const period = `${new Date().getFullYear()}-${String(
    new Date().getMonth() + 1
  ).padStart(2, "0")}`;
  const [monthRows] = await db.query(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'IN' THEN amount ELSE 0 END), 0) AS debit,
       COALESCE(SUM(CASE WHEN type = 'OUT' THEN amount ELSE 0 END), 0) AS credit
     FROM cash_ledger
     WHERE rt_id = :rt_id AND DATE_FORMAT(created_at, '%Y-%m') = :period`,
    { rt_id: rtId, period }
  );
  const [chargeRows] = await db.query(
    `SELECT c.period, c.amount, c.status, c.created_at, r.full_name
     FROM kas_rt_monthly_charge c
     JOIN resident r ON r.id = c.resident_id
     WHERE c.rt_id = :rt_id
     ORDER BY c.created_at DESC
     LIMIT 10`,
    { rt_id: rtId }
  );

  return {
    balance: balanceRows[0]?.balance || 0,
    debitMonth: monthRows[0]?.debit || 0,
    creditMonth: monthRows[0]?.credit || 0,
    recentCharges: chargeRows.map((row) => ({
      period: row.period,
      amount: row.amount,
      status: row.status,
      createdAt: row.created_at,
      fullName: row.full_name
    }))
  };
};

const listKasCharges = async (rtId, period, page, limit) => {
  const pageNumber = Math.max(Number(page) || 1, 1);
  const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 50);
  const offset = (pageNumber - 1) * limitNumber;
  const wherePeriod = period ? "AND c.period = :period" : "";

  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total
     FROM kas_rt_monthly_charge c
     WHERE c.rt_id = :rt_id ${wherePeriod}`,
    { rt_id: rtId, period }
  );
  const total = Number(countRows[0]?.total || 0);

  const [rows] = await db.query(
    `SELECT c.*, r.full_name
     FROM kas_rt_monthly_charge c
     JOIN resident r ON r.id = c.resident_id
     WHERE c.rt_id = :rt_id ${wherePeriod}
     ORDER BY c.created_at DESC
     LIMIT :limit OFFSET :offset`,
    { rt_id: rtId, period, limit: limitNumber, offset }
  );

  return {
    items: rows.map((row) => ({
      id: row.id,
      period: row.period,
      amount: row.amount,
      status: row.status,
      createdAt: row.created_at,
      fullName: row.full_name
    })),
    total,
    page: pageNumber,
    limit: limitNumber
  };
};

module.exports = {
  getKasConfig,
  upsertKasConfig,
  runMonthlyDebit,
  listBillingReminders,
  retryKasDebit,
  getKasDashboard,
  listKasCharges
};
