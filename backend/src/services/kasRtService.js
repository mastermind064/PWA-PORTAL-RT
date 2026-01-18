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
      const balance = resident.balance || 0;
      const amount = config.monthly_amount;
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

module.exports = {
  getKasConfig,
  upsertKasConfig,
  runMonthlyDebit
};
