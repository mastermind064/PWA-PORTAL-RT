const { Client, LocalAuth } = require("whatsapp-web.js");
const fs = require("fs/promises");
const path = require("path");
const QRCode = require("qrcode");
const { v4: uuidv4 } = require("uuid");
const db = require("../db");

let clientInstance = null;
let clientState = "DISCONNECTED";
let latestQrDataUrl = null;
let connectedPhone = null;
let isInitializing = false;

const normalizePhone = (phone) => {
  if (!phone) return "";
  let digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("0")) {
    digits = `62${digits.slice(1)}`;
  }
  return digits;
};

const resolveAuthPath = () => {
  const envPath = process.env.WA_AUTH_PATH || ".wa_auth";
  if (path.isAbsolute(envPath)) {
    return envPath;
  }
  const cwd = process.cwd();
  let relativePath = envPath;
  if (cwd.toLowerCase().endsWith(`${path.sep}backend`.toLowerCase())) {
    relativePath = relativePath.replace(/^backend[\\/]/i, "");
  }
  return path.resolve(cwd, relativePath);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const removeDirWithRetry = async (targetPath, retries = 5) => {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await fs.rm(targetPath, { recursive: true, force: true });
      return;
    } catch (err) {
      if (!["EBUSY", "EPERM"].includes(err.code) || attempt === retries) {
        throw err;
      }
      await sleep(300 * attempt);
    }
  }
};

const toWhatsAppId = (phone) => {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  return `${normalized}@c.us`;
};

const persistStatus = async (status, phone) => {
  const now = new Date();
  const sessionName = "portal-rt";
  const [rows] = await db.query(
    "SELECT id FROM wa_config WHERE session_name = :session_name LIMIT 1",
    { session_name: sessionName }
  );
  if (rows.length === 0) {
    await db.query(
      `INSERT INTO wa_config
       (id, phone, status, session_name, last_connected_at, created_at, updated_at)
       VALUES (:id, :phone, :status, :session_name, :last_connected_at, :created_at, :updated_at)`,
      {
        id: uuidv4(),
        phone: phone || null,
        status,
        session_name: sessionName,
        last_connected_at: status === "READY" ? now : null,
        created_at: now,
        updated_at: now
      }
    );
  } else {
    await db.query(
      `UPDATE wa_config
       SET phone = :phone,
           status = :status,
           last_connected_at = :last_connected_at,
           updated_at = :updated_at
       WHERE session_name = :session_name`,
      {
        phone: phone || null,
        status,
        last_connected_at: status === "READY" ? now : null,
        updated_at: now,
        session_name: sessionName
      }
    );
  }
};

const ensureClient = () => {
  if (clientInstance) {
    return clientInstance;
  }

  clientInstance = new Client({
    authStrategy: new LocalAuth({
      clientId: "portal-rt",
      dataPath: resolveAuthPath()
    }),
    puppeteer: {
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    }
  });

  clientInstance.on("qr", async (qr) => {
    clientState = "QR";
    latestQrDataUrl = await QRCode.toDataURL(qr);
  });

  clientInstance.on("loading_screen", async (percent, message) => {
    clientState = "LOADING";
    await persistStatus(clientState, connectedPhone);
    console.log(`WA loading ${percent}%: ${message}`);
  });

  clientInstance.on("change_state", async (state) => {
    console.log(`WA state changed: ${state}`);
  });

  clientInstance.on("ready", async () => {
    clientState = "READY";
    latestQrDataUrl = null;
    connectedPhone = clientInstance.info?.wid?.user || null;
    await persistStatus(clientState, connectedPhone);
  });

  clientInstance.on("authenticated", async () => {
    clientState = "AUTHENTICATED";
    await persistStatus(clientState, connectedPhone);
  });

  clientInstance.on("auth_failure", async () => {
    clientState = "AUTH_FAILURE";
    await persistStatus(clientState, connectedPhone);
  });

  clientInstance.on("disconnected", async () => {
    clientState = "DISCONNECTED";
    latestQrDataUrl = null;
    await persistStatus(clientState, connectedPhone);
  });

  return clientInstance;
};

const initWhatsApp = async () => {
  const client = ensureClient();
  if (clientState === "READY") {
    return client;
  }
  if (isInitializing || ["CONNECTING", "QR", "AUTHENTICATED"].includes(clientState)) {
    return client;
  }
  if (clientState === "DISCONNECTED") {
    clientState = "CONNECTING";
  }
  await persistStatus(clientState, connectedPhone);
  isInitializing = true;
  try {
    await client.initialize();
  } catch (err) {
    clientState = "DISCONNECTED";
    latestQrDataUrl = null;
    await persistStatus(clientState, connectedPhone);
    throw err;
  } finally {
    isInitializing = false;
  }
  return client;
};

const stopWhatsApp = async () => {
  if (!clientInstance) {
    return;
  }
  try {
    await clientInstance.destroy();
  } catch (err) {
    console.error("Gagal stop WhatsApp client:", err.message);
  } finally {
    clientInstance = null;
    clientState = "DISCONNECTED";
    latestQrDataUrl = null;
    connectedPhone = null;
    await persistStatus(clientState, connectedPhone);
  }
};

const resetSession = async () => {
  await stopWhatsApp();
  const authRoot = resolveAuthPath();
  const sessionPath = path.join(authRoot, "session-portal-rt");
  try {
    await removeDirWithRetry(sessionPath, 5);
  } catch (err) {
    console.error("Gagal hapus sesi WA:", err.message);
  }
};

const getWaStatus = async () => {
  return {
    state: clientState,
    phone: connectedPhone,
    qrDataUrl: latestQrDataUrl
  };
};

const sendMessage = async (toPhone, message) => {
  const client = ensureClient();
  if (clientState !== "READY") {
    throw new Error("WA client belum siap");
  }
  const waId = toWhatsAppId(toPhone);
  if (!waId) {
    throw new Error("Nomor WA tidak valid");
  }
  const result = await client.sendMessage(waId, message, { sendSeen: false });
  return result;
};

module.exports = {
  initWhatsApp,
  stopWhatsApp,
  getWaStatus,
  sendMessage,
  normalizePhone,
  resetSession,
  toWhatsAppId,
  isRegisteredUser: async (phone) => {
    const client = ensureClient();
    if (clientState !== "READY") {
      throw new Error("WA client belum siap");
    }
    const waId = toWhatsAppId(phone);
    if (!waId) {
      return false;
    }
    return client.isRegisteredUser(waId);
  }
};
