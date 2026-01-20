import { useEffect, useState } from "react";
import { apiRequest } from "../utils/api.js";

const FeeBillings = () => {
  const [billings, setBillings] = useState([]);
  const [status, setStatus] = useState("UNPAID");
  const [files, setFiles] = useState({});
  const [amounts, setAmounts] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadBillings = async () => {
    setError("");
    try {
      const data = await apiRequest(`/fees/billings/me?status=${status}`, {
        auth: true
      });
      setBillings(data);
    } catch (err) {
      setError(err.message || "Gagal memuat tagihan.");
    }
  };

  useEffect(() => {
    loadBillings();
  }, [status]);

  const handleUpload = async (billingId) => {
    setError("");
    setSuccess("");
    const file = files[billingId];
    if (!file) {
      setError("Bukti pembayaran wajib diupload.");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    if (amounts[billingId]) {
      formData.append("amount", amounts[billingId]);
    }

    try {
      const token = window.localStorage.getItem("accessToken");
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"}/fees/billings/${billingId}/payments`,
        {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData
        }
      );
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || "Gagal mengirim bukti.");
      }
      setSuccess("Bukti pembayaran berhasil dikirim.");
      setFiles((prev) => ({ ...prev, [billingId]: null }));
      await loadBillings();
    } catch (err) {
      setError(err.message || "Gagal mengirim bukti.");
    }
  };

  return (
    <div className="stack gap-lg">
      <div className="card">
        <h2>Tagihan Iuran</h2>
        <p className="muted">Upload bukti pembayaran iuran warga.</p>
      </div>

      <div className="card">
        <div className="section-header">
          <div>
            <h3>Daftar Tagihan</h3>
            <p className="muted">Status tagihan iuran kamu.</p>
          </div>
          <select
            className="form-select"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="UNPAID">UNPAID</option>
            <option value="PAID">PAID</option>
          </select>
        </div>
        {error ? <div className="alert error">{error}</div> : null}
        {success ? <div className="alert success">{success}</div> : null}
        <table className="table">
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Periode</th>
              <th>Nominal</th>
              <th>Status</th>
              <th>Bukti</th>
            </tr>
          </thead>
          <tbody>
            {billings.map((item) => (
              <tr key={item.id}>
                <td>{item.campaign_name}</td>
                <td>{item.period || "-"}</td>
                <td>
                  {item.amount_type === "FLEXIBLE" ? (
                    <div className="d-flex align-items-center gap-2">
                      <span>Seikhlasnya</span>
                      <input
                        className="form-control"
                        type="number"
                        min="1"
                        placeholder="Nominal"
                        value={amounts[item.id] || ""}
                        onChange={(event) =>
                          setAmounts({ ...amounts, [item.id]: event.target.value })
                        }
                      />
                    </div>
                  ) : (
                    `Rp ${Number(item.amount).toLocaleString("id-ID")}`
                  )}
                </td>
                <td>{item.status}</td>
                <td>
                  {item.status === "UNPAID" ? (
                    <div className="d-flex align-items-center gap-2">
                      <input
                        className="form-control"
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={(event) =>
                          setFiles({
                            ...files,
                            [item.id]: event.target.files?.[0] || null
                          })
                        }
                      />
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => handleUpload(item.id)}
                      >
                        Kirim
                      </button>
                    </div>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
            {billings.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  Tidak ada tagihan.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FeeBillings;
