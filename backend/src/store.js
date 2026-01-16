const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { hashPassword } = require("./utils");

const dataPath = path.join(__dirname, "..", "data", "db.json");

const emptyStore = () => ({
  rts: [],
  users: [],
  userRt: [],
  residents: [],
  familyCards: [],
  familyMembers: [],
  residentDocuments: [],
  refreshTokens: [],
  auditLogs: [],
  notificationOutbox: []
});

const loadStore = () => {
  if (!fs.existsSync(dataPath)) {
    return emptyStore();
  }
  const raw = fs.readFileSync(dataPath, "utf8");
  try {
    return JSON.parse(raw);
  } catch (err) {
    return emptyStore();
  }
};

const saveStore = (store) => {
  fs.mkdirSync(path.dirname(dataPath), { recursive: true });
  fs.writeFileSync(dataPath, JSON.stringify(store, null, 2));
};

const ensureSuperAdmin = () => {
  const store = loadStore();
  const exists = store.users.find((user) => user.role === "SUPER_ADMIN");
  if (exists) {
    return;
  }
  const email = process.env.SUPER_ADMIN_EMAIL || "superadmin@portalrt.local";
  const password = process.env.SUPER_ADMIN_PASSWORD || "ChangeMe123!";
  const userId = uuidv4();
  store.users.push({
    id: userId,
    email,
    phone: null,
    passwordHash: hashPassword(password),
    role: "SUPER_ADMIN",
    status: "ACTIVE",
    createdAt: new Date().toISOString()
  });
  saveStore(store);
  console.log("Super admin created. Update credentials via env vars.");
};

module.exports = {
  loadStore,
  saveStore,
  ensureSuperAdmin
};
