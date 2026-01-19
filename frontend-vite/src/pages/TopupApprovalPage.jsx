import { useEffect, useState } from "react";
import { apiRequest } from "../utils/api.js";

const TopupApprovalPage = () => {
  const [items, setItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [error, setError] = useState("");

  const loadData = async (status) => {
    setError("");
    try {
      const data = await apiRequest(`/wallet/topups?status=${status}`, {
        auth: true
      });
      setItems(data);
    } catch (err) {
      setError(err.message || "Gagal memuat topup");
    }
  };

  useEffect(() => {
    loadData(statusFilter);
  }, [statusFilter]);

  const handleAction = async (id, action) => {
    setError("");
    try {
      await apiRequest(`/wallet/topup/${id}/${action}`, {
        method: "POST",
        auth: true
      });
      loadData(statusFilter);
    } catch (err) {
      setError(err.message || "Gagal memproses topup");
    }
  };

  return (
    <div className="stack gap-lg">
      <div className="card">
        <h2>Approval Topup</h2>
        <div className="chip-group">
          {["PENDING", "APPROVED", "REJECTED"].map((status) => (
            <button
              key={status}
              type="button"
              className={`chip ${statusFilter === status ? "active" : ""}`}
              onClick={() => setStatusFilter(status)}
            >
              {status}
            </button>
          ))}
        </div>
      </div>
      {error ? <div className="alert error">{error}</div> : null}
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Nama</th>
              <th>No HP</th>
              <th>Nominal</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.full_name}</td>
                <td>{item.phone || "-"}</td>
                <td>Rp {Number(item.amount).toLocaleString("id-ID")}</td>
                <td>{item.status}</td>
                <td>
                  {item.status === "PENDING" ? (
                    <div className="actions">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handleAction(item.id, "approve")}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => handleAction(item.id, "reject")}
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    "-"
                  )}
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
      </div>
    </div>
  );
};

export default TopupApprovalPage;

