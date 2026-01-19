import { useEffect, useState } from "react";
import { apiRequest } from "../utils/api.js";

const SuperAdminApproval = () => {
  const [approvals, setApprovals] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setError("");
    setLoading(true);
    try {
      const data = await apiRequest("/super-admin/rts?status=PENDING_APPROVAL", {
        auth: true
      });
      setApprovals(data);
    } catch (err) {
      setError(err.message || "Gagal memuat pengajuan RT.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAction = async (id, action) => {
    setError("");
    try {
      await apiRequest(`/super-admin/rts/${id}/${action}`, {
        method: "POST",
        auth: true
      });
      loadData();
    } catch (err) {
      setError(err.message || "Gagal memproses approval.");
    }
  };

  return (
    <div className="stack gap-lg">
      <div className="card hero">
        <div>
          <h2>Approval RT</h2>
          <p className="muted">
            Tinjau permohonan RT baru dan tentukan persetujuan.
          </p>
        </div>
        <div className="hero-actions">
          <button type="button" className="btn btn-outline-secondary">
            Filter Status
          </button>
          <button type="button" className="btn btn-primary">
            Export
          </button>
        </div>
      </div>

      {loading ? <div className="alert">Memuat data...</div> : null}
      {error ? <div className="alert error">{error}</div> : null}
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>RT</th>
              <th>Alamat</th>
              <th>Admin</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="muted">
                  Memuat data...
                </td>
              </tr>
            ) : null}
            {!loading
              ? approvals.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.address || "-"}</td>
                    <td>{item.admin_email || "-"}</td>
                    <td>{item.status}</td>
                    <td>
                      <div className="actions">
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => handleAction(item.id, "approve")}
                          disabled={loading}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => handleAction(item.id, "reject")}
                          disabled={loading}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              : null}
            {!loading && approvals.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  Tidak ada pengajuan.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SuperAdminApproval;

