const fs = require("fs");
const path = require("path");
require("dotenv").config();
const db = require("../src/db");

const dataPath = path.join(__dirname, "..", "data", "db.json");

const readJson = () => {
  if (!fs.existsSync(dataPath)) {
    throw new Error("db.json tidak ditemukan");
  }
  const raw = fs.readFileSync(dataPath, "utf8");
  return JSON.parse(raw);
};

const toDate = (value) => (value ? new Date(value) : new Date());

const mapPayload = (payload) => {
  if (!payload) return "{}";
  if (typeof payload === "string") return payload;
  return JSON.stringify(payload);
};

const migrate = async () => {
  const data = readJson();
  console.log("Mulai migrasi dari db.json...");

  await db.transaction(async (conn) => {
    if (Array.isArray(data.rts)) {
      for (const rt of data.rts) {
        await conn.query(
          `INSERT IGNORE INTO rt (id, name, rw, address, status, invite_code, created_at, updated_at)
           VALUES (:id, :name, :rw, :address, :status, :invite_code, :created_at, :updated_at)`,
          {
            id: rt.id,
            name: rt.name,
            rw: rt.rw || null,
            address: rt.address || null,
            status: rt.status || "PENDING_APPROVAL",
            invite_code: rt.inviteCode || null,
            created_at: toDate(rt.createdAt),
            updated_at: toDate(rt.updatedAt)
          }
        );
      }
    }

    if (Array.isArray(data.users)) {
      for (const user of data.users) {
        await conn.query(
          `INSERT IGNORE INTO users (id, email, phone, password_hash, role, status, created_at, updated_at)
           VALUES (:id, :email, :phone, :password_hash, :role, :status, :created_at, :updated_at)`,
          {
            id: user.id,
            email: user.email,
            phone: user.phone || null,
            password_hash: user.passwordHash,
            role: user.role,
            status: user.status,
            created_at: toDate(user.createdAt),
            updated_at: toDate(user.updatedAt)
          }
        );
      }
    }

    if (Array.isArray(data.userRt)) {
      for (const membership of data.userRt) {
        await conn.query(
          `INSERT IGNORE INTO user_rt (id, user_id, rt_id, role, status, created_at, updated_at)
           VALUES (:id, :user_id, :rt_id, :role, :status, :created_at, :updated_at)`,
          {
            id: membership.id,
            user_id: membership.userId,
            rt_id: membership.rtId,
            role: membership.role,
            status: membership.status,
            created_at: toDate(membership.createdAt),
            updated_at: toDate(membership.updatedAt)
          }
        );
      }
    }

    if (Array.isArray(data.residents)) {
      for (const resident of data.residents) {
        await conn.query(
          `INSERT IGNORE INTO resident
           (id, rt_id, user_id, full_name, phone, address, approval_status, created_at, updated_at)
           VALUES (:id, :rt_id, :user_id, :full_name, :phone, :address, :approval_status, :created_at, :updated_at)`,
          {
            id: resident.id,
            rt_id: resident.rtId,
            user_id: resident.userId || null,
            full_name: resident.fullName,
            phone: resident.phone || null,
            address: resident.address || null,
            approval_status: resident.approvalStatus || "PENDING",
            created_at: toDate(resident.createdAt),
            updated_at: toDate(resident.updatedAt)
          }
        );
      }
    }

    if (Array.isArray(data.familyCards)) {
      for (const card of data.familyCards) {
        await conn.query(
          `INSERT IGNORE INTO family_card
           (id, rt_id, resident_id, kk_number, address, notes, created_at, updated_at)
           VALUES (:id, :rt_id, :resident_id, :kk_number, :address, :notes, :created_at, :updated_at)`,
          {
            id: card.id,
            rt_id: card.rtId,
            resident_id: card.residentId,
            kk_number: card.kkNumber || null,
            address: card.address || null,
            notes: card.notes || null,
            created_at: toDate(card.createdAt),
            updated_at: toDate(card.updatedAt)
          }
        );
      }
    }

    if (Array.isArray(data.familyMembers)) {
      for (const member of data.familyMembers) {
        await conn.query(
          `INSERT IGNORE INTO family_member
           (id, rt_id, family_card_id, full_name, relationship, birth_date, is_living_here, created_at, updated_at)
           VALUES (:id, :rt_id, :family_card_id, :full_name, :relationship, :birth_date, :is_living_here, :created_at, :updated_at)`,
          {
            id: member.id,
            rt_id: member.rtId,
            family_card_id: member.familyCardId,
            full_name: member.fullName,
            relationship: member.relationship,
            birth_date: member.birthDate || null,
            is_living_here: member.isLivingHere === false ? 0 : 1,
            created_at: toDate(member.createdAt),
            updated_at: toDate(member.updatedAt)
          }
        );
      }
    }

    if (Array.isArray(data.residentDocuments)) {
      for (const doc of data.residentDocuments) {
        await conn.query(
          `INSERT IGNORE INTO resident_document
           (id, rt_id, resident_id, type, storage_path, original_name, mime_type, size, uploaded_at, created_at, updated_at)
           VALUES (:id, :rt_id, :resident_id, :type, :storage_path, :original_name, :mime_type, :size, :uploaded_at, :created_at, :updated_at)`,
          {
            id: doc.id,
            rt_id: doc.rtId,
            resident_id: doc.residentId,
            type: doc.type,
            storage_path: doc.storagePath || doc.fileUrl || "",
            original_name: doc.originalName || path.basename(doc.fileUrl || "dokumen"),
            mime_type: doc.mimeType || "application/octet-stream",
            size: doc.size || 0,
            uploaded_at: toDate(doc.uploadedAt),
            created_at: toDate(doc.createdAt),
            updated_at: toDate(doc.updatedAt)
          }
        );
      }
    }

    if (Array.isArray(data.refreshTokens)) {
      for (const token of data.refreshTokens) {
        await conn.query(
          `INSERT IGNORE INTO refresh_token (id, user_id, expires_at, created_at)
           VALUES (:id, :user_id, :expires_at, :created_at)`,
          {
            id: token.id,
            user_id: token.userId,
            expires_at: toDate(token.expiresAt),
            created_at: toDate(token.createdAt)
          }
        );
      }
    }

    if (Array.isArray(data.auditLogs)) {
      for (const log of data.auditLogs) {
        await conn.query(
          `INSERT IGNORE INTO audit_log (id, rt_id, actor_user_id, action, metadata_json, created_at)
           VALUES (:id, :rt_id, :actor_user_id, :action, :metadata_json, :created_at)`,
          {
            id: log.id,
            rt_id: log.rtId || null,
            actor_user_id: log.actorUserId,
            action: log.action,
            metadata_json: mapPayload(log.payloadJson || log.metadata),
            created_at: toDate(log.createdAt)
          }
        );
      }
    }

    if (Array.isArray(data.notificationOutbox)) {
      for (const item of data.notificationOutbox) {
        await conn.query(
          `INSERT IGNORE INTO notification_outbox
           (id, rt_id, channel, to_phone, template_key, payload, status, retry_count, created_at, updated_at)
           VALUES (:id, :rt_id, :channel, :to_phone, :template_key, :payload, :status, :retry_count, :created_at, :updated_at)`,
          {
            id: item.id,
            rt_id: item.rtId,
            channel: item.channel || "WHATSAPP",
            to_phone: item.toPhone || "",
            template_key: item.templateKey,
            payload: mapPayload(item.payloadJson || item.payload),
            status: item.status || "PENDING",
            retry_count: item.retryCount || 0,
            created_at: toDate(item.createdAt),
            updated_at: toDate(item.updatedAt)
          }
        );
      }
    }
  });

  console.log("Migrasi selesai.");
};

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migrasi gagal:", err);
    process.exit(1);
  });
