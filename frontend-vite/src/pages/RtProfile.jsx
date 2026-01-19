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
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label" htmlFor="rt-name">
                Nama RT
              </label>
              <input
                id="rt-name"
                className="form-control"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="rt-rw">
                RW
              </label>
              <input
                id="rt-rw"
                className="form-control"
                type="text"
                value={rw}
                onChange={(event) => setRw(event.target.value)}
              />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="rt-address">
                Alamat RT
              </label>
              <input
                id="rt-address"
                className="form-control"
                type="text"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
              />
            </div>
          </div>
          {rt ? (
            <div className="mt-3 text-muted">
              Status: {rt.status}
            </div>
          ) : null}
        </div>
      </div>

      {error ? <div className="alert error">{error}</div> : null}
      {success ? <div className="alert success">{success}</div> : null}

      <div className="actions">
        <button className="btn btn-primary" type="button" onClick={handleSave} disabled={saving}>
          {saving ? "Menyimpan..." : "Simpan perubahan"}
        </button>
      </div>
    </div>
  );
};

export default RtProfile;

