import { useEffect, useRef, useState } from "react";
import { apiRequest, uploadDocument, resolveApiUrl, openDocument } from "../utils/api.js";

const emptyMember = () => ({
  fullName: "",
  relationship: "",
  birthDate: "",
  isLivingHere: true,
});

const ProfileComplete = () => {
  const [kkNumber, setKkNumber] = useState("");
  const [kkAddress, setKkAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [ktpUrl, setKtpUrl] = useState("");
  const [kkUrl, setKkUrl] = useState("");
  const [ktpName, setKtpName] = useState("");
  const [kkName, setKkName] = useState("");
  const [ktpId, setKtpId] = useState("");
  const [kkId, setKkId] = useState("");
  const [ktpFile, setKtpFile] = useState(null);
  const [kkFile, setKkFile] = useState(null);
  const [showKtpUpload, setShowKtpUpload] = useState(false);
  const [showKkUpload, setShowKkUpload] = useState(false);
  const [familyMembers, setFamilyMembers] = useState([emptyMember()]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const ktpInputRef = useRef(null);
  const kkInputRef = useRef(null);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await apiRequest("/me/profile", { auth: true });
        if (data.familyCard) {
          setKkNumber(data.familyCard.kkNumber || "");
          setKkAddress(data.familyCard.address || "");
          setNotes(data.familyCard.notes || "");
        }
        if (Array.isArray(data.familyMembers) && data.familyMembers.length > 0) {
          const mappedMembers = data.familyMembers.map((member) => ({
            ...member,
            birthDate: member.birthDate ? String(member.birthDate).slice(0, 10) : ""
          }));
          setFamilyMembers(mappedMembers);
        }
        if (Array.isArray(data.documents)) {
          const ktp = data.documents.find((doc) => doc.type === "KTP");
          const kk = data.documents.find((doc) => doc.type === "KK");
          setKtpUrl(ktp ? resolveApiUrl(ktp.downloadUrl) : "");
          setKkUrl(kk ? resolveApiUrl(kk.downloadUrl) : "");
          setKtpName(ktp ? ktp.originalName || "" : "");
          setKkName(kk ? kk.originalName || "" : "");
          setKtpId(ktp ? ktp.id : "");
          setKkId(kk ? kk.id : "");
        }
      } catch (err) {
        if (err.message !== "Profil warga tidak ditemukan") {
          setError(err.message || "Gagal memuat profil");
        }
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const updateMember = (index, field, value) => {
    const updated = [...familyMembers];
    updated[index] = { ...updated[index], [field]: value };
    setFamilyMembers(updated);
  };

  const addMember = () => {
    setFamilyMembers([...familyMembers, emptyMember()]);
  };

  const removeMember = (index) => {
    const updated = familyMembers.filter((_, idx) => idx !== index);
    setFamilyMembers(updated.length ? updated : [emptyMember()]);
  };

  const handleSubmit = async () => {
    setError("");
    setSuccess("");
    const filteredMembers = familyMembers.filter(
      (member) => member.fullName && member.relationship
    );

    if (!kkNumber || !kkAddress || filteredMembers.length === 0) {
      setError("Lengkapi nomor KK, alamat KK, dan minimal 1 anggota keluarga.");
      return;
    }

    setSaving(true);
    try {
      let nextKtpUrl = ktpUrl;
      let nextKkUrl = kkUrl;

      if (ktpFile && ktpFile.size > 5 * 1024 * 1024) {
        throw new Error("Ukuran file KTP melebihi 5MB.");
      }
      if (kkFile && kkFile.size > 5 * 1024 * 1024) {
        throw new Error("Ukuran file KK melebihi 5MB.");
      }

      if (ktpFile) {
        const result = await uploadDocument("KTP", ktpFile);
        nextKtpUrl = resolveApiUrl(result.downloadUrl);
        setKtpName(result.originalName || ktpFile.name);
        setKtpId(result.id);
      }
      if (kkFile) {
        const result = await uploadDocument("KK", kkFile);
        nextKkUrl = resolveApiUrl(result.downloadUrl);
        setKkName(result.originalName || kkFile.name);
        setKkId(result.id);
      }

      if (!nextKtpUrl || !nextKkUrl) {
        throw new Error("Dokumen KTP dan KK wajib diupload.");
      }

      await apiRequest("/me/profile", {
        method: "PUT",
        auth: true,
        body: JSON.stringify({
          familyCard: {
            kkNumber,
            address: kkAddress,
            notes,
          },
          familyMembers: filteredMembers,
        }),
      });
      setKtpUrl(nextKtpUrl);
      setKkUrl(nextKkUrl);
      setKtpFile(null);
      setKkFile(null);
      setShowKtpUpload(false);
      setShowKkUpload(false);
      setSuccess("Profil berhasil disimpan.");
    } catch (err) {
      setError(err.message || "Gagal menyimpan profil");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="stack gap-lg">
      <div className="card">
        <h2>Lengkapi Profil</h2>
        <p className="muted">
          Isi data KK, anggota keluarga, dan dokumen agar proses verifikasi lebih cepat.
        </p>
        {loading ? <p>Memuat profil...</p> : null}
      </div>

      <div className="card">
        <h3>Data KK</h3>
        <div className="grid-2">
          <label>
            Nomor KK
            <input
              type="text"
              value={kkNumber}
              onChange={(event) => setKkNumber(event.target.value)}
            />
          </label>
          <label>
            Alamat KK
            <input
              type="text"
              value={kkAddress}
              onChange={(event) => setKkAddress(event.target.value)}
            />
          </label>
        </div>
        <label>
          Catatan
          <input
            type="text"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
      </div>

      <div className="card">
        <div className="section-header">
          <h3>Anggota Keluarga</h3>
          <button type="button" className="button ghost" onClick={addMember}>
            Tambah anggota
          </button>
        </div>
        {familyMembers.map((member, index) => (
          <div className="member-row" key={`member-${index}`}>
            <input
              type="text"
              placeholder="Nama anggota"
              value={member.fullName}
              onChange={(event) => updateMember(index, "fullName", event.target.value)}
              autoComplete="off"
            />
            <input
              type="text"
              placeholder="Hubungan"
              value={member.relationship}
              onChange={(event) => updateMember(index, "relationship", event.target.value)}
              autoComplete="off"
            />
            <input
              type="date"
              placeholder="Tanggal lahir"
              value={member.birthDate || ""}
              onChange={(event) => updateMember(index, "birthDate", event.target.value)}
            />
            <button
              type="button"
              className="icon-button danger"
              aria-label="Hapus anggota"
              onClick={() => removeMember(index)}
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  d="M6 6l12 12M18 6l-12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>Dokumen</h3>
        <div className="doc-grid">
          <div className="doc-item">
            <div className="doc-header">
              <strong>KTP</strong>
              {ktpId ? (
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Ubah dokumen KTP"
                  onClick={() => {
                    setShowKtpUpload(true);
                    ktpInputRef.current?.click();
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path
                      d="M4 20h4l10-10-4-4L4 16v4zM14 6l4 4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              ) : null}
            </div>
            {ktpName ? <div className="muted">{ktpName}</div> : null}
            {ktpId ? (
              <button
                type="button"
                className="link"
                onClick={() => openDocument(ktpId)}
              >
                Lihat dokumen
              </button>
            ) : (
              <span className="muted">Belum ada dokumen KTP</span>
            )}
            <input
              ref={ktpInputRef}
              className={`file-input ${ktpId && !showKtpUpload ? "hidden" : ""}`}
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={(event) => {
                const file = event.target.files?.[0] || null;
                setKtpFile(file);
                setKtpName(file ? file.name : ktpName);
              }}
            />
          </div>

          <div className="doc-item">
            <div className="doc-header">
              <strong>KK</strong>
              {kkId ? (
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Ubah dokumen KK"
                  onClick={() => {
                    setShowKkUpload(true);
                    kkInputRef.current?.click();
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <path
                      d="M4 20h4l10-10-4-4L4 16v4zM14 6l4 4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              ) : null}
            </div>
            {kkName ? <div className="muted">{kkName}</div> : null}
            {kkId ? (
              <button
                type="button"
                className="link"
                onClick={() => openDocument(kkId)}
              >
                Lihat dokumen
              </button>
            ) : (
              <span className="muted">Belum ada dokumen KK</span>
            )}
            <input
              ref={kkInputRef}
              className={`file-input ${kkId && !showKkUpload ? "hidden" : ""}`}
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={(event) => {
                const file = event.target.files?.[0] || null;
                setKkFile(file);
                setKkName(file ? file.name : kkName);
              }}
            />
          </div>
        </div>
      </div>

      {error ? <div className="alert error">{error}</div> : null}
      {success ? <div className="alert success">{success}</div> : null}

      <div className="actions">
        <button className="button" type="button" onClick={handleSubmit} disabled={saving}>
          {saving ? "Menyimpan..." : "Simpan profil"}
        </button>
      </div>
    </div>
  );
};

export default ProfileComplete;
