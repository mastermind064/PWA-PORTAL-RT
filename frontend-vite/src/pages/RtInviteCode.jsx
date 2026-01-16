import { useEffect, useState } from "react";
import { apiRequest } from "../utils/api.js";

const RtInviteCode = () => {
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadProfile = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest("/rt/me", { auth: true });
      setInviteCode(data.inviteCode || "-");
    } catch (err) {
      setError(err.message || "Gagal memuat kode undangan");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleGenerate = async () => {
    setError("");
    setSuccess("");
    try {
      const data = await apiRequest("/rt/invite-code", {
        method: "POST",
        auth: true,
      });
      setInviteCode(data.inviteCode);
      setSuccess("Kode undangan berhasil dibuat.");
    } catch (err) {
      setError(err.message || "Gagal membuat kode undangan");
    }
  };

  return (
    <div className="stack gap-lg">
      <div className="card">
        <h2>Kode Undangan RT</h2>
        <p className="muted">Bagikan ke warga untuk registrasi.</p>
        {loading ? <p>Memuat...</p> : null}
      </div>

      <div className="card">
        <div className="invite-code">
          <span>{inviteCode}</span>
        </div>
        <button className="button" type="button" onClick={handleGenerate}>
          Generate kode baru
        </button>
      </div>

      {error ? <div className="alert error">{error}</div> : null}
      {success ? <div className="alert success">{success}</div> : null}
    </div>
  );
};

export default RtInviteCode;
