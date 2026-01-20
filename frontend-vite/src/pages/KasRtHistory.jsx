import { useEffect, useState } from "react";
import { apiRequest } from "../utils/api.js";

const KasRtHistory = () => {
  const [items, setItems] = useState([]);
  const [period, setPeriod] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const limit = 10;

  const loadHistory = async () => {
    setError("");
    try {
      const query = `?page=${page}&limit=${limit}${period ? `&period=${period}` : ""}`;
      const data = await apiRequest(`/kas-rt/charges${query}`, { auth: true });
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message || "Gagal memuat history auto-debit.");
    }
  };

  useEffect(() => {
    loadHistory();
  }, [page, period]);

  const totalPages = Math.max(Math.ceil(total / limit), 1);

  return (
    <div className="stack gap-lg">
      <div className="card">
        <h2>History Auto-debit Kas RT</h2>
        <p className="muted">Daftar penarikan kas RT yang lebih lengkap.</p>
      </div>

      <div className="card">
        <div className="section-header">
          <div>
            <h3>Daftar Auto-debit</h3>
            <p className="muted">Gunakan filter periode dan pagination.</p>
          </div>
          <input
            type="month"
            className="form-control"
            value={period}
            onChange={(event) => {
              setPeriod(event.target.value);
              setPage(1);
            }}
          />
        </div>
        {error ? <div className="alert error">{error}</div> : null}
        <table className="table">
          <thead>
            <tr>
              <th>Periode</th>
              <th>Warga</th>
              <th>Nominal</th>
              <th>Status</th>
              <th>Tanggal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.period}</td>
                <td>{item.fullName}</td>
                <td>Rp {Number(item.amount).toLocaleString("id-ID")}</td>
                <td>{item.status}</td>
                <td>{new Date(item.createdAt).toLocaleString("id-ID")}</td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  Belum ada data.
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

export default KasRtHistory;
