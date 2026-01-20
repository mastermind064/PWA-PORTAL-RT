import { useEffect, useState } from "react";
import { apiRequest, openFeeProof } from "../utils/api.js";

const FeeBillingHistory = () => {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const limit = 10;

  const loadHistory = async () => {
    setError("");
    try {
      const statusQuery = status === "ALL" ? "" : `&status=${status}`;
      const data = await apiRequest(
        `/fees/payments/me?page=${page}&limit=${limit}${statusQuery}`,
        { auth: true }
      );
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message || "Gagal memuat history iuran.");
    }
  };

  useEffect(() => {
    loadHistory();
  }, [status, page]);

  const totalPages = Math.max(Math.ceil(total / limit), 1);

  return (
    <div className="stack gap-lg">
      <div className="card">
        <h2>History Tagihan Iuran</h2>
        <p className="muted">Riwayat pembayaran iuran yang sudah kamu kirim.</p>
      </div>

      <div className="card">
        <div className="section-header">
          <div>
            <h3>Daftar History</h3>
            <p className="muted">Filter berdasarkan status pembayaran.</p>
          </div>
          <select
            className="form-select"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">Semua</option>
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>
        {error ? <div className="alert error">{error}</div> : null}
        <table className="table">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Campaign</th>
              <th>Nominal</th>
              <th>Status</th>
              <th>Bukti</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{new Date(item.created_at).toLocaleDateString("id-ID")}</td>
                <td>{item.campaign_name}</td>
                <td>Rp {Number(item.amount).toLocaleString("id-ID")}</td>
                <td>{item.status}</td>
                <td>
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => openFeeProof(item.id)}
                  >
                    Lihat
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  Tidak ada data.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <div className="pagination">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            disabled={page <= 1}
          >
            Prev
          </button>
          <span className="muted">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={page >= totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeeBillingHistory;
