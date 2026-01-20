import { useEffect, useState } from "react";
import { apiRequest } from "../utils/api.js";

const FeeBillingsAdmin = () => {
  const [billings, setBillings] = useState([]);
  const [status, setStatus] = useState("ALL");
  const [error, setError] = useState("");

  const loadBillings = async () => {
    setError("");
    try {
      const query = status === "ALL" ? "" : `?status=${status}`;
      const data = await apiRequest(`/fees/billings${query}`, { auth: true });
      setBillings(data);
    } catch (err) {
      setError(err.message || "Gagal memuat billing iuran.");
    }
  };

  useEffect(() => {
    loadBillings();
  }, [status]);

  return (
    <div className="stack gap-lg">
      <div className="card">
        <h2>Billing Iuran</h2>
        <p className="muted">Monitor semua tagihan iuran warga.</p>
      </div>

      <div className="card">
        <div className="section-header">
          <div>
            <h3>Daftar Billing</h3>
            <p className="muted">Filter status billing.</p>
          </div>
          <select
            className="form-select"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="ALL">Semua</option>
            <option value="UNPAID">UNPAID</option>
            <option value="PAID">PAID</option>
          </select>
        </div>
        {error ? <div className="alert error">{error}</div> : null}
        <table className="table">
          <thead>
            <tr>
              <th>Warga</th>
              <th>Campaign</th>
              <th>Periode</th>
              <th>Nominal</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {billings.map((item) => (
              <tr key={item.id}>
                <td>{item.full_name}</td>
                <td>{item.campaign_name}</td>
                <td>{item.period || "-"}</td>
                <td>
                  {item.amount_type === "FLEXIBLE"
                    ? "Seikhlasnya"
                    : `Rp ${Number(item.amount).toLocaleString("id-ID")}`}
                </td>
                <td>{item.status}</td>
              </tr>
            ))}
            {billings.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  Tidak ada data.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FeeBillingsAdmin;
