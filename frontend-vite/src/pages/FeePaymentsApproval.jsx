import { useEffect, useState } from "react";
import { apiRequest, openFeeProof } from "../utils/api.js";

const FeePaymentsApproval = () => {
  const [payments, setPayments] = useState([]);
  const [status, setStatus] = useState("PENDING");
  const [error, setError] = useState("");

  const loadPayments = async () => {
    setError("");
    try {
      const data = await apiRequest(`/fees/payments?status=${status}`, {
        auth: true
      });
      setPayments(data);
    } catch (err) {
      setError(err.message || "Gagal memuat pembayaran iuran.");
    }
  };

  useEffect(() => {
    loadPayments();
  }, [status]);

  const handleAction = async (id, action) => {
    setError("");
    try {
      await apiRequest(`/fees/payments/${id}/${action}`, {
        method: "POST",
        auth: true
      });
      setPayments((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err.message || "Gagal memproses pembayaran.");
    }
  };

  const handleOpenProof = async (id) => {
    setError("");
    try {
      await openFeeProof(id);
    } catch (err) {
      setError(err.message || "Gagal membuka bukti.");
    }
  };

  return (
    <div className="stack gap-lg">
      <div className="card">
        <h2>Approval Iuran</h2>
        <p className="muted">Verifikasi bukti pembayaran iuran warga.</p>
      </div>

      <div className="card">
        <div className="section-header">
          <div>
            <h3>Daftar Pembayaran</h3>
            <p className="muted">Status pembayaran iuran.</p>
          </div>
          <select
            className="form-select"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>
        {error ? <div className="alert error">{error}</div> : null}
        <table className="table">
          <thead>
            <tr>
              <th>Warga</th>
              <th>Campaign</th>
              <th>Nominal</th>
              <th>Status</th>
              <th>Bukti</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((item) => (
              <tr key={item.id}>
                <td>{item.full_name}</td>
                <td>{item.campaign_name}</td>
                <td>Rp {Number(item.amount).toLocaleString("id-ID")}</td>
                <td>{item.status}</td>
                <td>
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => handleOpenProof(item.id)}
                  >
                    Lihat
                  </button>
                </td>
                <td>
                  {item.status === "PENDING" ? (
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-outline-success btn-sm"
                        onClick={() => handleAction(item.id, "approve")}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
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
            {payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">
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

export default FeePaymentsApproval;
