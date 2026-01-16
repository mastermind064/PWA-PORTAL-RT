const { v4: uuidv4 } = require("uuid");
const { hashPassword } = require("../utils");
const db = require("../db");

const ensureSuperAdmin = async () => {
  const [rows] = await db.query(
    "SELECT id FROM users WHERE role = 'SUPER_ADMIN' LIMIT 1"
  );
  if (rows.length > 0) {
    return;
  }
  const email = process.env.SUPER_ADMIN_EMAIL || "superadmin@portalrt.local";
  const password = process.env.SUPER_ADMIN_PASSWORD || "ChangeMe123!";
  const userId = uuidv4();
  await db.query(
    `INSERT INTO users (id, email, phone, password_hash, role, status, created_at)
     VALUES (:id, :email, :phone, :password_hash, :role, :status, :created_at)`,
    {
      id: userId,
      email,
      phone: null,
      password_hash: hashPassword(password),
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      created_at: new Date()
    }
  );
  console.log("Super admin created. Update credentials via env vars.");
};

module.exports = { ensureSuperAdmin };
