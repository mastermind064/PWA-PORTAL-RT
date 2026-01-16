const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");
const db = require("../db");
const { resolveStoragePath } = require("./localStorageService");

const buildDocumentUrl = (documentId) => {
  const base = process.env.PUBLIC_BASE_URL || "";
  return `${base}/documents/${documentId}`;
};

const registerResident = async (payload) => {
  const {
    inviteCode,
    fullName,
    phone,
    address,
    email,
    password
  } = payload;

  if (!inviteCode || !fullName || !email || !password) {
    const error = new Error("Field wajib belum lengkap");
    error.status = 400;
    throw error;
  }

  const [rtRows] = await db.query(
    `SELECT * FROM rt WHERE invite_code = :invite_code AND status = 'ACTIVE' LIMIT 1`,
    { invite_code: inviteCode }
  );
  if (rtRows.length === 0) {
    const error = new Error("RT tidak ditemukan atau belum aktif");
    error.status = 404;
    throw error;
  }
  const rt = rtRows[0];

  const [emailRows] = await db.query(
    "SELECT id FROM users WHERE email = :email LIMIT 1",
    { email }
  );
  if (emailRows.length > 0) {
    const error = new Error("Email sudah terdaftar");
    error.status = 409;
    throw error;
  }

  const userId = uuidv4();
  const residentId = uuidv4();
  const now = new Date();

  await db.transaction(async (conn) => {
    await conn.query(
      `INSERT INTO users (id, email, phone, password_hash, role, status, created_at)
       VALUES (:id, :email, :phone, :password_hash, :role, :status, :created_at)`,
      {
        id: userId,
        email,
        phone: phone || null,
        password_hash: payload.passwordHash,
        role: "WARGA",
        status: "PENDING",
        created_at: now
      }
    );

    await conn.query(
      `INSERT INTO user_rt (id, user_id, rt_id, role, status, created_at)
       VALUES (:id, :user_id, :rt_id, :role, :status, :created_at)`,
      {
        id: uuidv4(),
        user_id: userId,
        rt_id: rt.id,
        role: "WARGA",
        status: "PENDING",
        created_at: now
      }
    );

    await conn.query(
      `INSERT INTO resident (id, rt_id, user_id, full_name, phone, address, approval_status, created_at)
       VALUES (:id, :rt_id, :user_id, :full_name, :phone, :address, :approval_status, :created_at)`,
      {
        id: residentId,
        rt_id: rt.id,
        user_id: userId,
        full_name: fullName,
        phone: phone || null,
        address: address || null,
        approval_status: "PENDING",
        created_at: now
      }
    );

    await conn.query(
      `INSERT INTO notification_outbox (id, rt_id, channel, to_phone, template_key, payload, status, retry_count, created_at)
       VALUES (:id, :rt_id, :channel, :to_phone, :template_key, :payload, :status, :retry_count, :created_at)`,
      {
        id: uuidv4(),
        rt_id: rt.id,
        channel: "WHATSAPP",
        to_phone: phone || "",
        template_key: "RESIDENT_REGISTERED",
        payload: JSON.stringify({ residentName: fullName }),
        status: "PENDING",
        retry_count: 0,
        created_at: now
      }
    );
  });

  return { residentId, status: "PENDING" };
};

const listResidents = async (rtId, status) => {
  const [rows] = status
    ? await db.query(
        "SELECT * FROM resident WHERE rt_id = :rt_id AND approval_status = :status",
        { rt_id: rtId, status }
      )
    : await db.query("SELECT * FROM resident WHERE rt_id = :rt_id", {
        rt_id: rtId
      });
  return rows.map((row) => ({
    id: row.id,
    rtId: row.rt_id,
    userId: row.user_id,
    fullName: row.full_name,
    phone: row.phone,
    address: row.address,
    approvalStatus: row.approval_status,
    createdAt: row.created_at
  }));
};

const getResidentDetail = async (rtId, residentId) => {
  const [resRows] = await db.query(
    "SELECT * FROM resident WHERE id = :id AND rt_id = :rt_id LIMIT 1",
    { id: residentId, rt_id: rtId }
  );
  if (resRows.length === 0) {
    const error = new Error("Warga tidak ditemukan");
    error.status = 404;
    throw error;
  }
  const resident = resRows[0];
  const [cardRows] = await db.query(
    "SELECT * FROM family_card WHERE resident_id = :resident_id AND rt_id = :rt_id LIMIT 1",
    { resident_id: residentId, rt_id: rtId }
  );
  const familyCard = cardRows[0] || null;
  const [memberRows] = familyCard
    ? await db.query(
        "SELECT * FROM family_member WHERE family_card_id = :family_card_id",
        { family_card_id: familyCard.id }
      )
    : [[]];
  const [docRows] = await db.query(
    "SELECT * FROM resident_document WHERE resident_id = :resident_id AND rt_id = :rt_id",
    { resident_id: residentId, rt_id: rtId }
  );

  return {
    resident: {
      id: resident.id,
      rtId: resident.rt_id,
      userId: resident.user_id,
      fullName: resident.full_name,
      phone: resident.phone,
      address: resident.address,
      approvalStatus: resident.approval_status,
      createdAt: resident.created_at
    },
    familyCard: familyCard
      ? {
          id: familyCard.id,
          kkNumber: familyCard.kk_number,
          address: familyCard.address,
          notes: familyCard.notes
        }
      : null,
    familyMembers: (memberRows || []).map((row) => ({
      id: row.id,
      fullName: row.full_name,
      relationship: row.relationship,
      birthDate: row.birth_date,
      isLivingHere: row.is_living_here === 1
    })),
    documents: docRows.map((doc) => ({
      id: doc.id,
      type: doc.type,
      downloadUrl: buildDocumentUrl(doc.id),
      originalName:
        doc.original_name || path.basename(doc.storage_path || "dokumen"),
      uploadedAt: doc.uploaded_at
    }))
  };
};

const getResidentByUser = async (rtId, userId) => {
  const [rows] = await db.query(
    "SELECT * FROM resident WHERE rt_id = :rt_id AND user_id = :user_id LIMIT 1",
    { rt_id: rtId, user_id: userId }
  );
  if (rows.length === 0) {
    const error = new Error("Profil warga tidak ditemukan");
    error.status = 404;
    throw error;
  }
  return rows[0];
};

const getResidentProfileByUser = async (rtId, userId) => {
  const resident = await getResidentByUser(rtId, userId);
  const [cardRows] = await db.query(
    "SELECT * FROM family_card WHERE resident_id = :resident_id AND rt_id = :rt_id LIMIT 1",
    { resident_id: resident.id, rt_id: rtId }
  );
  const familyCard = cardRows[0] || null;
  const [memberRows] = familyCard
    ? await db.query(
        "SELECT * FROM family_member WHERE family_card_id = :family_card_id",
        { family_card_id: familyCard.id }
      )
    : [[]];
  const [docRows] = await db.query(
    "SELECT * FROM resident_document WHERE resident_id = :resident_id AND rt_id = :rt_id",
    { resident_id: resident.id, rt_id: rtId }
  );
  return {
    resident: {
      id: resident.id,
      rtId: resident.rt_id,
      userId: resident.user_id,
      fullName: resident.full_name,
      phone: resident.phone,
      address: resident.address,
      approvalStatus: resident.approval_status,
      createdAt: resident.created_at
    },
    familyCard: familyCard
      ? {
          id: familyCard.id,
          kkNumber: familyCard.kk_number,
          address: familyCard.address,
          notes: familyCard.notes
        }
      : null,
    familyMembers: (memberRows || []).map((row) => ({
      id: row.id,
      fullName: row.full_name,
      relationship: row.relationship,
      birthDate: row.birth_date,
      isLivingHere: row.is_living_here === 1
    })),
    documents: docRows.map((doc) => ({
      id: doc.id,
      type: doc.type,
      downloadUrl: buildDocumentUrl(doc.id),
      originalName:
        doc.original_name || path.basename(doc.storage_path || "dokumen"),
      uploadedAt: doc.uploaded_at
    }))
  };
};

const saveResidentDocument = async (
  rtId,
  residentId,
  type,
  storagePath,
  originalName,
  mimeType,
  size
) => {
  const docId = uuidv4();
  const [existingRows] = await db.query(
    `SELECT id, storage_path FROM resident_document
     WHERE resident_id = :resident_id AND type = :type
     LIMIT 1`,
    { resident_id: residentId, type }
  );
  if (existingRows.length > 0) {
    await db.query(
      `DELETE FROM resident_document WHERE id = :id`,
      { id: existingRows[0].id }
    );
    if (existingRows[0].storage_path) {
      const filePath = resolveStoragePath(existingRows[0].storage_path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }
  await db.query(
    `INSERT INTO resident_document
     (id, rt_id, resident_id, type, storage_path, original_name, mime_type, size, uploaded_at, created_at)
     VALUES (:id, :rt_id, :resident_id, :type, :storage_path, :original_name, :mime_type, :size, :uploaded_at, :created_at)`,
    {
      id: docId,
      rt_id: rtId,
      resident_id: residentId,
      type,
      storage_path: storagePath,
      original_name: originalName,
      mime_type: mimeType,
      size,
      uploaded_at: new Date(),
      created_at: new Date()
    }
  );
  return {
    id: docId,
    type,
    downloadUrl: buildDocumentUrl(docId),
    originalName
  };
};

const updateResidentProfile = async (rtId, userId, payload) => {
  const { familyCard, familyMembers } = payload || {};
  if (!familyCard || !Array.isArray(familyMembers)) {
    const error = new Error("Data profil warga belum lengkap");
    error.status = 400;
    throw error;
  }

  const resident = await getResidentByUser(rtId, userId);

  await db.transaction(async (conn) => {
    const [cardRows] = await conn.query(
      "SELECT * FROM family_card WHERE resident_id = :resident_id AND rt_id = :rt_id LIMIT 1",
      { resident_id: resident.id, rt_id: rtId }
    );
    let cardId = cardRows.length > 0 ? cardRows[0].id : uuidv4();
    if (cardRows.length === 0) {
      await conn.query(
        `INSERT INTO family_card (id, rt_id, resident_id, kk_number, address, notes, created_at)
         VALUES (:id, :rt_id, :resident_id, :kk_number, :address, :notes, :created_at)`,
        {
          id: cardId,
          rt_id: rtId,
          resident_id: resident.id,
          kk_number: familyCard.kkNumber || null,
          address: familyCard.address || null,
          notes: familyCard.notes || null,
          created_at: new Date()
        }
      );
    } else {
      await conn.query(
        `UPDATE family_card
         SET kk_number = :kk_number,
             address = :address,
             notes = :notes,
             updated_at = :updated_at
         WHERE id = :id`,
        {
          id: cardId,
          kk_number: familyCard.kkNumber || null,
          address: familyCard.address || null,
          notes: familyCard.notes || null,
          updated_at: new Date()
        }
      );
    }

    await conn.query(
      "DELETE FROM family_member WHERE family_card_id = :family_card_id",
      { family_card_id: cardId }
    );

    for (const member of familyMembers) {
      await conn.query(
        `INSERT INTO family_member
         (id, rt_id, family_card_id, full_name, relationship, birth_date, is_living_here, created_at)
         VALUES (:id, :rt_id, :family_card_id, :full_name, :relationship, :birth_date, :is_living_here, :created_at)`,
        {
          id: uuidv4(),
          rt_id: rtId,
          family_card_id: cardId,
          full_name: member.fullName,
          relationship: member.relationship,
          birth_date: member.birthDate || null,
          is_living_here: member.isLivingHere !== false ? 1 : 0,
          created_at: new Date()
        }
      );
    }

    await conn.query(
      "UPDATE resident SET updated_at = :updated_at WHERE id = :id",
      { updated_at: new Date(), id: resident.id }
    );
  });

  return getResidentProfileByUser(rtId, userId);
};

const approveResident = async (rtId, residentId, actorUserId) => {
  const [rows] = await db.query(
    "SELECT * FROM resident WHERE id = :id AND rt_id = :rt_id LIMIT 1",
    { id: residentId, rt_id: rtId }
  );
  if (rows.length === 0) {
    const error = new Error("Warga tidak ditemukan");
    error.status = 404;
    throw error;
  }
  const resident = rows[0];
  if (resident.approval_status === "APPROVED") {
    const error = new Error("Warga sudah disetujui");
    error.status = 409;
    throw error;
  }

  await db.transaction(async (conn) => {
    await conn.query(
      "UPDATE resident SET approval_status = 'APPROVED' WHERE id = :id",
      { id: residentId }
    );
    await conn.query(
      "UPDATE user_rt SET status = 'ACTIVE' WHERE user_id = :user_id AND rt_id = :rt_id",
      { user_id: resident.user_id, rt_id: rtId }
    );
    await conn.query("UPDATE users SET status = 'ACTIVE' WHERE id = :id", {
      id: resident.user_id
    });
    await conn.query(
      `INSERT INTO audit_log (id, rt_id, actor_user_id, action, created_at)
       VALUES (:id, :rt_id, :actor_user_id, :action, :created_at)`,
      {
        id: uuidv4(),
        rt_id: rtId,
        actor_user_id: actorUserId,
        action: "RESIDENT_APPROVED",
        created_at: new Date()
      }
    );
  });

  return { status: "APPROVED" };
};

const rejectResident = async (rtId, residentId, actorUserId, reason) => {
  const [rows] = await db.query(
    "SELECT * FROM resident WHERE id = :id AND rt_id = :rt_id LIMIT 1",
    { id: residentId, rt_id: rtId }
  );
  if (rows.length === 0) {
    const error = new Error("Warga tidak ditemukan");
    error.status = 404;
    throw error;
  }
  const resident = rows[0];
  if (resident.approval_status === "REJECTED") {
    const error = new Error("Warga sudah ditolak");
    error.status = 409;
    throw error;
  }

  await db.transaction(async (conn) => {
    await conn.query(
      "UPDATE resident SET approval_status = 'REJECTED' WHERE id = :id",
      { id: residentId }
    );
    await conn.query(
      "UPDATE user_rt SET status = 'REJECTED' WHERE user_id = :user_id AND rt_id = :rt_id",
      { user_id: resident.user_id, rt_id: rtId }
    );
    await conn.query("UPDATE users SET status = 'REJECTED' WHERE id = :id", {
      id: resident.user_id
    });
    await conn.query(
      `INSERT INTO audit_log (id, rt_id, actor_user_id, action, created_at)
       VALUES (:id, :rt_id, :actor_user_id, :action, :created_at)`,
      {
        id: uuidv4(),
        rt_id: rtId,
        actor_user_id: actorUserId,
        action: "RESIDENT_REJECTED",
        created_at: new Date()
      }
    );
  });

  return { status: "REJECTED", reason: reason || null };
};

module.exports = {
  registerResident,
  listResidents,
  getResidentDetail,
  getResidentByUser,
  getResidentProfileByUser,
  saveResidentDocument,
  updateResidentProfile,
  approveResident,
  rejectResident
};
