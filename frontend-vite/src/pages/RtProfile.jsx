import { useEffect, useState } from "react";
import { apiRequest } from "../utils/api.js";

const RtProfile = () => {
  const [rt, setRt] = useState(null);
  const [name, setName] = useState("");
  const [rw, setRw] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const loadRt = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await apiRequest("/rt/me", { auth: true });
        setRt(data);
        setName(data.name || "");
        setRw(data.rw || "");
        setAddress(data.address || "");
      } catch (err) {
        setError(err.message || "Gagal memuat profil RT");
      } finally {
        setLoading(false);
      }
    };

    loadRt();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const updated = await apiRequest("/rt/me", {
        method: "PUT",
        auth: true,
        body: JSON.stringify({ name, rw, address }),
      });
      setRt(updated);
      setSuccess("Profil RT berhasil diperbarui.");
    } catch (err) {
      setError(err.message || "Gagal menyimpan profil RT");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="stack gap-lg">
      <div className="card">
        <h2>Profil RT</h2>
        <p className="muted">Perbarui informasi dasar RT kamu.</p>
        {loading ? <p>Memuat...</p> : null}
      </div>

      <div className="card">
        <div className="grid-2">
          <label>
            Nama RT
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            RW
            <input
              type="text"
              value={rw}
              onChange={(event) => setRw(event.target.value)}
            />
          </label>
        </div>
        <label>
          Alamat RT
          <input
            type="text"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
        </label>
        {rt ? (
          <p className="muted">Status: {rt.status}</p>
        ) : null}
      </div>

      {error ? <div className="alert error">{error}</div> : null}
      {success ? <div className="alert success">{success}</div> : null}

      <div className="actions">
        <button className="button" type="button" onClick={handleSave} disabled={saving}>
          {saving ? "Menyimpan..." : "Simpan perubahan"}
        </button>
      </div>
    </div>
  );
};

export default RtProfile;
